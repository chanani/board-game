package com.boardgame.papersafari;

public record RoundNumber(int value) {

    public static final RoundNumber FIRST = new RoundNumber(1);
}
