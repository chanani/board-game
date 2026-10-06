package com.boardgame.uno;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.Arrays;

// 선언 순서 = 자동 색 고르기(R40)의 동점 우선순위.
public enum UnoColor {
    RED, YELLOW, GREEN, BLUE;

    public static UnoColor of(String raw) {
        return Arrays.stream(values())
                .filter(color -> color.name().equals(raw))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.UNO_INVALID_COLOR));
    }
}
