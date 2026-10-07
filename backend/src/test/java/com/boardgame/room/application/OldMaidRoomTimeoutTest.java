package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameSessionFactories;
import com.boardgame.game.GameType;
import com.boardgame.member.domain.Avatar;
import com.boardgame.oldmaid.OldMaidSessionFactory;
import com.boardgame.oldmaid.PlayingCard;
import com.boardgame.oldmaid.view.OldMaidSessionView;
import com.boardgame.oldmaid.view.OldMaidView;
import com.boardgame.room.api.CreateRoomRequest;
import com.boardgame.room.domain.FakeRoomPasswordHasher;
import com.boardgame.room.domain.Room;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomRegistry;
import com.boardgame.support.FakeTaskScheduler;
import com.boardgame.support.FixedRandom;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

// 도둑잡기 세션도 기존 방 타이머(TurnTimer·rearm·applyTimeout)에 그대로 올라탄다. FixedRandom(1) → 조커 자리를 뽑는다.
class OldMaidRoomTimeoutTest {

    private static final String CODE = "THIEFS";
    private static final RoomCode ROOM_CODE = new RoomCode(CODE);
    private static final long HOST = 1L;
    private static final long GUEST = 2L;
    private static final Instant T0 = Instant.parse("2026-10-07T00:00:00Z");

    private final MutableClock clock = new MutableClock(T0);
    private final RoomRegistry registry = new RoomRegistry();
    private final RoomNotifier notifier = mock(RoomNotifier.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final FakeTaskScheduler scheduler = new FakeTaskScheduler();
    private final OldMaidSessionFactory factory = new OldMaidSessionFactory(clock, cards -> {
        List<PlayingCard> rotated = new ArrayList<>(cards.subList(1, cards.size()));
        rotated.add(cards.get(0));
        return rotated;
    }, bound -> 0);
    private final RoomService service = new RoomService(registry, () -> ROOM_CODE,
            new GameSessionFactories(List.of(factory)), notifier, new OutcomePublisher(events), events, clock,
            new PresenceTracker(), new FakeRoomPasswordHasher(), new TurnTimer(scheduler), new FixedRandom(1),
            new RoomAvatars(Avatar::defaultFor));

    @BeforeEach
    void startGame() {
        service.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("도둑잡기 방", GameType.OLD_MAID, 6, null));
        service.join(CODE, new LoginMember(GUEST, "밥"), null);
        service.setReady(CODE, GUEST, true);
        service.start(CODE, HOST);
    }

    private OldMaidView viewOf(long memberId) {
        Room room = registry.get(ROOM_CODE);
        return ((OldMaidSessionView) room.viewFor(memberId).orElseThrow()).game();
    }

    @Test
    void 시작하면_15초_뒤로_예약한다() {
        assertThat(scheduler.latest().startTime()).isEqualTo(T0.plusSeconds(15));
    }

    @Test
    void 시간이_지나면_뽑는_사람_대신_무작위로_뽑고_다음_마감을_예약한다() {
        clock.advance(Duration.ofSeconds(15));

        scheduler.latest().run();

        OldMaidView view = viewOf(GUEST);
        assertThat(view.currentPlayerId()).isEqualTo(GUEST);
        assertThat(view.lastAutoActorIds()).containsExactly(HOST);
        assertThat(view.autoActSeq()).isEqualTo(1L);
        assertThat(view.players().get(0).cardCount()).isEqualTo(2);
        assertThat(scheduler.latest().startTime()).isEqualTo(T0.plusSeconds(30));
    }
}
