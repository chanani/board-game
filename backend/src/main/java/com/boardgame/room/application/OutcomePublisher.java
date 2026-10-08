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
        // R37: 연습 경기는 판 결과·게임 결과를 기록하지 않는다(나가기·시간 초과·행동 어느 길로 와도).
        if (outcomes.isEmpty() || room.isPractice()) {
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
