package com.boardgame.member.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.util.Objects;

@Embeddable
public class Nickname {

    private static final int MIN_LENGTH = 2;
    private static final int MAX_LENGTH = 10;

    @Column(name = "nickname", nullable = false, unique = true, length = MAX_LENGTH)
    private String value;

    protected Nickname() {
    }

    public Nickname(String value) {
        String stripped = stripOrEmpty(value);
        if (stripped.length() < MIN_LENGTH || stripped.length() > MAX_LENGTH) {
            throw new BusinessException(ErrorCode.INVALID_NICKNAME);
        }
        this.value = stripped;
    }

    private static String stripOrEmpty(String value) {
        if (value == null) {
            return "";
        }
        return value.strip();
    }

    public String value() {
        return value;
    }

    @Override
    public boolean equals(Object other) {
        if (!(other instanceof Nickname that)) {
            return false;
        }
        return Objects.equals(value, that.value);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(value);
    }
}
