package com.boardgame.fruitstack;

// R4: 과일 순서의 씨앗(0 이상 int).
public record Seed(int value) {

    public Seed {
        if (value < 0) {
            throw new IllegalArgumentException("씨앗은 0 이상이어야 합니다: " + value);
        }
    }
}
