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

    public boolean isBelow(int size) {
        return value < size;
    }

    public boolean isFull(int size) {
        return size >= value;
    }

    /** R9: 게임 최대 인원보다 작으면 1 늘린다. 이미 최대면 ROOM_FULL. */
    public Capacity grownFor(GameType type) {
        if (value >= type.maxPlayers()) {
            throw new BusinessException(ErrorCode.ROOM_FULL);
        }
        return new Capacity(value + 1);
    }
}
