package com.boardgame.member.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Embedded;

@Embeddable
public class Credentials {

    @Embedded
    private LoginId loginId;

    @Embedded
    private PasswordHash passwordHash;

    protected Credentials() {
    }

    private Credentials(LoginId loginId, PasswordHash passwordHash) {
        this.loginId = loginId;
        this.passwordHash = passwordHash;
    }

    static Credentials of(LoginId loginId, PasswordHash passwordHash) {
        return new Credentials(loginId, passwordHash);
    }

    void verify(RawPassword password, PasswordEncryptor encryptor) {
        if (!encryptor.matches(password, passwordHash)) {
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }
    }

    String loginIdValue() {
        return loginId.value();
    }
}
