package com.boardgame.papersafari;

public record RoundNumber(int value) {

    public static final RoundNumber FIRST = new RoundNumber(1);

    public RoundNumber next() {
        return new RoundNumber(value + 1);
    }

    public int index() {
        return value - 1;
    }
}
