package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameSession;
import com.boardgame.game.GameSessionFactories;
import com.boardgame.game.GameSessionFactory;
import com.boardgame.game.GameType;
import com.boardgame.member.domain.Avatar;
import com.boardgame.room.api.CreateRoomRequest;
import com.boardgame.room.domain.FakeGameSession;
import com.boardgame.room.domain.FakeRoomPasswordHasher;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomRegistry;
import com.boardgame.support.FakeTaskScheduler;
import com.boardgame.support.FixedRandom;
import com.boardgame.support.MutableClock;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

// D3: 신호는 방의 모두에게 작은 메시지만 보낸다. 방 정보·화면 방송·타이머·기록은 건드리지 않는다.
class RoomServiceSignalTest {

    private static final String CODE = "SIGNAL";
    private static final RoomCode ROOM_CODE = new RoomCode(CODE);
    private static final long HOST = 1L;
    private static final long GUEST = 2L;
    private static final GameAction PEEK = new GameAction("PEEK", null, null, null, null, null, 3);

    private final MutableClock clock = new MutableClock(Instant.parse("2026-10-07T00:00:00Z"));
    private final RoomNotifier notifier = mock(RoomNotifier.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final FakeTaskScheduler scheduler = new FakeTaskScheduler();
    private final FakeGameSession session = new FakeGameSession(List.of(HOST, GUEST));
    private final GameSessionFactory fakeFactory = new GameSessionFactory() {
        @Override
        public GameType type() {
            return GameType.UNO;
        }

        @Override
        public GameSession create(List<Long> memberIds) {
            return session;
        }
    };
    private final RoomService service = new RoomService(new RoomRegistry(), () -> ROOM_CODE,
            new GameSessionFactories(List.of(fakeFactory)), notifier, new OutcomePublisher(events), events, clock,
            new PresenceTracker(), new FakeRoomPasswordHasher(), new TurnTimer(scheduler), new FixedRandom(0),
            new RoomAvatars(Avatar::defaultFor));

    @BeforeEach
    void openRoom() {
        service.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("방", GameType.UNO, 4, null));
        service.join(CODE, new LoginMember(GUEST, "밥"), null);
    }

    private void start() {
        service.setReady(CODE, GUEST, true);
        service.start(CODE, HOST);
        clearInvocations(notifier);
    }

    @Test
    void 받아_준_신호는_방의_모두에게_보내고_방과_화면은_방송하지_않는다() {
        start();
        session.replySignal("peek-3");
        int tasksBefore = scheduler.tasks().size();

        service.signal(CODE, HOST, PEEK);

        verify(notifier).gameSignal(HOST, "peek-3");
        verify(notifier).gameSignal(GUEST, "peek-3");
        verify(notifier, never()).roomUpdated(any());
        verify(notifier, never()).gameUpdated(anyLong(), any());
        assertThat(scheduler.tasks()).hasSize(tasksBefore);
        assertThat(session.signals()).containsExactly(PEEK);
    }

    @Test
    void 받아_주지_않은_신호는_아무에게도_보내지_않는다() {
        start();
        session.replySignal(null);

        service.signal(CODE, HOST, PEEK);

        verify(notifier, never()).gameSignal(anyLong(), any());
    }

    @Test
    void 게임_전이나_참가자가_아니면_조용히_버린다() {
        session.replySignal("peek-3");

        service.signal(CODE, HOST, PEEK);
        start();
        service.signal(CODE, 99L, PEEK);

        verify(notifier, never()).gameSignal(anyLong(), any());
        assertThat(session.signals()).isEmpty();
    }

    @Test
    void 신호를_모르는_게임은_INVALID_INPUT() {
        assertThatThrownBy(() -> session.signal(HOST, PEEK))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.errorCode()).isEqualTo(ErrorCode.INVALID_INPUT));
    }
}
