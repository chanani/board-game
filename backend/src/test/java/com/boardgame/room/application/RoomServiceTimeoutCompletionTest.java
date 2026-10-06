package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameSession;
import com.boardgame.game.GameSessionFactories;
import com.boardgame.game.GameSessionFactory;
import com.boardgame.game.GameType;
import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.room.api.CreateRoomRequest;
import com.boardgame.room.domain.FakeGameSession;
import com.boardgame.room.domain.FakeRoomPasswordHasher;
import com.boardgame.room.domain.Room;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomRegistry;
import com.boardgame.room.domain.RoomStatus;
import com.boardgame.support.FakeTaskScheduler;
import com.boardgame.support.FixedRandom;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

// 시간 초과 자동 행동으로 게임이 끝나도 사람이 끝낸 것과 똑같이 마무리한다.
class RoomServiceTimeoutCompletionTest {

    private static final String CODE = "ABCDEF";
    private static final RoomCode ROOM_CODE = new RoomCode(CODE);
    private static final Instant T0 = Instant.parse("2026-10-06T00:00:00Z");
    private static final long HOST = 1L;
    private static final long GUEST = 2L;
    private static final long WATCHER = 3L;

    private final MutableClock clock = new MutableClock(T0);
    private final RoomRegistry registry = new RoomRegistry();
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final FakeTaskScheduler scheduler = new FakeTaskScheduler();
    private final TurnTimer timer = new TurnTimer(scheduler);
    private final RoomService service = new RoomService(registry, () -> ROOM_CODE,
            new GameSessionFactories(List.of(new FinishingFactory())), mock(RoomNotifier.class),
            new OutcomePublisher(events), events, clock, new PresenceTracker(), new FakeRoomPasswordHasher(),
            timer, new FixedRandom(0));

    private static final class FinishingFactory implements GameSessionFactory {

        @Override
        public GameType type() {
            return GameType.PAPER_SAFARI;
        }

        @Override
        public GameSession create(List<Long> memberIds) {
            FakeGameSession session = new FakeGameSession(memberIds);
            session.deadlineAt(T0.plusSeconds(15));
            session.finishOnAutoAct();
            return session;
        }
    }

    @BeforeEach
    void startGameWithWatcher() {
        service.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("방", GameType.PAPER_SAFARI, 4, null));
        service.join(CODE, new LoginMember(GUEST, "밥"), null);
        service.setReady(CODE, GUEST, true);
        service.start(CODE, HOST);
        service.watch(CODE, new LoginMember(WATCHER, "캐럴"));
    }

    @Test
    void 자동_행동으로_게임이_끝나면_결과를_알리고_관전자를_자리에_앉힌다() {
        clock.advance(Duration.ofSeconds(15));

        scheduler.latest().run();

        Room room = registry.get(ROOM_CODE);
        verify(events).publishEvent(any(GameCompletedEvent.class));
        assertThat(room.status()).isEqualTo(RoomStatus.WAITING);
        assertThat(room.isSpectator(WATCHER)).isFalse();
        assertThat(room.memberIds()).contains(WATCHER);
        assertThat(timer.isArmed(ROOM_CODE)).isFalse();
    }
}
