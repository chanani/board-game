package com.boardgame.papersafari.view;

import com.boardgame.papersafari.GameStatus;
import java.util.Map;

public record PaperSafariView(
        long viewerId,
        GameStatus status,
        int roundNumber,
        RoundView round,
        Map<Long, Integer> tokens,
        RoundResultView lastRoundResult,
        Long winnerId) {
}
