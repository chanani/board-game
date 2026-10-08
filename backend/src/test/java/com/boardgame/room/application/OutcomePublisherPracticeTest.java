package com.boardgame.room.application;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameType;
import com.boardgame.game.RoundCompleted;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.member.domain.Avatar;
import com.boardgame.room.domain.Capacity;
import com.boardgame.room.domain.FakeGameSession;
import com.boardgame.room.domain.Participant;
import com.boardgame.room.domain.Room;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomLock;
import com.boardgame.room.domain.RoomName;
import com.boardgame.room.domain.RoomProfile;
import com.boardgame.room.domain.RoomSettings;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

class OutcomePublisherPracticeTest {

    private static final Instant NOW = Instant.parse("2026-10-08T10:00:00Z");

    @Test
    void R37_연습_경기의_결과는_어느_길로_와도_발행하지_않는다() {
        ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
        RoomSettings settings = new RoomSettings(GameType.UNO, Capacity.max(GameType.UNO), RoomLock.open());
        Room room = Room.open(new RoomProfile(new RoomCode("ABCDEF"), new RoomName("방"), settings), new Participant(1L, "앨리스"));
        room.addBot(1L, BotDifficulty.EASY, Avatar.CAT);
        room.start(1L, FakeGameSession::new, "m", NOW);

        new OutcomePublisher(events).publish(room,
                List.of(new RoundCompleted(1, List.of()), new GameCompleted(List.of())), NOW);

        verify(events, never()).publishEvent(any(Object.class));
    }
}
