package com.boardgame.game.event;

import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameType;
import java.time.Instant;

public record GameCompletedEvent(String matchKey, GameType gameType, Instant startedAt, Instant endedAt,
                                 GameCompleted result) {
}
