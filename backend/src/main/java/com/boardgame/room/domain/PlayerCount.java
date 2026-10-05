package com.boardgame.room.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;

public record PlayerCount(int value) {

    private static final PlayerCount ZERO = new PlayerCount(0);

    public PlayerCount {
        if (value < 0) {
            throw new BusinessException(ErrorCode.INVALID_PLAYER_TOTAL);
        }
    }

    public static PlayerCount of(int value) {
        return new PlayerCount(value);
    }

    public static PlayerCount zero() {
        return ZERO;
    }

    public PlayerCount plus(PlayerCount other) {
        return new PlayerCount(value + other.value);
    }
}
