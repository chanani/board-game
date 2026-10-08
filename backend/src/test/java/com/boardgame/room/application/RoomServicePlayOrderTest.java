package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameSession;
import com.boardgame.game.GameSessionFactories;
import com.boardgame.game.GameSessionFactory;
import com.boardgame.game.GameType;
import com.boardgame.member.domain.Avatar;
import com.boardgame.papersafari.PaperSafariSessionFactory;
import com.boardgame.room.api.CreateRoomRequest;
import com.boardgame.room.domain.FakeRoomPasswordHasher;
import com.boardgame.room.domain.PlayOrder;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomRegistry;
import com.boardgame.support.FakeTaskScheduler;
import com.boardgame.support.FixedRandom;
import com.boardgame.support.MutableClock;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

class RoomServicePlayOrderTest {

    private static final String CODE = "ORDERS";
    private static final long HOST = 1L;
    private static final long GUEST = 2L;
    private static final long THIRD = 3L;

    private final MutableClock clock = new MutableClock(Instant.parse("2026-10-08T00:00:00Z"));
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final RecordingFactory factory = new RecordingFactory(new PaperSafariSessionFactory(clock));
    private final ScriptedRandom random = new ScriptedRandom();
    private final RoomService service = new RoomService(new RoomRegistry(), () -> new RoomCode(CODE),
            new GameSessionFactories(List.of(factory)), mock(RoomNotifier.class),
            new OutcomePublisher(events), events, clock, new PresenceTracker(), new FakeRoomPasswordHasher(),
            new TurnTimer(new FakeTaskScheduler()), new FixedRandom(0), new RoomAvatars(Avatar::defaultFor),
            BotDriver.idle(), PlayOrder.random(random));

    @Test
    void 게임을_시작하면_앉은_순서가_아니라_무작위로_정한_순서로_게임을_만든다() {
        openWithThree();
        random.script(2, 0, 0);

        service.start(CODE, HOST);

        assertThat(factory.orders).containsExactly(List.of(THIRD, HOST, GUEST));
    }

    @Test
    void 같은_방에서_다시_시작할_때마다_순서를_새로_뽑는다() {
        openWithThree();
        random.script(2, 0, 0);
        service.start(CODE, HOST);
        service.leave(CODE, GUEST);
        service.leave(CODE, THIRD);
        service.join(CODE, new LoginMember(GUEST, "밥"), null);
        service.setReady(CODE, GUEST, true);
        random.script(1, 0);

        service.start(CODE, HOST);

        assertThat(factory.orders).containsExactly(List.of(THIRD, HOST, GUEST), List.of(GUEST, HOST));
    }

    @Test
    void 무작위가_정한_순서여도_대기실_자리는_그대로다() {
        openWithThree();
        random.script(2, 0, 0);

        service.start(CODE, HOST);

        assertThat(service.get(CODE, HOST).members())
                .extracting(member -> member.id())
                .containsExactly(HOST, GUEST, THIRD);
    }

    private void openWithThree() {
        service.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("방", GameType.PAPER_SAFARI, 4, null));
        service.join(CODE, new LoginMember(GUEST, "밥"), null);
        service.join(CODE, new LoginMember(THIRD, "캐럴"), null);
        service.setReady(CODE, GUEST, true);
        service.setReady(CODE, THIRD, true);
    }

    private static final class RecordingFactory implements GameSessionFactory {

        private final GameSessionFactory delegate;
        private final List<List<Long>> orders = new ArrayList<>();

        private RecordingFactory(GameSessionFactory delegate) {
            this.delegate = delegate;
        }

        @Override
        public GameType type() {
            return delegate.type();
        }

        @Override
        public GameSession create(List<Long> memberIds) {
            orders.add(List.copyOf(memberIds));
            return delegate.create(memberIds);
        }
    }

    // 정해 둔 값을 차례로 내준다. 다 쓰면 0을 고른다.
    private static final class ScriptedRandom extends Random {

        private final Deque<Integer> values = new ArrayDeque<>();

        private void script(Integer... next) {
            values.clear();
            values.addAll(List.of(next));
        }

        @Override
        public int nextInt(int bound) {
            if (values.isEmpty()) {
                return 0;
            }
            return values.poll() % bound;
        }
    }
}
