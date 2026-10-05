package com.boardgame.member.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.util.Locale;
import java.util.Objects;
import java.util.regex.Pattern;

@Embeddable
public class LoginId {

    private static final Pattern FORMAT = Pattern.compile("^[a-zA-Z0-9]{4,20}$");

    @Column(name = "login_id", nullable = false, unique = true, length = 20)
    private String value;

    protected LoginId() {
    }

    public LoginId(String value) {
        if (value == null || !FORMAT.matcher(value).matches()) {
            throw new BusinessException(ErrorCode.INVALID_LOGIN_ID);
        }
        this.value = value.toLowerCase(Locale.ROOT);
    }

    public String value() {
        return value;
    }

    @Override
    public boolean equals(Object other) {
        if (!(other instanceof LoginId that)) {
            return false;
        }
        return Objects.equals(value, that.value);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(value);
    }
}
