package com.boardgame.uno;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;

// 행동에 실려 온 색 글자. 와일드를 낼 때만 require()로 검사한다(검사 순서상 카드 검사 뒤, R10).
public record ChosenColor(String raw) {

    public static ChosenColor none() {
        return new ChosenColor(null);
    }

    public static ChosenColor of(UnoColor color) {
        return new ChosenColor(color.name());
    }

    public UnoColor require() {
        if (raw == null) {
            throw new BusinessException(ErrorCode.UNO_COLOR_REQUIRED);
        }
        return UnoColor.of(raw);
    }
}
