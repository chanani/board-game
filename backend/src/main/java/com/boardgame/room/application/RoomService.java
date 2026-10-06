package com.boardgame.room.application;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.GameSessionFactories;
import com.boardgame.game.GameType;
import com.boardgame.game.event.GameStartedEvent;
import com.boardgame.room.api.CreateRoomRequest;
import com.boardgame.room.api.GameSummaryResponse;
import com.boardgame.room.api.RoomResponse;
import com.boardgame.room.api.RoomSummaryResponse;
import com.boardgame.room.domain.Capacity;
import com.boardgame.room.domain.GameOccupancies;
import com.boardgame.room.domain.Participant;
import com.boardgame.room.domain.Room;
import com.boardgame.room.domain.RoomStatus;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomCodeGenerator;
import com.boardgame.room.domain.RoomGame;
import com.boardgame.room.domain.RawRoomPassword;
import com.boardgame.room.domain.RoomLock;
import com.boardgame.room.domain.RoomName;
import com.boardgame.room.domain.RoomPasswordHasher;
import com.boardgame.room.domain.RoomProfile;
import com.boardgame.room.domain.RoomRegistry;
import com.boardgame.room.domain.RoomSettings;
import java.time.Clock;
import java.time.Duration;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

@Service
public class RoomService {

    private static final Duration FORFEIT_GRACE = Duration.ofSeconds(60);

    private final RoomRegistry registry;
    private final RoomCodeGenerator codeGenerator;
    private final GameSessionFactories sessionFactories;
    private final RoomNotifier notifier;
    private final OutcomePublisher outcomePublisher;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;
    private final PresenceTracker presence;
    private final RoomPasswordHasher hasher;

    public RoomService(RoomRegistry registry, RoomCodeGenerator codeGenerator, GameSessionFactories sessionFactories,
                       RoomNotifier notifier, OutcomePublisher outcomePublisher,
                       ApplicationEventPublisher eventPublisher, Clock clock, PresenceTracker presence,
                       RoomPasswordHasher hasher) {
        this.registry = registry;
        this.codeGenerator = codeGenerator;
        this.sessionFactories = sessionFactories;
        this.notifier = notifier;
        this.outcomePublisher = outcomePublisher;
        this.eventPublisher = eventPublisher;
        this.clock = clock;
        this.presence = presence;
        this.hasher = hasher;
    }

    public synchronized RoomResponse create(LoginMember member, CreateRoomRequest request) {
        requireNotInAnyRoom(member.id());
        RoomProfile profile = new RoomProfile(newCode(), new RoomName(request.name()), settingsOf(request));
        Room room = Room.open(profile, participantOf(member));
        registry.save(room);
        presence.baseline(room.memberIds(), clock.instant());
        return broadcast(room);
    }

    public synchronized List<RoomSummaryResponse> rooms(GameType gameType) {
        return registry.all().stream()
                .filter(room -> room.isFor(gameType))
                .sorted(Comparator.comparing((Room room) -> room.status() == RoomStatus.PLAYING)
                        .thenComparing(Room::codeValue))
                .map(RoomSummaryResponse::from)
                .toList();
    }

    public synchronized List<GameSummaryResponse> gameOccupancies() {
        GameOccupancies occupancies = GameOccupancies.of(registry.all());
        return occupancies.asList().stream()
                .map(GameSummaryResponse::from)
                .toList();
    }

    public synchronized RoomResponse join(String rawCode, LoginMember member, String password) {
        Room room = find(rawCode);
        requireNotInOtherRoom(member.id(), room);
        room.join(participantOf(member), password, hasher);
        registry.save(room);
        presence.baseline(room.memberIds(), clock.instant());
        return broadcast(room);
    }

    public synchronized void leave(String rawCode, long memberId) {
        Room room = find(rawCode);
        List<GameOutcome> outcomes = room.leave(memberId);
        registry.save(room);
        broadcastUnlessEmpty(room);
        outcomePublisher.publish(room, outcomes, clock.instant());
    }

    private void broadcastUnlessEmpty(Room room) {
        if (room.isEmpty()) {
            return;
        }
        broadcast(room);
    }

    public synchronized RoomResponse start(String rawCode, long memberId) {
        Room room = find(rawCode);
        GameType gameType = room.gameType();
        RoomGame game = room.start(memberId, memberIds -> sessionFactories.create(gameType, memberIds),
                UUID.randomUUID().toString(), clock.instant());
        presence.baseline(room.memberIds(), clock.instant());
        RoomResponse response = broadcast(room);
        eventPublisher.publishEvent(
                new GameStartedEvent(game.matchKey(), gameType, room.memberIds(), game.startedAt()));
        return response;
    }

    public synchronized RoomResponse get(String rawCode) {
        return response(find(rawCode));
    }

    public synchronized Optional<RoomResponse> myRoom(long memberId) {
        return registry.findByMember(memberId).map(this::response);
    }

    public synchronized void act(String rawCode, long memberId, GameAction action) {
        Room room = find(rawCode);
        List<GameOutcome> outcomes = room.act(memberId, action);
        broadcast(room);
        outcomePublisher.publish(room, outcomes, clock.instant());
    }

    public synchronized void sync(String rawCode, long memberId) {
        Room room = find(rawCode);
        room.requireMember(memberId);
        sendView(room, memberId);
    }

    public synchronized void forfeitDisconnected(String rawCode, long requesterId, long targetId) {
        Room room = find(rawCode);
        room.requireMember(requesterId);
        if (!room.contains(targetId)) {
            throw new BusinessException(ErrorCode.NOT_A_PLAYER);
        }
        if (requesterId == targetId) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        if (!presence.isOfflineAtLeast(targetId, clock.instant(), FORFEIT_GRACE)) {
            throw new BusinessException(ErrorCode.FORFEIT_NOT_ALLOWED_YET);
        }
        List<GameOutcome> outcomes = room.leave(targetId);
        registry.save(room);
        broadcastUnlessEmpty(room);
        outcomePublisher.publish(room, outcomes, clock.instant());
    }

    public synchronized void presenceChanged(long memberId) {
        registry.findByMember(memberId).ifPresent(this::broadcastRoomOnly);
    }

    private void broadcastRoomOnly(Room room) {
        notifier.roomUpdated(response(room));
    }

    private RoomResponse response(Room room) {
        return RoomResponse.from(room, presence, clock.instant());
    }

    private RoomResponse broadcast(Room room) {
        RoomResponse response = response(room);
        notifier.roomUpdated(response);
        room.memberIds().forEach(memberId -> sendView(room, memberId));
        return response;
    }

    private void sendView(Room room, long memberId) {
        room.viewFor(memberId).ifPresent(view -> notifier.gameUpdated(memberId, view));
    }

    private Room find(String rawCode) {
        return registry.get(RoomCode.parse(rawCode));
    }

    private RoomCode newCode() {
        return Stream.generate(codeGenerator::next)
                .filter(code -> !registry.exists(code))
                .findFirst()
                .orElseThrow();
    }

    private RoomSettings settingsOf(CreateRoomRequest request) {
        GameType type = requireGameType(request);
        return new RoomSettings(type, capacityOf(type, request.maxPlayers()), lockOf(request.password()));
    }

    private Capacity capacityOf(GameType type, Integer maxPlayers) {
        if (maxPlayers == null) {
            return Capacity.max(type);
        }
        return Capacity.of(type, maxPlayers);
    }

    private RoomLock lockOf(String password) {
        if (password == null || password.isBlank()) {
            return RoomLock.open();
        }
        return RoomLock.locked(hasher.hash(new RawRoomPassword(password)));
    }

    private GameType requireGameType(CreateRoomRequest request) {
        if (request.gameType() == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        return request.gameType();
    }

    private void requireNotInAnyRoom(long memberId) {
        if (registry.findByMember(memberId).isPresent()) {
            throw new BusinessException(ErrorCode.ALREADY_IN_ROOM);
        }
    }

    private void requireNotInOtherRoom(long memberId, Room room) {
        boolean inOtherRoom = registry.findByMember(memberId)
                .filter(current -> !current.code().equals(room.code()))
                .isPresent();
        if (inOtherRoom) {
            throw new BusinessException(ErrorCode.ALREADY_IN_ROOM);
        }
    }

    private Participant participantOf(LoginMember member) {
        return new Participant(member.id(), member.nickname());
    }
}
