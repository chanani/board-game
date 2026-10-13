package com.boardgame.fruitstack;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;

// R10·R19: 점수는 0 이상이고 줄지 않는다.
public record Score(int value) {

    public static final Score ZERO = new Score(0);

    public Score {
        if (value < 0) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
    }

    public boolean isBelow(Score other) {
        return value < other.value;
    }

    public boolean isAbove(Score other) {
        return value > other.value;
    }

    public boolean exceeds(ScoreCeiling ceiling) {
        return ceiling.isBelow(value);
    }
}
