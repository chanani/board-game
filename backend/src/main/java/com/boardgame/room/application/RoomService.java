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
import com.boardgame.room.domain.RoomClosedEvent;
import com.boardgame.room.domain.RoomTheme;
import com.boardgame.room.domain.RoomTraits;
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
import java.util.Random;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Stream;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

@Service
public class RoomService {

    private static final Logger log = LoggerFactory.getLogger(RoomService.class);
    private static final Duration FORFEIT_GRACE = Duration.ofSeconds(60);
    private static final Duration TIMEOUT_RETRY = Duration.ofSeconds(15);

    private final RoomRegistry registry;
    private final RoomCodeGenerator codeGenerator;
    private final GameSessionFactories sessionFactories;
    private final RoomNotifier notifier;
    private final OutcomePublisher outcomePublisher;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;
    private final PresenceTracker presence;
    private final RoomPasswordHasher hasher;
    private final TurnTimer turnTimer;
    private final Random random;

    public RoomService(RoomRegistry registry, RoomCodeGenerator codeGenerator, GameSessionFactories sessionFactories,
                       RoomNotifier notifier, OutcomePublisher outcomePublisher,
                       ApplicationEventPublisher eventPublisher, Clock clock, PresenceTracker presence,
                       RoomPasswordHasher hasher, TurnTimer turnTimer,
                       @Qualifier(TurnTimerConfig.RANDOM) Random random) {
        this.registry = registry;
        this.codeGenerator = codeGenerator;
        this.sessionFactories = sessionFactories;
        this.notifier = notifier;
        this.outcomePublisher = outcomePublisher;
        this.eventPublisher = eventPublisher;
        this.clock = clock;
        this.presence = presence;
        this.hasher = hasher;
        this.turnTimer = turnTimer;
        this.random = random;
    }

    // 비밀번호 해시(BCrypt)는 느리므로 서비스 전체 잠금 밖에서 먼저 만든다.
    public RoomResponse create(LoginMember member, CreateRoomRequest request) {
        RoomSettings settings = settingsOf(request);
        return open(member, new RoomName(request.name()), settings);
    }

    private synchronized RoomResponse open(LoginMember member, RoomName name, RoomSettings settings) {
        requireNotInAnyRoom(member.id());
        RoomProfile profile = new RoomProfile(newCode(), name, settings);
        Room room = Room.open(profile, participantOf(member));
        saveAndNotifyClosed(room);
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

    // 잠금을 잠깐 잡아 통과할 잠금만 받아 오고, 느린 비밀번호 확인은 잠금 밖에서 한 뒤 다시 잠가 들인다.
    public RoomResponse join(String rawCode, LoginMember member, String password) {
        RoomLock lock = lockToPass(rawCode, member.id());
        lock.require(password, hasher);
        return admit(rawCode, member, lock);
    }

    private synchronized RoomLock lockToPass(String rawCode, long memberId) {
        Room room = find(rawCode);
        requireNotInOtherRoom(memberId, room);
        return room.lockToPass(memberId);
    }

    private synchronized RoomResponse admit(String rawCode, LoginMember member, RoomLock passed) {
        Room room = find(rawCode);
        requireNotInOtherRoom(member.id(), room);
        room.admit(participantOf(member), passed);
        saveAndNotifyClosed(room);
        presence.baseline(room.memberIds(), clock.instant());
        return broadcast(room);
    }

    public synchronized RoomResponse watch(String rawCode, LoginMember member) {
        Room room = find(rawCode);
        requireNotInOtherRoom(member.id(), room);
        room.watch(participantOf(member));
        saveAndNotifyClosed(room);
        return broadcast(room);
    }

    public synchronized RoomResponse seat(String rawCode, long memberId) {
        Room room = find(rawCode);
        room.seat(memberId);
        saveAndNotifyClosed(room);
        presence.baseline(room.memberIds(), clock.instant());
        return broadcast(room);
    }

    // 방 잠금 안에서 함수를 실행한다. 방 사람이 아니면 NOT_IN_ROOM. 채팅의 확인·기록·전달을 방 닫힘과 원자적으로 묶는 용도다.
    public synchronized <T> T withOccupant(String rawCode, long memberId, Function<OccupantContext, T> action) {
        Room room = registry.find(RoomCode.parse(rawCode)).filter(found -> found.isOccupant(memberId))
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_IN_ROOM));
        List<Participant> everyone = Stream.concat(room.participants().stream(), room.spectators().stream()).toList();
        String nickname = everyone.stream().filter(person -> person.memberId() == memberId)
                .map(Participant::nickname).findFirst().orElseThrow();
        return action.apply(new OccupantContext(nickname, everyone.stream().map(Participant::memberId).toList(),
                room.isSpectator(memberId)));
    }

    private void saveAndNotifyClosed(Room room) {
        registry.save(room);
        if (!registry.exists(room.code())) {
            eventPublisher.publishEvent(new RoomClosedEvent(room.codeValue()));
        }
    }

    public synchronized boolean isOccupant(String rawCode, long memberId) {
        return registry.find(RoomCode.parse(rawCode))
                .filter(room -> room.isOccupant(memberId))
                .isPresent();
    }

    public synchronized void leave(String rawCode, long memberId) {
        Room room = find(rawCode);
        List<Long> before = room.memberIds();
        List<GameOutcome> outcomes = room.leave(memberId);
        baselineNewcomers(room, before);
        saveAndNotifyClosed(room);
        rearm(room);
        broadcastUnlessEmpty(room);
        outcomePublisher.publish(room, outcomes, clock.instant());
    }

    // 게임이 끝나 자동으로 참가한 관전자도 기권 유예 시간을 잴 수 있게 기준 시각을 둔다.
    private void baselineNewcomers(Room room, List<Long> before) {
        List<Long> newcomers = room.memberIds().stream()
                .filter(id -> !before.contains(id))
                .toList();
        presence.baseline(newcomers, clock.instant());
    }

    private void broadcastUnlessEmpty(Room room) {
        if (room.isEmpty()) {
            return;
        }
        broadcast(room);
    }

    public synchronized RoomResponse setReady(String rawCode, long memberId, Boolean ready) {
        if (ready == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        Room room = find(rawCode);
        room.setReady(memberId, ready);
        saveAndNotifyClosed(room);
        return broadcast(room);
    }

    public synchronized RoomResponse start(String rawCode, long memberId) {
        Room room = find(rawCode);
        GameType gameType = room.gameType();
        RoomGame game = room.start(memberId, memberIds -> sessionFactories.create(gameType, memberIds),
                UUID.randomUUID().toString(), clock.instant());
        presence.baseline(room.memberIds(), clock.instant());
        rearm(room);
        RoomResponse response = broadcast(room);
        eventPublisher.publishEvent(
                new GameStartedEvent(game.matchKey(), gameType, room.memberIds(), game.startedAt()));
        return response;
    }

    public synchronized RoomResponse get(String rawCode, long memberId) {
        Room room = find(rawCode);
        room.requireOccupant(memberId);
        return response(room);
    }

    public synchronized Optional<RoomResponse> myRoom(long memberId) {
        return registry.findByMember(memberId).map(this::response);
    }

    public synchronized void act(String rawCode, long memberId, GameAction action) {
        Room room = find(rawCode);
        List<Long> before = room.memberIds();
        List<GameOutcome> outcomes = room.act(memberId, action);
        baselineNewcomers(room, before);
        saveAndNotifyClosed(room);
        rearm(room);
        broadcast(room);
        outcomePublisher.publish(room, outcomes, clock.instant());
    }

    // 예약 스레드에서 들어온다. 같은 잠금 안에서 판번호가 최신일 때만 대신 행동하므로, 사람의 행동과 겹쳐 적용되지 않는다.
    private synchronized void timeout(RoomCode code, TimerVersion version) {
        Optional<Room> found = registry.find(code).filter(room -> turnTimer.isCurrent(code, version));
        if (found.isEmpty()) {
            return;
        }
        try {
            applyTimeout(found.get());
        } catch (RuntimeException exception) {
            log.warn("시간 초과 자동 행동 실패, 다시 예약한다: room={}", code.value(), exception);
            retryTimeout(found.get());
        }
    }

    private void applyTimeout(Room room) {
        List<Long> before = room.memberIds();
        List<GameOutcome> outcomes = room.autoAct(random);
        baselineNewcomers(room, before);
        saveAndNotifyClosed(room);
        rearm(room);
        broadcast(room);
        outcomePublisher.publish(room, outcomes, clock.instant());
    }

    // 실패하면 마감이 이미 지났으므로 rearm은 곧바로 다시 실행돼 실패를 되풀이한다. 한 번의 제한 시간 뒤에 다시 시도한다.
    private void retryTimeout(Room room) {
        RoomCode code = room.code();
        Optional<Instant> deadline = waitingDeadline(room);
        if (deadline.isEmpty()) {
            turnTimer.cancel(code);
            broadcastUnlessEmpty(room);
            return;
        }
        turnTimer.arm(code, clock.instant().plus(TIMEOUT_RETRY), version -> timeout(code, version));
        broadcast(room);
    }

    // 상태가 바뀔 때마다 새 판번호로 다시 건다. 기다리는 행동이 없거나(게임 끝) 방이 사라졌으면 취소한다.
    private void rearm(Room room) {
        RoomCode code = room.code();
        Optional<Instant> deadline = waitingDeadline(room);
        if (deadline.isEmpty()) {
            turnTimer.cancel(code);
            return;
        }
        turnTimer.arm(code, deadline.get(), version -> timeout(code, version));
    }

    private Optional<Instant> waitingDeadline(Room room) {
        RoomCode code = room.code();
        return room.deadline().filter(ignored -> registry.exists(code));
    }

    public synchronized void sync(String rawCode, long memberId) {
        Room room = find(rawCode);
        room.requireOccupant(memberId);
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
        List<Long> before = room.memberIds();
        List<GameOutcome> outcomes = room.leave(targetId);
        baselineNewcomers(room, before);
        saveAndNotifyClosed(room);
        rearm(room);
        broadcastUnlessEmpty(room);
        outcomePublisher.publish(room, outcomes, clock.instant());
    }

    public synchronized void kick(String rawCode, long requesterId, long targetId) {
        Room room = find(rawCode);
        room.kick(requesterId, targetId);
        saveAndNotifyClosed(room);
        broadcast(room);
    }

    public synchronized void presenceChanged(long memberId) {
        registry.findByMember(memberId)
                .filter(room -> room.contains(memberId))
                .ifPresent(this::broadcastRoomOnly);
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
        room.occupantIds().forEach(memberId -> sendView(room, memberId));
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
        return new RoomSettings(type, capacityOf(type, request.maxPlayers()), new RoomTraits(lockOf(request.password()), RoomTheme.parse(request.theme())));
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
