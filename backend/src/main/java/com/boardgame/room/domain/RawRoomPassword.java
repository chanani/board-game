package com.boardgame.room.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;

public record RawRoomPassword(String value) {

    private static final int MIN_LENGTH = 4;
    private static final int MAX_LENGTH = 20;

    public RawRoomPassword {
        value = normalize(value);
    }

    private static String normalize(String raw) {
        if (raw == null) {
            throw new BusinessException(ErrorCode.INVALID_ROOM_PASSWORD);
        }
        String stripped = raw.strip();
        if (stripped.length() < MIN_LENGTH || stripped.length() > MAX_LENGTH) {
            throw new BusinessException(ErrorCode.INVALID_ROOM_PASSWORD);
        }
        return stripped;
    }
}
