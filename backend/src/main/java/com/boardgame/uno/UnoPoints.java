package com.boardgame.uno;

public record UnoPoints(int value) {

    public static final UnoPoints ZERO = new UnoPoints(0);

    public UnoPoints plus(UnoPoints other) {
        return new UnoPoints(value + other.value);
    }
}
