package com.boardgame.papersafari;

public enum TurnPhase {
    SETUP_FLIP, DRAW, PLACE, PEEK, ROUND_OVER;

    public boolean isPlaying() {
        return this == DRAW || this == PLACE || this == PEEK;
    }
}
