package com.boardgame.member.domain;

public class FakePasswordEncryptor implements PasswordEncryptor {

    @Override
    public PasswordHash encrypt(RawPassword password) {
        return new PasswordHash("hashed:" + password.value());
    }

    @Override
    public boolean matches(RawPassword password, PasswordHash hash) {
        return encrypt(password).equals(hash);
    }
}
