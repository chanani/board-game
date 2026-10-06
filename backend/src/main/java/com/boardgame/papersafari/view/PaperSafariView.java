package com.boardgame.papersafari.view;

import com.boardgame.papersafari.GameStatus;

public record PaperSafariView(
        long viewerId,
        GameStatus status,
        int roundNumber,
        RoundView round,
        RoundResultView lastRoundResult,
        Long winnerId) {
}
