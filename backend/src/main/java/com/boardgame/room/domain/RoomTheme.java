package com.boardgame.room.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.Arrays;

public enum RoomTheme {
    WOOD, SUNSET, MOONLIT, AURORA, BEACH;

    public static RoomTheme parse(String raw) {
        if (raw == null) {
            return WOOD;
        }
        return Arrays.stream(values())
                .filter(theme -> theme.name().equals(raw))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_THEME));
    }
}
