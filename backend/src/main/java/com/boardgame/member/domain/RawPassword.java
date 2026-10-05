package com.boardgame.member.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;

public final class RawPassword {

    private static final int MIN_LENGTH = 8;
    private static final int MAX_LENGTH = 64;

    private final String value;

    private RawPassword(String value) {
        this.value = value;
    }

    public static RawPassword of(String value) {
        if (value == null || value.length() < MIN_LENGTH || value.length() > MAX_LENGTH) {
            throw new BusinessException(ErrorCode.INVALID_PASSWORD);
        }
        return new RawPassword(value);
    }

    public static RawPassword unchecked(String value) {
        if (value == null) {
            return new RawPassword("");
        }
        return new RawPassword(value);
    }

    public String value() {
        return value;
    }

    @Override
    public String toString() {
        return "RawPassword[****]";
    }
}
