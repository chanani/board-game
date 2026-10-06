package com.boardgame.uno;

public enum CardKind {
    NUMBER(0), SKIP(20), REVERSE(20), DRAW_TWO(20), WILD(50), WILD_DRAW_FOUR(50);

    private final int fixedPoints;

    CardKind(int fixedPoints) {
        this.fixedPoints = fixedPoints;
    }

    public boolean isWild() {
        return this == WILD || this == WILD_DRAW_FOUR;
    }

    public int fixedPoints() {
        return fixedPoints;
    }
}
