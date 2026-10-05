package com.boardgame.game.event;

import com.boardgame.game.GameType;
import com.boardgame.game.RoundCompleted;

public record RoundCompletedEvent(String matchKey, GameType gameType, RoundCompleted round) {
}
