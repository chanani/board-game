package com.boardgame.fruitstack;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;

// 한 사람의 점수와 상태(R19·R20·R28).
public class Stacker {

    private Score score = Score.ZERO;
    private PlayerState state = PlayerState.PLAYING;

    // R19: 살아 있는 사람의, 줄지 않고 상한 안인 점수만 받는다. 거절하면 아무것도 바꾸지 않는다.
    void report(Score next, ScoreCeiling ceiling) {
        if (!isPlaying() || next.isBelow(score) || next.exceeds(ceiling)) {
            throw new BusinessException(ErrorCode.FRUIT_STACK_SCORE_REJECTED);
        }
        score = next;
    }

    void goOut() {
        state = PlayerState.OUT;
    }

    // R28·R29: 살아 있는 사람만 기권이 된다. 기권이 되었으면 true.
    boolean forfeit() {
        if (!isPlaying()) {
            return false;
        }
        state = PlayerState.FORFEITED;
        return true;
    }

    boolean isPlaying() {
        return state == PlayerState.PLAYING;
    }

    boolean isContender() {
        return state != PlayerState.FORFEITED;
    }

    Score score() {
        return score;
    }

    PlayerState state() {
        return state;
    }
}
