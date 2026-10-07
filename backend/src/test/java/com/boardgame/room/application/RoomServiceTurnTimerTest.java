package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.boardgame.member.domain.Avatar;
import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameSessionFactories;
import com.boardgame.game.GameType;
import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.papersafari.PaperSafariSessionFactory;
import com.boardgame.papersafari.TurnPhase;
import com.boardgame.papersafari.view.PaperSafariSessionView;
import com.boardgame.papersafari.view.PaperSafariView;
import com.boardgame.room.api.CreateRoomRequest;
import com.boardgame.room.domain.FakeRoomPasswordHasher;
import com.boardgame.room.domain.Room;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomRegistry;
import com.boardgame.support.FakeTaskScheduler;
import com.boardgame.support.FakeTaskScheduler.ScheduledTask;
import com.boardgame.support.FixedRandom;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

// 가짜 예약기로 15초 타이머를 기다리지 않고 직접 실행한다.
class RoomServiceTurnTimerTest {

    private static final String CODE = "ABCDEF";
    private static final RoomCode ROOM_CODE = new RoomCode(CODE);
    private static final long HOST = 1L;
    private static final long GUEST = 2L;
    private static final Instant T0 = Instant.parse("2026-10-06T00:00:00Z");

    private final MutableClock clock = new MutableClock(T0);
    private final RoomRegistry registry = new RoomRegistry();
    private final RoomNotifier notifier = mock(RoomNotifier.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final FakeTaskScheduler scheduler = new FakeTaskScheduler();
    private final TurnTimer timer = new TurnTimer(scheduler);
    private final RoomService service = new RoomService(registry, () -> ROOM_CODE,
            new GameSessionFactories(List.of(new PaperSafariSessionFactory(clock))), notifier,
            new OutcomePublisher(events), events, clock, new PresenceTracker(), new FakeRoomPasswordHasher(),
            timer, new FixedRandom(0), new RoomAvatars(Avatar::defaultFor));

    @BeforeEach
    void startGame() {
        service.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("방", GameType.PAPER_SAFARI, 4, null));
        service.join(CODE, new LoginMember(GUEST, "밥"), null);
        service.setReady(CODE, GUEST, true);
        service.start(CODE, HOST);
    }

    private PaperSafariView viewOf(long memberId) {
        Room room = registry.get(ROOM_CODE);
        PaperSafariSessionView view = (PaperSafariSessionView) room.viewFor(memberId).orElseThrow();
        return view.game();
    }

    @Test
    void 시작하면_15초_뒤로_예약한다() {
        assertThat(scheduler.tasks()).hasSize(1);
        assertThat(scheduler.latest().startTime()).isEqualTo(T0.plusSeconds(15));
        assertThat(timer.isArmed(ROOM_CODE)).isTrue();
    }

    @Test
    void 시간이_지나면_대신_행동하고_모두에게_알린다() {
        clearInvocations(notifier);
        clock.advance(Duration.ofSeconds(15));

        scheduler.latest().run();

        PaperSafariView view = viewOf(HOST);
        assertThat(view.round().phase()).isEqualTo(TurnPhase.DRAW);
        assertThat(view.lastAutoActorIds()).containsExactly(HOST, GUEST);
        verify(notifier).gameUpdated(eq(HOST), org.mockito.ArgumentMatchers.any());
        verify(notifier).gameUpdated(eq(GUEST), org.mockito.ArgumentMatchers.any());
        assertThat(scheduler.tasks()).hasSize(2);
        assertThat(scheduler.latest().startTime()).isEqualTo(T0.plusSeconds(30));
    }

    @Test
    void 마감_전에_사람이_행동하면_이전_예약은_무효다() {
        ScheduledTask first = scheduler.latest();
        clock.advance(Duration.ofSeconds(5));

        service.act(CODE, HOST, new GameAction("FLIP", 0, 0));

        assertThat(first.isCancelled()).isTrue();
        assertThat(scheduler.latest().startTime()).isEqualTo(T0.plusSeconds(20));
        clearInvocations(notifier);

        first.run();

        assertThat(viewOf(HOST).round().phase()).isEqualTo(TurnPhase.SETUP_FLIP);
        verify(notifier, never()).gameUpdated(anyLong(), org.mockito.ArgumentMatchers.any());

        scheduler.latest().run();

        assertThat(viewOf(HOST).round().phase()).isEqualTo(TurnPhase.DRAW);
        assertThat(viewOf(HOST).lastAutoActorIds()).containsExactly(GUEST);
    }

    @Test
    void 덱에서_가져오면_예약_시각이_지금부터_15초로_바뀐다() {
        clock.advance(Duration.ofSeconds(15));
        scheduler.latest().run();
        long current = viewOf(HOST).round().currentPlayerId();
        clock.advance(Duration.ofSeconds(10));

        service.act(CODE, current, new GameAction("DRAW_DECK", null, null));

        assertThat(scheduler.latest().startTime()).isEqualTo(clock.instant().plusSeconds(15));
    }

    @Test
    void 가져왔다_되돌리기를_되풀이해도_원래_마감에_대신_행동한다() {
        clock.advance(Duration.ofSeconds(15));
        scheduler.latest().run();
        long current = viewOf(HOST).round().currentPlayerId();
        // 첫 가져오기는 마감을 다시 15초로 채우고, 되돌린 뒤의 되풀이는 그 마감을 그대로 둔다.
        clock.advance(Duration.ofSeconds(2));
        service.act(CODE, current, new GameAction("DRAW_DISCARD", null, null));
        Instant turnDeadline = clock.instant().plus(Duration.ofSeconds(15));
        assertThat(scheduler.latest().startTime()).isEqualTo(turnDeadline);
        service.act(CODE, current, new GameAction("CANCEL_DRAW", null, null));

        for (int cycle = 0; cycle < 3; cycle++) {
            clock.advance(Duration.ofSeconds(2));
            service.act(CODE, current, new GameAction("DRAW_DISCARD", null, null));
            clock.advance(Duration.ofSeconds(2));
            service.act(CODE, current, new GameAction("CANCEL_DRAW", null, null));
        }

        assertThat(scheduler.latest().startTime()).isEqualTo(turnDeadline);
        clock.advance(Duration.between(clock.instant(), turnDeadline));

        scheduler.latest().run();

        assertThat(viewOf(HOST).lastAutoActorIds()).containsExactly(current);
        assertThat(viewOf(HOST).round().currentPlayerId()).isNotEqualTo(current);
    }

    @Test
    void 게임이_끝나면_예약을_취소한다() {
        ScheduledTask armed = scheduler.latest();

        service.leave(CODE, GUEST);

        assertThat(armed.isCancelled()).isTrue();
        assertThat(timer.isArmed(ROOM_CODE)).isFalse();
        verify(events, atLeastOnce()).publishEvent(org.mockito.ArgumentMatchers.any(GameCompletedEvent.class));
        assertThat(viewOf(HOST).deadline()).isNull();

        armed.run();

        assertThat(scheduler.tasks()).hasSize(1);
    }

    @Test
    void 방이_사라지면_예약이_없다() {
        service.leave(CODE, GUEST);
        service.leave(CODE, HOST);

        assertThat(registry.exists(ROOM_CODE)).isFalse();
        assertThat(timer.isArmed(ROOM_CODE)).isFalse();
        scheduler.tasks().forEach(task -> assertThat(task.isCancelled()).isTrue());
    }

    @Test
    void 화면에는_마감과_서버_시각이_들어간다() {
        clock.advance(Duration.ofSeconds(2));

        PaperSafariView view = viewOf(GUEST);

        assertThat(view.deadline()).isEqualTo(T0.plusSeconds(15).toEpochMilli());
        assertThat(view.serverNow()).isEqualTo(T0.plusSeconds(2).toEpochMilli());
    }
}
