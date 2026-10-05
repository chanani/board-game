package com.boardgame.game.event;

import com.boardgame.game.GameType;
import java.time.Instant;
import java.util.List;

public record GameStartedEvent(String matchKey, GameType gameType, List<Long> memberIds, Instant startedAt) {
}
