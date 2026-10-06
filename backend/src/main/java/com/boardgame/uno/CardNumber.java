package com.boardgame.uno;

public record CardNumber(int value) {

    public CardNumber {
        if (value < 0 || value > 9) {
            throw new IllegalArgumentException("카드 숫자는 0~9입니다: " + value);
        }
    }
}
