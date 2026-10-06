package com.boardgame.room.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameType;

public record Capacity(int value) {

    public static Capacity of(GameType type, int value) {
        if (value < type.minPlayers() || value > type.maxPlayers()) {
            throw new BusinessException(ErrorCode.INVALID_CAPACITY);
        }
        return new Capacity(value);
    }

    public static Capacity max(GameType type) {
        return new Capacity(type.maxPlayers());
    }

    public boolean isFull(int size) {
        return size >= value;
    }
}
