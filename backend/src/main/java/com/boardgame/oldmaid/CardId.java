package com.boardgame.oldmaid;

// R2: 0~52. 조커는 52.
public record CardId(int value) {

    public static final int COUNT = 53;

    public CardId {
        if (value < 0 || value >= COUNT) {
            throw new IllegalArgumentException("카드 번호는 0~52입니다: " + value);
        }
    }
}
