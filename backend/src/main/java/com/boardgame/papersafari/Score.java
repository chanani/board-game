package com.boardgame.papersafari;

public record Score(int value) implements Comparable<Score> {

    public static final Score ZERO = new Score(0);

    public Score plus(Score other) {
        return new Score(value + other.value);
    }

    @Override
    public int compareTo(Score other) {
        return Integer.compare(value, other.value);
    }
}
