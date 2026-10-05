package com.boardgame.papersafari.view;

import com.boardgame.papersafari.TurnPhase;
import java.util.List;

public record RoundView(
        TurnPhase phase,
        long currentPlayerId,
        int deckSize,
        CardView discardTop,
        HeldView held,
        List<BoardView> boards) {
}
