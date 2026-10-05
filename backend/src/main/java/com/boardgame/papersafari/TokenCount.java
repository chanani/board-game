package com.boardgame.papersafari;

public record TokenCount(int value) {

    public static final TokenCount ZERO = new TokenCount(0);

    public TokenCount next() {
        return new TokenCount(value + 1);
    }

    public boolean hasReached(TokenCount goal) {
        return value >= goal.value;
    }
}
