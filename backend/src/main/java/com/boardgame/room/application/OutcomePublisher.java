package com.boardgame.room.application;

import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.RoundCompleted;
import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.game.event.RoundCompletedEvent;
import com.boardgame.room.domain.Room;
import com.boardgame.room.domain.RoomGame;
import java.time.Instant;
import java.util.List;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

@Component
public class OutcomePublisher {

    private final ApplicationEventPublisher eventPublisher;

    public OutcomePublisher(ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

    public void publish(Room room, List<GameOutcome> outcomes, Instant now) {
        if (outcomes.isEmpty()) {
            return;
        }
        RoomGame game = room.currentGame();
        outcomes.forEach(outcome -> eventPublisher.publishEvent(toEvent(room, game, outcome, now)));
    }

    private Object toEvent(Room room, RoomGame game, GameOutcome outcome, Instant now) {
        return switch (outcome) {
            case RoundCompleted round -> new RoundCompletedEvent(game.matchKey(), room.gameType(), round);
            case GameCompleted completed ->
                    new GameCompletedEvent(game.matchKey(), room.gameType(), game.startedAt(), now, completed);
        };
    }
}
