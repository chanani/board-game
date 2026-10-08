package com.boardgame.room.application;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.boardgame.common.error.ErrorCode;
import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameSessionFactories;
import com.boardgame.game.GameType;
import com.boardgame.game.bot.BotBrains;
import com.boardgame.game.event.GameStartedEvent;
import com.boardgame.member.domain.Avatar;
import com.boardgame.papersafari.PaperSafariSessionFactory;
import com.boardgame.papersafari.bot.PaperSafariBrain;
import com.boardgame.room.api.BotDifficultyRequest;
import com.boardgame.room.api.CreateRoomRequest;
import com.boardgame.room.api.RoomResponse;
import com.boardgame.room.domain.FakeRoomPasswordHasher;
import com.boardgame.room.domain.PlayOrder;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomRegistry;
import com.boardgame.room.domain.RoomStatus;
import com.boardgame.support.FakeTaskScheduler;
import com.boardgame.support.FixedRandom;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

// 가짜 예약기로 카운트다운을 기다리지 않고, 시작 시각에 예약된 작업을 직접 실행한다.
class RoomServiceStartCountdownTest {

    private static final String CODE = "COUNTS";
    private static final long HOST = 1L;
    private static final long GUEST = 2L;
    private static final long THIRD = 3L;
    private static final Duration COUNTDOWN = Duration.ofSeconds(3);
    private static final Instant T0 = Instant.parse("2026-10-08T00:00:00Z");

    private final MutableClock clock = new MutableClock(T0);
    private final RoomRegistry registry = new RoomRegistry();
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final FakeTaskScheduler timerTasks = new FakeTaskScheduler();
    private final FakeTaskScheduler botTasks = new FakeTaskScheduler();
    private final TurnTimer timer = new TurnTimer(timerTasks);
    private final RoomService service = new RoomService(registry, () -> new RoomCode(CODE),
            new GameSessionFactories(List.of(new PaperSafariSessionFactory(clock))), mock(RoomNotifier.class),
            new OutcomePublisher(events), events, clock, new PresenceTracker(), new FakeRoomPasswordHasher(),
            timer, new FixedRandom(0), new RoomAvatars(Avatar::defaultFor),
            new BotDriver(new BotScheduler(botTasks, clock, 1.0), new BotBrains(List.of(new PaperSafariBrain())),
                    new FixedRandom(0)),
            PlayOrder.SEATED, new StartCountdown(timerTasks, COUNTDOWN));

    @Test
    void 시작을_누르면_게임_없이_3초_뒤_시작_시각만_알리고_그때_게임을_만든다() {
        openWithGuest();

        RoomResponse counting = service.start(CODE, HOST);

        assertThat(counting.status()).isEqualTo(RoomStatus.WAITING);
        assertThat(counting.startsAt()).isEqualTo(T0.plus(COUNTDOWN).toEpochMilli());
        assertThat(counting.serverNow()).isEqualTo(T0.toEpochMilli());
        assertThat(timerTasks.latest().startTime()).isEqualTo(T0.plus(COUNTDOWN));
        assertThat(timer.isArmed(new RoomCode(CODE))).isFalse();
        verify(events, never()).publishEvent(any(GameStartedEvent.class));

        clock.advance(COUNTDOWN);
        timerTasks.latest().run();

        RoomResponse started = service.get(CODE, HOST);
        assertThat(started.status()).isEqualTo(RoomStatus.PLAYING);
        assertThat(started.startsAt()).isNull();
        assertThat(timer.isArmed(new RoomCode(CODE))).isTrue();
        verify(events).publishEvent(any(GameStartedEvent.class));
    }

    @Test
    void 카운트다운_중에는_게임_행동을_할_수_없다() {
        openWithGuest();
        service.start(CODE, HOST);

        assertError(() -> service.act(CODE, HOST, new GameAction("FLIP", 0, 0)), ErrorCode.GAME_NOT_STARTED);
    }

    @Test
    void 카운트다운_중에는_컴퓨터가_움직이지_않고_시작한_뒤에_움직인다() {
        service.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("방", GameType.PAPER_SAFARI, 4, null));
        service.addBot(CODE, HOST, new BotDifficultyRequest("EASY"));

        service.start(CODE, HOST);

        assertThat(botTasks.tasks()).isEmpty();
        clock.advance(COUNTDOWN);
        timerTasks.latest().run();
        assertThat(botTasks.tasks()).isNotEmpty();
    }

    @Test
    void 카운트다운_중에는_대기실을_바꿀_수_없다() {
        openWithGuest();
        service.start(CODE, HOST);

        assertError(() -> service.setReady(CODE, GUEST, false), ErrorCode.GAME_STARTING);
        assertError(() -> service.start(CODE, HOST), ErrorCode.GAME_STARTING);
        assertError(() -> service.join(CODE, new LoginMember(THIRD, "캐럴"), null), ErrorCode.GAME_STARTING);
        assertError(() -> service.kick(CODE, HOST, GUEST), ErrorCode.GAME_STARTING);
        assertError(() -> service.addBot(CODE, HOST, new BotDifficultyRequest("EASY")), ErrorCode.GAME_STARTING);
    }

    @Test
    void 카운트다운_중에_참가자가_나가면_시작을_취소하고_예약이_와도_시작하지_않는다() {
        openWithGuest();
        service.join(CODE, new LoginMember(THIRD, "캐럴"), null);
        service.setReady(CODE, THIRD, true);
        service.start(CODE, HOST);

        service.leave(CODE, THIRD);
        RoomResponse cancelled = service.get(CODE, HOST);
        clock.advance(COUNTDOWN);
        timerTasks.latest().run();

        assertThat(cancelled.startsAt()).isNull();
        RoomResponse after = service.get(CODE, HOST);
        assertThat(after.status()).isEqualTo(RoomStatus.WAITING);
        assertThat(after.startsAt()).isNull();
        verify(events, never()).publishEvent(any(GameStartedEvent.class));
    }

    @Test
    void 취소된_뒤_다시_시작하면_새_카운트다운으로만_시작한다() {
        openWithGuest();
        service.join(CODE, new LoginMember(THIRD, "캐럴"), null);
        service.setReady(CODE, THIRD, true);
        service.start(CODE, HOST);
        FakeTaskScheduler.ScheduledTask stale = timerTasks.latest();
        service.leave(CODE, THIRD);
        clock.advance(Duration.ofSeconds(1));
        service.start(CODE, HOST);

        stale.run();
        assertThat(service.get(CODE, HOST).status()).isEqualTo(RoomStatus.WAITING);

        clock.advance(COUNTDOWN);
        timerTasks.latest().run();
        assertThat(service.get(CODE, HOST).status()).isEqualTo(RoomStatus.PLAYING);
    }

    @Test
    void 카운트다운_중에_방이_비면_예약이_와도_아무것도_하지_않는다() {
        openWithGuest();
        service.start(CODE, HOST);

        service.leave(CODE, GUEST);
        service.leave(CODE, HOST);
        timerTasks.latest().run();

        assertThat(registry.exists(new RoomCode(CODE))).isFalse();
        verify(events, never()).publishEvent(any(GameStartedEvent.class));
    }

    private void openWithGuest() {
        service.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("방", GameType.PAPER_SAFARI, 4, null));
        service.join(CODE, new LoginMember(GUEST, "밥"), null);
        service.setReady(CODE, GUEST, true);
    }
}
