package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.boardgame.common.security.LoginMember;
import com.boardgame.fruitstack.FruitStackSessionFactory;
import com.boardgame.fruitstack.Seed;
import com.boardgame.game.GameSessionFactories;
import com.boardgame.game.GameType;
import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.game.event.GameStartedEvent;
import com.boardgame.game.event.RoundCompletedEvent;
import com.boardgame.member.domain.Avatar;
import com.boardgame.room.api.CreateRoomRequest;
import com.boardgame.room.api.RoomResponse;
import com.boardgame.room.domain.FakeRoomPasswordHasher;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomRegistry;
import com.boardgame.room.domain.RoomStatus;
import com.boardgame.support.FakeTaskScheduler;
import com.boardgame.support.FixedRandom;
import com.boardgame.support.MutableClock;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

// 수박게임 혼자 하기(스펙 12장): 방장 혼자 시작하고, 경기·판 기록은 남기지 않는다.
class RoomServiceSoloTest {

    private static final String CODE = "SOLOFS";
    private static final long HOST = 1L;

    private final MutableClock clock = new MutableClock(Instant.parse("2026-10-15T00:00:00Z"));
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final RoomService service = new RoomService(new RoomRegistry(), () -> new RoomCode(CODE),
            new GameSessionFactories(List.of(new FruitStackSessionFactory(clock, () -> new Seed(7)))),
            mock(RoomNotifier.class), new OutcomePublisher(events), events, clock, new PresenceTracker(),
            new FakeRoomPasswordHasher(), new TurnTimer(new FakeTaskScheduler()), new FixedRandom(0),
            new RoomAvatars(Avatar::defaultFor));

    @Test
    void S1_S6_방장_혼자_시작하면_게임이_되고_경기_시작도_결과도_기록하지_않는다() {
        service.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("방", GameType.FRUIT_STACK, 5, null));

        RoomResponse started = service.start(CODE, HOST);
        service.leave(CODE, HOST);

        assertThat(started.status()).isEqualTo(RoomStatus.PLAYING);
        assertThat(started.practice()).isFalse();
        verify(events, never()).publishEvent(any(GameStartedEvent.class));
        verify(events, never()).publishEvent(any(RoundCompletedEvent.class));
        verify(events, never()).publishEvent(any(GameCompletedEvent.class));
    }

    @Test
    void 친구가_들어와_둘이_시작하면_예전처럼_대결로_기록한다() {
        service.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("방", GameType.FRUIT_STACK, 5, null));
        service.join(CODE, new LoginMember(2L, "밥"), null);
        service.setReady(CODE, 2L, true);

        service.start(CODE, HOST);

        verify(events).publishEvent(any(GameStartedEvent.class));
    }
}
