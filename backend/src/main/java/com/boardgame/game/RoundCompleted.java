package com.boardgame.game;

import java.util.List;

public record RoundCompleted(int roundNumber, List<RoundEntry> entries) implements GameOutcome {
}
