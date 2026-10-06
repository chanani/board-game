package com.boardgame.papersafari;

public enum RoundOutcome {
    WIN, DRAW, LOSE;

    public static RoundOutcome winOrLose(boolean won) {
        if (won) {
            return WIN;
        }
        return LOSE;
    }
}
