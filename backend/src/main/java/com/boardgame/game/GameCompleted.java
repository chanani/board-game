package com.boardgame.game;

import java.util.List;

public record GameCompleted(List<MatchEntry> entries) implements GameOutcome {
}
