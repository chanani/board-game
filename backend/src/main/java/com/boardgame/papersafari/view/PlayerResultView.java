package com.boardgame.papersafari.view;

import com.boardgame.papersafari.RoundOutcome;

public record PlayerResultView(long playerId, int score, RoundOutcome outcome) {
}
