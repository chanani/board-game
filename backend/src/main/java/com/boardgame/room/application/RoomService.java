package com.boardgame.room.application;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.GameSessionFactories;
import com.boardgame.game.GameType;
import com.boardgame.game.event.GameStartedEvent;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.game.bot.BotStep;
import com.boardgame.member.domain.Avatar;
import com.boardgame.member.domain.AvatarBook;
import com.boardgame.room.api.BotDifficultyRequest;
import com.boardgame.room.domain.AvatarDraw;
import com.boardgame.room.domain.BotProfile;
import com.boardgame.room.api.CreateRoomRequest;
import com.boardgame.room.domain.RoomClosedEvent;
import com.boardgame.room.domain.RoomTheme;
import com.boardgame.room.domain.RoomTraits;
import com.boardgame.room.api.GameSummaryResponse;
import com.boardgame.room.api.RoomResponse;
import com.boardgame.room.api.RoomSummaryResponse;
import com.boardgame.room.api.UpdateRoomSettingsRequest;
import com.boardgame.room.domain.Capacity;
import com.boardgame.room.domain.GameOccupancies;
import com.boardgame.room.domain.Participant;
import com.boardgame.room.domain.PlayOrder;
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
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
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
    private final RoomAvatars avatars;
    private final BotDriver bots;
    private final PlayOrder playOrder;

    public RoomService(RoomRegistry registry, RoomCodeGenerator codeGenerator, GameSessionFactories sessionFactories,
                       RoomNotifier notifier, OutcomePublisher outcomePublisher,
                       ApplicationEventPublisher eventPublisher, Clock clock, PresenceTracker presence,
                       RoomPasswordHasher hasher, TurnTimer turnTimer, Random random, RoomAvatars avatars) {
        this(registry, codeGenerator, sessionFactories, notifier, outcomePublisher, eventPublisher, clock, presence,
                hasher, turnTimer, random, avatars, BotDriver.idle());
    }

    public RoomService(RoomRegistry registry, RoomCodeGenerator codeGenerator, GameSessionFactories sessionFactories,
                       RoomNotifier notifier, OutcomePublisher outcomePublisher,
                       ApplicationEventPublisher eventPublisher, Clock clock, PresenceTracker presence,
                       RoomPasswordHasher hasher, TurnTimer turnTimer, Random random, RoomAvatars avatars,
                       BotDriver bots) {
        this(registry, codeGenerator, sessionFactories, notifier, outcomePublisher, eventPublisher, clock, presence,
                hasher, turnTimer, random, avatars, bots, PlayOrder.SEATED);
    }

    @Autowired
    public RoomService(RoomRegistry registry, RoomCodeGenerator codeGenerator, GameSessionFactories sessionFactories,
                       RoomNotifier notifier, OutcomePublisher outcomePublisher,
                       ApplicationEventPublisher eventPublisher, Clock clock, PresenceTracker presence,
                       RoomPasswordHasher hasher, TurnTimer turnTimer,
                       @Qualifier(TurnTimerConfig.RANDOM) Random random, RoomAvatars avatars, BotDriver bots,
                       PlayOrder playOrder) {
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
        this.avatars = avatars;
        this.bots = bots;
        this.playOrder = playOrder;
    }

    // 비밀번호 해시(BCrypt)와 프로필 그림(DB)은 느리므로 서비스 전체 잠금 밖에서 먼저 만든다.
    public RoomResponse create(LoginMember member, CreateRoomRequest request) {
        RoomSettings settings = settingsOf(request);
        avatars.load(member.id());
        return open(member, new RoomName(request.name()), settings);
    }

    private synchronized RoomResponse open(LoginMember member, RoomName name, RoomSettings settings) {
        requireNotInAnyRoom(member.id());
        RoomProfile profile = new RoomProfile(newCode(), name, settings);
        Room room = Room.open(profile, participantOf(member));
        saveAndNotifyClosed(room);
        presence.baseline(room.humanIds(), clock.instant());
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
        avatars.load(member.id());
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
        presence.baseline(room.humanIds(), clock.instant());
        return broadcast(room);
    }

    // 프로필 그림(DB)은 잠금 밖에서 읽어 둔다.
    public RoomResponse watch(String rawCode, LoginMember member) {
        avatars.load(member.id());
        return admitSpectator(rawCode, member);
    }

    private synchronized RoomResponse admitSpectator(String rawCode, LoginMember member) {
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
        presence.baseline(room.humanIds(), clock.instant());
        return broadcast(room);
    }

    // 방 잠금 안에서 함수를 실행한다. 방 사람이 아니면 NOT_IN_ROOM. 채팅의 확인·기록·전달을 방 닫힘과 원자적으로 묶는 용도다.
    public synchronized <T> T withOccupant(String rawCode, long memberId, Function<OccupantContext, T> action) {
        Room room = registry.find(RoomCode.parse(rawCode)).filter(found -> found.isOccupant(memberId))
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_IN_ROOM));
        List<Participant> everyone = Stream.concat(room.participants().stream(), room.spectators().stream()).toList();
        String nickname = everyone.stream().filter(person -> person.memberId() == memberId)
                .map(Participant::nickname).findFirst().orElseThrow();
        return action.apply(new OccupantContext(nickname, room.humanOccupantIds(),
                room.isSpectator(memberId)));
    }

    private void saveAndNotifyClosed(Room room) {
        registry.save(room);
        if (!registry.exists(room.code())) {
            bots.forget(room.code());
            eventPublisher.publishEvent(new RoomClosedEvent(room.codeValue()));
        }
    }

    public synchronized boolean isOccupant(String rawCode, long memberId) {
        return registry.find(RoomCode.parse(rawCode))
                .filter(room -> room.isOccupant(memberId))
                .isPresent();
    }

    public synchronized void leave(String rawCode, long memberId) {
        leave(find(rawCode), memberId);
    }

    private void leave(Room room, long memberId) {
        List<Long> before = room.memberIds();
        List<GameOutcome> outcomes = room.leave(memberId);
        baselineNewcomers(room, before);
        saveAndNotifyClosed(room);
        rearm(room);
        broadcastUnlessEmpty(room);
        outcomePublisher.publish(room, outcomes, clock.instant());
    }

    /** 로그아웃한 회원이 들어가 있던 방이 있으면 나가게 한다(게임 중이면 기권). */
    public synchronized void leaveCurrentRoom(long memberId) {
        registry.findByMember(memberId)
                .ifPresent(room -> leave(room.codeValue(), memberId));
    }

    // 게임이 끝나 자동으로 참가한 관전자도 기권 유예 시간을 잴 수 있게 기준 시각을 둔다. R6: 컴퓨터는 빼고 사람만.
    private void baselineNewcomers(Room room, List<Long> before) {
        List<Long> newcomers = room.humanIds().stream()
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
        RoomGame game = room.start(memberId,
                memberIds -> sessionFactories.create(gameType, playOrder.arrange(memberIds)),
                UUID.randomUUID().toString(), clock.instant());
        presence.baseline(room.humanIds(), clock.instant());
        rearm(room);
        RoomResponse response = broadcast(room);
        publishStartUnlessPractice(room, game);
        return response;
    }

    // R37: 연습 경기는 경기 시작을 기록하지 않는다.
    private void publishStartUnlessPractice(Room room, RoomGame game) {
        if (game.isPractice()) {
            return;
        }
        eventPublisher.publishEvent(
                new GameStartedEvent(game.matchKey(), room.gameType(), room.memberIds(), game.startedAt()));
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
        applyAct(find(rawCode), memberId, action);
    }

    // R17: 사람과 컴퓨터가 같은 경로(검증 → 저장 → 타이머 → 방송 → 결과 발행)를 탄다.
    private void applyAct(Room room, long memberId, GameAction action) {
        List<Long> before = room.memberIds();
        List<GameOutcome> outcomes = room.act(memberId, action);
        afterAct(room, before, outcomes);
    }

    private void afterAct(Room room, List<Long> before, List<GameOutcome> outcomes) {
        baselineNewcomers(room, before);
        saveAndNotifyClosed(room);
        rearm(room);
        broadcast(room);
        outcomePublisher.publish(room, outcomes, clock.instant());
    }

    // R20: 예약 스레드에서 들어온다. 같은 잠금 안에서 그 컴퓨터의 결정이 아직 살아 있을 때만 걸음을 한다.
    private synchronized void runBot(BotTicket ticket) {
        registry.find(ticket.code())
                .filter(room -> bots.isCurrent(room, ticket))
                .ifPresent(room -> runBotStep(room, ticket));
    }

    private void runBotStep(Room room, BotTicket ticket) {
        BotStep step = ticket.step();
        if (step.isSignal()) {
            signal(room, ticket.botId(), step.action());
            bots.continueWith(ticket, this::runBot);
            return;
        }
        bots.consume(ticket);
        actAsBot(room, ticket.botId(), step.action());
    }

    // R21: 게임이 그 행동을 거절했을 때만 기존 자동 행동과 같은 결정을 한 번 시도한다.
    // 행동이 적용된 뒤(저장·타이머·방송·결과 발행)의 실패는 대신 행동할 이유가 아니다(두 번 행동하게 된다).
    private void actAsBot(Room room, long botId, GameAction action) {
        List<Long> before = room.memberIds();
        Optional<List<GameOutcome>> outcomes = tryBotAct(room, botId, action);
        if (outcomes.isEmpty()) {
            fallbackAct(room, botId);
            return;
        }
        afterAct(room, before, outcomes.get());
    }

    // R21: 그래도 거절되면 결정 시간이 끝날 때 기존 시간 초과 처리가 진행시킨다.
    private void fallbackAct(Room room, long botId) {
        List<Long> before = room.memberIds();
        bots.fallback(room, botId)
                .flatMap(action -> tryBotAct(room, botId, action))
                .ifPresent(outcomes -> afterAct(room, before, outcomes));
    }

    private Optional<List<GameOutcome>> tryBotAct(Room room, long botId, GameAction action) {
        try {
            return Optional.of(room.act(botId, action));
        } catch (BusinessException exception) {
            log.warn("컴퓨터 행동 거절: room={}, bot={}, action={}", room.codeValue(), botId, action, exception);
            return Optional.empty();
        }
    }

    // D3: 신호는 방 정보·화면을 다시 보내지 않고, 타이머도 다시 걸지 않는다. D15: 방이 이미 없으면 조용히 버린다.
    public synchronized void signal(String rawCode, long memberId, GameAction action) {
        registry.find(RoomCode.parse(rawCode))
                .ifPresent(room -> signal(room, memberId, action));
    }

    private void signal(Room room, long memberId, GameAction action) {
        room.signal(memberId, action)
                .ifPresent(payload -> sendSignal(room, payload));
    }

    private void sendSignal(Room room, Object payload) {
        room.humanOccupantIds()
                .forEach(memberId -> notifier.gameSignal(memberId, payload));
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
        afterAct(room, before, outcomes);
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
        // R6: 컴퓨터는 연결 끊김 기권 대상이 아니다.
        if (room.isBot(targetId)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        if (!presence.isOfflineAtLeast(targetId, clock.instant(), FORFEIT_GRACE)) {
            throw new BusinessException(ErrorCode.FORFEIT_NOT_ALLOWED_YET);
        }
        // R28: 이미 끝낸 사람은 자동 기권(room::isPlaying으로 거름)처럼 손으로도 기권시키지 않는다. 게임이 끝나면 대기실에서 내보낼 수 있다.
        if (room.isOutOfRunningGame(targetId)) {
            return;
        }
        List<Long> before = room.memberIds();
        List<GameOutcome> outcomes = room.leave(targetId);
        baselineNewcomers(room, before);
        saveAndNotifyClosed(room);
        rearm(room);
        broadcastUnlessEmpty(room);
        outcomePublisher.publish(room, outcomes, clock.instant());
    }

    /** 게임 중인 방에서 연결이 끊긴 지 FORFEIT_GRACE 이상인 참가자를 기권시켜 내보낸다. 주기적으로 불린다. */
    public synchronized void forfeitLongDisconnected() {
        Instant now = clock.instant();
        List<Departure> departures = registry.all()
                .stream()
                .filter(Room::isGameInProgress)
                .flatMap(room -> longDisconnected(room, now))
                .toList();
        departures.forEach(this::forfeitQuietly);
    }

    // 한 사람의 처리가 실패해도 나머지 사람의 자동 기권은 계속한다.
    private void forfeitQuietly(Departure departure) {
        try {
            leave(registry.get(departure.code()), departure.memberId());
        } catch (RuntimeException e) {
            log.warn("자동 기권 처리 실패: room={}, member={}", departure.code(), departure.memberId(), e);
        }
    }

    private Stream<Departure> longDisconnected(Room room, Instant now) {
        return room.humanIds()
                .stream()
                .filter(room::isPlaying)
                .filter(memberId -> presence.isOfflineAtLeast(memberId, now, FORFEIT_GRACE))
                .map(memberId -> new Departure(room.code(), memberId));
    }

    private record Departure(RoomCode code, long memberId) {
    }

    public synchronized void kick(String rawCode, long requesterId, long targetId) {
        Room room = find(rawCode);
        room.kick(requesterId, targetId);
        saveAndNotifyClosed(room);
        broadcast(room);
    }

    // R8·R9·R4: 방장이 대기 중에 컴퓨터를 앉힌다. 그림은 방 안 다른 사람과 겹치지 않게 고른다.
    public synchronized RoomResponse addBot(String rawCode, long requesterId, BotDifficultyRequest request) {
        BotDifficulty difficulty = BotDifficulty.parse(requireDifficulty(request));
        Room room = find(rawCode);
        room.addBot(requesterId, difficulty, botAvatarFor(room));
        saveAndNotifyClosed(room);
        return broadcast(room);
    }

    // R10: 방장이 대기 중에 앉아 있는 컴퓨터의 난이도를 바꾼다.
    public synchronized RoomResponse changeBot(String rawCode, long requesterId, long botId,
                                               BotDifficultyRequest request) {
        BotDifficulty difficulty = BotDifficulty.parse(requireDifficulty(request));
        Room room = find(rawCode);
        room.changeBot(requesterId, botId, difficulty);
        saveAndNotifyClosed(room);
        return broadcast(room);
    }

    private String requireDifficulty(BotDifficultyRequest request) {
        if (request == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        return request.difficulty();
    }

    // R4: 사람의 그림(메모리)과 앉은 컴퓨터의 그림을 피해 고른다.
    private Avatar botAvatarFor(Room room) {
        List<Long> humans = room.humanOccupantIds();
        AvatarBook book = avatars.bookOf(humans);
        Stream<Avatar> humanAvatars = humans.stream()
                .map(book::keyOf)
                .map(Avatar::parse);
        Set<Avatar> taken = Stream.concat(humanAvatars, avatarsOf(room.bots())).collect(Collectors.toSet());
        return AvatarDraw.pick(taken, random);
    }

    private static Stream<Avatar> avatarsOf(List<Participant> bots) {
        return bots.stream()
                .map(Participant::bot)
                .map(BotProfile::avatar);
    }

    public synchronized RoomResponse reconfigure(String rawCode, long memberId, UpdateRoomSettingsRequest request) {
        Room room = find(rawCode);
        Capacity capacity = Capacity.of(room.gameType(), requireMaxPlayers(request));
        List<Long> before = room.memberIds();
        room.reconfigure(memberId, capacity, RoomTheme.parse(requireTheme(request)));
        baselineNewcomers(room, before);
        saveAndNotifyClosed(room);
        return broadcast(room);
    }

    private int requireMaxPlayers(UpdateRoomSettingsRequest request) {
        if (request == null || request.maxPlayers() == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        return request.maxPlayers();
    }

    private String requireTheme(UpdateRoomSettingsRequest request) {
        if (request == null || request.theme() == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        return request.theme();
    }

    /** 그림 변경이 커밋된 뒤(잠금 밖) 메모리 그림을 고치고, 그 사람이 있는 방에 다시 알린다. */
    public void avatarChanged(long memberId, Avatar avatar) {
        avatars.remember(memberId, avatar);
        rebroadcastRoomOf(memberId);
    }

    private synchronized void rebroadcastRoomOf(long memberId) {
        registry.findByMember(memberId).ifPresent(this::broadcastRoomOnly);
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
        return RoomResponse.from(room, presence, clock.instant(), avatars.bookOf(room.occupantIds()));
    }

    private RoomResponse broadcast(Room room) {
        RoomResponse response = response(room);
        notifier.roomUpdated(response);
        room.humanOccupantIds().forEach(memberId -> sendView(room, memberId));
        bots.afterChange(room, this::runBot);
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
