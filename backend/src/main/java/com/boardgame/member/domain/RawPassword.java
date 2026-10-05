package com.boardgame.member.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.nio.charset.StandardCharsets;

public final class RawPassword {

    private static final int MIN_LENGTH = 8;
    private static final int MAX_LENGTH = 64;
    private static final int MAX_BYTES = 72;

    private final String value;

    private RawPassword(String value) {
        this.value = value;
    }

    public static RawPassword of(String value) {
        if (isOutOfRange(value)) {
            throw new BusinessException(ErrorCode.INVALID_PASSWORD);
        }
        RawPassword password = new RawPassword(value);
        if (password.exceedsBcryptLimit()) {
            throw new BusinessException(ErrorCode.INVALID_PASSWORD);
        }
        return password;
    }

    private static boolean isOutOfRange(String value) {
        if (value == null) {
            return true;
        }
        return value.length() < MIN_LENGTH || value.length() > MAX_LENGTH;
    }

    public boolean exceedsBcryptLimit() {
        return value.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES;
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
