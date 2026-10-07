package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.boardgame.member.domain.Avatar;
import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameSessionFactories;
import com.boardgame.game.GameType;
import com.boardgame.papersafari.PaperSafariSessionFactory;
import com.boardgame.room.api.CreateRoomRequest;
import com.boardgame.room.domain.FakeRoomPasswordHasher;
import com.boardgame.room.domain.Room;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomRegistry;
import com.boardgame.support.FakeTaskScheduler;
import com.boardgame.support.FixedRandom;
import com.boardgame.support.MutableClock;
import com.boardgame.uno.UnoCard;
import com.boardgame.uno.UnoSessionFactory;
import com.boardgame.uno.view.UnoSessionView;
import com.boardgame.uno.view.UnoView;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

// 우노 세션도 기존 방 타이머(TurnTimer·rearm·applyTimeout)에 그대로 올라탄다.
class UnoRoomTimeoutTest {

    private static final String CODE = "UNOUNO";
    private static final RoomCode ROOM_CODE = new RoomCode(CODE);
    private static final long HOST = 1L;
    private static final long GUEST = 2L;
    private static final Instant T0 = Instant.parse("2026-10-07T00:00:00Z");

    private final MutableClock clock = new MutableClock(T0);
    private final RoomRegistry registry = new RoomRegistry();
    private final RoomNotifier notifier = mock(RoomNotifier.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final FakeTaskScheduler scheduler = new FakeTaskScheduler();
    private final TurnTimer timer = new TurnTimer(scheduler);
    private final UnoSessionFactory unoFactory = new UnoSessionFactory(clock, cards -> {
        List<UnoCard> copy = new ArrayList<>(cards);
        Collections.reverse(copy);
        return copy;
    }, count -> 0);
    private final RoomService service = new RoomService(registry, () -> ROOM_CODE,
            new GameSessionFactories(List.of(new PaperSafariSessionFactory(clock), unoFactory)), notifier,
            new OutcomePublisher(events), events, clock, new PresenceTracker(), new FakeRoomPasswordHasher(),
            timer, new FixedRandom(0), new RoomAvatars(Avatar::defaultFor));

    @BeforeEach
    void startGame() {
        service.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("우노 방", GameType.UNO, 4, null));
        service.join(CODE, new LoginMember(GUEST, "밥"), null);
        service.setReady(CODE, GUEST, true);
        service.start(CODE, HOST);
    }

    private UnoView viewOf(long memberId) {
        Room room = registry.get(ROOM_CODE);
        UnoSessionView view = (UnoSessionView) room.viewFor(memberId).orElseThrow();
        return view.game();
    }

    @Test
    void 시작하면_15초_뒤로_예약한다() {
        assertThat(scheduler.latest().startTime()).isEqualTo(T0.plusSeconds(15));
    }

    @Test
    void 시간이_지나면_차례인_사람_대신_1장을_뽑고_넘긴_뒤_다음_마감을_예약한다() {
        clock.advance(Duration.ofSeconds(15));

        scheduler.latest().run();

        UnoView view = viewOf(GUEST);
        assertThat(view.currentPlayerId()).isEqualTo(GUEST);
        assertThat(view.lastAutoActorIds()).containsExactly(HOST);
        assertThat(view.autoActSeq()).isEqualTo(1L);
        assertThat(view.players().get(0).cardCount()).isEqualTo(8);
        assertThat(scheduler.latest().startTime()).isEqualTo(T0.plusSeconds(30));
    }
}
