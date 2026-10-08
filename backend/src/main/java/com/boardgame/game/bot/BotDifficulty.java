package com.boardgame.game.bot;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.Arrays;

// R3·R8: 컴퓨터 난이도. 화면 표기는 하·중·상.
public enum BotDifficulty {
    EASY, MEDIUM, HARD;

    public static BotDifficulty parse(String raw) {
        return Arrays.stream(values())
                .filter(difficulty -> difficulty.name().equals(raw))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_INPUT));
    }
}
