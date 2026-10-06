package com.boardgame.uno;

public enum Direction {
    CLOCKWISE(1), COUNTER_CLOCKWISE(-1);

    private final int step;

    Direction(int step) {
        this.step = step;
    }

    public int step() {
        return step;
    }

    public Direction reversed() {
        if (this == CLOCKWISE) {
            return COUNTER_CLOCKWISE;
        }
        return CLOCKWISE;
    }
}
