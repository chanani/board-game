package com.boardgame.oldmaid;

// R30: 1부터 오르는 등수.
public record FinishRank(int value) {

    public FinishRank {
        if (value < 1) {
            throw new IllegalArgumentException("등수는 1 이상입니다: " + value);
        }
    }
}
