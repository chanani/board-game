package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.boardgame.common.security.LoginMember;
import com.boardgame.fruitstack.FruitStackSessionFactory;
import com.boardgame.fruitstack.Seed;
import com.boardgame.fruitstack.view.FruitStackSessionView;
import com.boardgame.fruitstack.view.FruitStackView;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameSessionFactories;
import com.boardgame.game.GameType;
import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.game.event.RoundCompletedEvent;
import com.boardgame.member.domain.Avatar;
import com.boardgame.room.api.CreateRoomRequest;
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

// 수박게임 세션도 기존 방 타이머(TurnTimer·rearm·applyTimeout)에 그대로 올라탄다. 마감은 하나뿐이다: 시작 + 10분(R17).
class FruitStackRoomTimeoutTest {

    private static final String CODE = "FRUITS";
    private static final RoomCode ROOM_CODE = new RoomCode(CODE);
    private static final long HOST = 1L;
    private static final long GUEST = 2L;
    private static final Instant T0 = Instant.parse("2026-10-13T00:00:00Z");

    private final MutableClock clock = new MutableClock(T0);
    private final RoomRegistry registry = new RoomRegistry();
    private final RoomNotifier notifier = mock(RoomNotifier.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final FakeTaskScheduler scheduler = new FakeTaskScheduler();
    private final PresenceTracker presence = new PresenceTracker();
    private final FruitStackSessionFactory factory = new FruitStackSessionFactory(clock, () -> new Seed(12345));
    private final RoomService service = new RoomService(registry, () -> ROOM_CODE,
            new GameSessionFactories(List.of(factory)), notifier, new OutcomePublisher(events), events, clock,
            presence, new FakeRoomPasswordHasher(), new TurnTimer(scheduler), new FixedRandom(1),
            new RoomAvatars(Avatar::defaultFor));

    @BeforeEach
    void startGame() {
        service.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("과일 방", GameType.FRUIT_STACK, 5, null));
        service.join(CODE, new LoginMember(GUEST, "밥"), null);
        service.setReady(CODE, GUEST, true);
        service.start(CODE, HOST);
    }

    private static GameAction score(int value) {
        return new GameAction("SCORE", null, null, null, null, null, null, null, value, null);
    }

    private FruitStackView viewOf(long memberId) {
        Room room = registry.get(ROOM_CODE);
        return ((FruitStackSessionView) room.viewFor(memberId).orElseThrow()).game();
    }

    @Test
    void R17_시작하면_10분_뒤로_마감을_예약한다() {
        assertThat(scheduler.latest().startTime()).isEqualTo(T0.plusSeconds(600));
        assertThat(viewOf(HOST).deadline()).isEqualTo(T0.plusSeconds(600).toEpochMilli());
        assertThat(viewOf(HOST).seed()).isEqualTo(12345);
    }

    @Test
    void R17_점수_보고_뒤에도_같은_시각으로_다시_예약한다() {
        clock.advance(Duration.ofSeconds(30));

        service.act(CODE, HOST, score(20));

        assertThat(scheduler.latest().startTime()).isEqualTo(T0.plusSeconds(600));
        assertThat(viewOf(GUEST).players().get(0).score()).isEqualTo(20);
    }

    @Test
    void R17_10분이_지나면_지금_점수로_끝나고_방은_대기로_돌아간다() {
        service.act(CODE, HOST, score(20));
        clock.advance(Duration.ofSeconds(600));

        scheduler.latest().run();

        assertThat(viewOf(HOST).status()).isEqualTo("GAME_OVER");
        assertThat(viewOf(HOST).result().reason()).isEqualTo("TIME_UP");
        assertThat(registry.get(ROOM_CODE).status()).isEqualTo(RoomStatus.WAITING);
        verify(events).publishEvent(any(RoundCompletedEvent.class));
        verify(events).publishEvent(any(GameCompletedEvent.class));
    }

    @Test
    void R17_마감_전에_타이머가_먼저_울리면_아무것도_끝내지_않고_다시_예약한다() {
        clock.advance(Duration.ofSeconds(599));

        scheduler.latest().run();

        assertThat(viewOf(HOST).status()).isEqualTo("IN_PROGRESS");
        assertThat(scheduler.latest().startTime()).isEqualTo(T0.plusSeconds(600));
    }
}
