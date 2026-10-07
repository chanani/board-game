package com.boardgame.oldmaid;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;

// R12: 손패 안의 자리 번호(0부터, 서버 순서).
public record SlotIndex(int value) {

    public SlotIndex {
        if (value < 0) {
            throw new BusinessException(ErrorCode.OLD_MAID_INVALID_SLOT);
        }
    }
}
