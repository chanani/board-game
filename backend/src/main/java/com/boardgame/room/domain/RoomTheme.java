package com.boardgame.room.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.Arrays;

public enum RoomTheme {
    WOOD, SUNSET, MOONLIT, AURORA, BLOSSOM;

    // 열대 해변(BEACH)은 벚꽃 언덕(BLOSSOM)으로 바뀌었다. 배포 전에 열어 둔 화면이 예전 값을 보내도 거절하지 않고 새 테마로 받는다.
    private static final String RETIRED_BEACH = "BEACH";

    public static RoomTheme parse(String raw) {
        if (raw == null) {
            return WOOD;
        }
        if (RETIRED_BEACH.equals(raw)) {
            return BLOSSOM;
        }
        return Arrays.stream(values())
                .filter(theme -> theme.name().equals(raw))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_THEME));
    }
}
