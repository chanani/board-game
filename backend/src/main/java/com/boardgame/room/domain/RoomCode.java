package com.boardgame.room.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.Locale;
import java.util.regex.Pattern;

public record RoomCode(String value) {

    private static final Pattern FORMAT = Pattern.compile("^[A-Z0-9]{6}$");

    public RoomCode {
        if (value == null || !FORMAT.matcher(value).matches()) {
            throw new BusinessException(ErrorCode.ROOM_NOT_FOUND);
        }
    }

    public static RoomCode parse(String raw) {
        if (raw == null) {
            throw new BusinessException(ErrorCode.ROOM_NOT_FOUND);
        }
        return new RoomCode(raw.toUpperCase(Locale.ROOT));
    }
}
