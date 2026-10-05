package com.boardgame.room.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;

public record RoomName(String value) {

    private static final int MAX_LENGTH = 20;

    public RoomName {
        if (value == null || value.isBlank() || value.strip().length() > MAX_LENGTH) {
            throw new BusinessException(ErrorCode.INVALID_ROOM_NAME);
        }
        value = value.strip();
    }
}
