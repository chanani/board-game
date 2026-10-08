package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameSessionFactories;
import com.boardgame.game.GameType;
import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.game.event.GameStartedEvent;
import com.boardgame.game.event.RoundCompletedEvent;
import com.boardgame.member.domain.Avatar;
import com.boardgame.papersafari.PaperSafariSessionFactory;
import com.boardgame.room.api.BotDifficultyRequest;
import com.boardgame.room.api.CreateRoomRequest;
import com.boardgame.room.api.RoomResponse;
import com.boardgame.room.domain.FakeRoomPasswordHasher;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomRegistry;
import com.boardgame.support.FakeTaskScheduler;
import com.boardgame.support.FixedRandom;
import com.boardgame.support.MutableClock;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

class RoomServicePracticeTest {

    private static final String CODE = "PRACTI";
    private static final long HOST = 1L;

    private final MutableClock clock = new MutableClock(Instant.parse("2026-10-08T00:00:00Z"));
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final RoomService service = new RoomService(new RoomRegistry(), () -> new RoomCode(CODE),
            new GameSessionFactories(List.of(new PaperSafariSessionFactory(clock))), mock(RoomNotifier.class),
            new OutcomePublisher(events), events, clock, new PresenceTracker(), new FakeRoomPasswordHasher(),
            new TurnTimer(new FakeTaskScheduler()), new FixedRandom(0), new RoomAvatars(Avatar::defaultFor));

    @Test
    void R37_R38_연습_경기는_시작_결과_이벤트를_보내지_않고_응답에_practice를_싣는다() {
        service.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("방", GameType.PAPER_SAFARI, 4, null));
        service.addBot(CODE, HOST, new BotDifficultyRequest("EASY"));

        RoomResponse started = service.start(CODE, HOST);
        service.leave(CODE, HOST);

        assertThat(started.practice()).isTrue();
        verify(events, never()).publishEvent(any(GameStartedEvent.class));
        verify(events, never()).publishEvent(any(RoundCompletedEvent.class));
        verify(events, never()).publishEvent(any(GameCompletedEvent.class));
    }

    @Test
    void R37_사람끼리는_그대로_시작_이벤트를_보내고_practice는_false다() {
        service.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("방", GameType.PAPER_SAFARI, 4, null));
        service.join(CODE, new LoginMember(2L, "밥"), null);
        service.setReady(CODE, 2L, true);

        RoomResponse started = service.start(CODE, HOST);

        assertThat(started.practice()).isFalse();
        verify(events).publishEvent(any(GameStartedEvent.class));
    }
}
