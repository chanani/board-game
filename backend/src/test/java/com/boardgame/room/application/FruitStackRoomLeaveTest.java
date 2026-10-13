package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.boardgame.common.security.LoginMember;
import com.boardgame.fruitstack.FruitStackSessionFactory;
import com.boardgame.fruitstack.Seed;
import com.boardgame.fruitstack.view.FruitStackPlayerView;
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

// R28·R29: 살아 있는 사람이 나가거나 60초 끊기면 기권, 탈락한 사람은 나가도·끊겨도 기권이 아니다. R26: 혼자 남는 끝.
class FruitStackRoomLeaveTest {

    private static final String CODE = "FRUITL";
    private static final RoomCode ROOM_CODE = new RoomCode(CODE);
    private static final long HOST = 1L;
    private static final long GUEST = 2L;
    private static final long THIRD = 3L;
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

    // GUEST는 연결한 적이 없어 시작 시각이 끊긴 시각이 된다.
    @BeforeEach
    void startGame() {
        service.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("과일 방", GameType.FRUIT_STACK, 5, null));
        List.of(GUEST, THIRD)
                .forEach(this::joinReady);
        presence.connected(HOST, "s1");
        presence.connected(THIRD, "s3");
        service.start(CODE, HOST);
    }

    private void joinReady(long memberId) {
        service.join(CODE, new LoginMember(memberId, "손님" + memberId), null);
        service.setReady(CODE, memberId, true);
    }

    private static GameAction score(int value) {
        return new GameAction("SCORE", null, null, null, null, null, null, null, value, null);
    }

    private static GameAction out(int value) {
        return new GameAction("OUT", null, null, null, null, null, null, null, value, null);
    }

    private Room room() {
        return registry.get(ROOM_CODE);
    }

    private FruitStackView viewOf(long memberId) {
        return ((FruitStackSessionView) room().viewFor(memberId).orElseThrow()).game();
    }

    private FruitStackPlayerView guestSeat() {
        return viewOf(HOST).players().get(1);
    }

    @Test
    void R29_탈락한_사람이_나가도_기권이_아니고_게임은_이어진다() {
        service.act(CODE, GUEST, out(30));

        service.leave(CODE, GUEST);

        assertThat(viewOf(HOST).status()).isEqualTo("IN_PROGRESS");
        assertThat(guestSeat().state()).isEqualTo("OUT");
        assertThat(guestSeat().score()).isEqualTo(30);
        assertThat(room().memberIds()).hasSize(2);
        verify(events, never()).publishEvent(any(GameCompletedEvent.class));
    }

    @Test
    void R28_살아_있는_사람이_나가면_기권이고_셋_중_하나면_이어진다() {
        service.leave(CODE, GUEST);

        assertThat(guestSeat().state()).isEqualTo("FORFEITED");
        assertThat(viewOf(HOST).status()).isEqualTo("IN_PROGRESS");
    }

    @Test
    void R29_60초_끊긴_탈락자는_자동_기권되지_않는다() {
        service.act(CODE, GUEST, out(30));
        clock.advance(Duration.ofSeconds(61));

        service.forfeitLongDisconnected();

        assertThat(guestSeat().state()).isEqualTo("OUT");
        assertThat(room().memberIds()).hasSize(3);
    }

    @Test
    void R28_60초_끊긴_살아_있는_사람은_자동_기권된다() {
        clock.advance(Duration.ofSeconds(61));

        service.forfeitLongDisconnected();

        assertThat(guestSeat().state()).isEqualTo("FORFEITED");
        assertThat(room().memberIds()).hasSize(2);
        assertThat(viewOf(HOST).status()).isEqualTo("IN_PROGRESS");
    }

    @Test
    void R26_마지막_상대가_나가_혼자_남으면_FORFEIT으로_끝나고_라운드는_기록하지_않는다() {
        service.leave(CODE, GUEST);

        service.leave(CODE, THIRD);

        assertThat(viewOf(HOST).result().reason()).isEqualTo("FORFEIT");
        assertThat(viewOf(HOST).winnerId()).isEqualTo(HOST);
        verify(events).publishEvent(any(GameCompletedEvent.class));
        verify(events, never()).publishEvent(any(RoundCompletedEvent.class));
    }

    @Test
    void R26_탈락자보다_높은_마지막_한_명이면_DECIDED로_끝나고_라운드도_기록한다() {
        service.act(CODE, HOST, score(50));
        service.act(CODE, GUEST, out(30));

        service.act(CODE, THIRD, out(40));

        assertThat(viewOf(HOST).result().reason()).isEqualTo("DECIDED");
        assertThat(viewOf(HOST).winnerId()).isEqualTo(HOST);
        verify(events).publishEvent(any(RoundCompletedEvent.class));
        assertThat(room().status()).isEqualTo(RoomStatus.WAITING);
    }
}
