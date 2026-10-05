package com.boardgame.papersafari;

public record CardValue(int value) {

    public static final CardValue ZERO = new CardValue(0);
    public static final CardValue TEN = new CardValue(10);
    public static final CardValue MINUS_TWO = new CardValue(-2);
}
