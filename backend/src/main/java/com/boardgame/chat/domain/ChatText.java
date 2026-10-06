package com.boardgame.chat.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;

public record ChatText(String value) {

    private static final int MAX_LENGTH = 200;

    public ChatText {
        if (value == null) {
            throw new BusinessException(ErrorCode.INVALID_CHAT_MESSAGE);
        }
        value = value.strip();
        if (value.isEmpty() || value.length() > MAX_LENGTH) {
            throw new BusinessException(ErrorCode.INVALID_CHAT_MESSAGE);
        }
    }
}
