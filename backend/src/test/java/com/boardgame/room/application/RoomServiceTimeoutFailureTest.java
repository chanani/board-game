package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.boardgame.member.domain.Avatar;
import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameSession;
import com.boardgame.game.GameSessionFactories;
import com.boardgame.game.GameSessionFactory;
import com.boardgame.game.GameType;
import com.boardgame.room.api.CreateRoomRequest;
import com.boardgame.room.domain.FakeGameSession;
import com.boardgame.room.domain.FakeRoomPasswordHasher;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomRegistry;
import com.boardgame.support.FakeTaskScheduler;
import com.boardgame.support.FixedRandom;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

// 자동 행동이 실패해도 방의 타이머가 멈추지 않는다.
class RoomServiceTimeoutFailureTest {

    private static final String CODE = "ABCDEF";
    private static final RoomCode ROOM_CODE = new RoomCode(CODE);
    private static final Instant T0 = Instant.parse("2026-10-06T00:00:00Z");

    private final MutableClock clock = new MutableClock(T0);
    private final AtomicReference<FakeGameSession> created = new AtomicReference<>();
    private final RoomNotifier notifier = mock(RoomNotifier.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final FakeTaskScheduler scheduler = new FakeTaskScheduler();
    private final TurnTimer timer = new TurnTimer(scheduler);
    private final RoomService service = new RoomService(new RoomRegistry(), () -> ROOM_CODE,
            new GameSessionFactories(List.of(new FailingFactory())), notifier, new OutcomePublisher(events),
            events, clock, new PresenceTracker(), new FakeRoomPasswordHasher(), timer, new FixedRandom(0), new RoomAvatars(Avatar::defaultFor));

    private final class FailingFactory implements GameSessionFactory {

        @Override
        public GameType type() {
            return GameType.PAPER_SAFARI;
        }

        @Override
        public GameSession create(List<Long> memberIds) {
            FakeGameSession session = new FakeGameSession(memberIds);
            session.deadlineAt(T0.plusSeconds(15));
            session.failAutoAct();
            created.set(session);
            return session;
        }
    }

    @BeforeEach
    void startGame() {
        service.create(new LoginMember(1L, "앨리스"), new CreateRoomRequest("방", GameType.PAPER_SAFARI, 4, null));
        service.join(CODE, new LoginMember(2L, "밥"), null);
        service.setReady(CODE, 2L, true);
        service.start(CODE, 1L);
    }

    @Test
    void 자동_행동이_실패하면_기록하고_현재_상태를_알린_뒤_다시_예약한다() {
        clock.advance(Duration.ofSeconds(15));
        clearInvocations(notifier);

        scheduler.latest().run();

        assertThat(created.get().autoActs()).isEqualTo(1);
        verify(notifier).gameUpdated(eq(1L), any());
        assertThat(scheduler.tasks()).hasSize(2);
        assertThat(scheduler.latest().startTime()).isEqualTo(T0.plusSeconds(30));
        assertThat(timer.isArmed(ROOM_CODE)).isTrue();

        scheduler.latest().run();

        assertThat(created.get().autoActs()).isEqualTo(2);
    }

    @Test
    void 자동_행동이_실패해도_방은_계속_쓸_수_있다() {
        scheduler.latest().run();

        service.act(CODE, 1L, new GameAction("FLIP", 0, 0));

        assertThat(created.get().actions()).hasSize(1);
        assertThat(timer.isArmed(ROOM_CODE)).isTrue();
    }

    @Test
    void 기다리는_행동이_없는데_실패하면_예약을_취소한다() {
        created.get().deadlineAt(null);

        scheduler.latest().run();

        assertThat(timer.isArmed(ROOM_CODE)).isFalse();
    }
}
