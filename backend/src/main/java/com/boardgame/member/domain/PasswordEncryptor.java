package com.boardgame.member.domain;

public interface PasswordEncryptor {

    PasswordHash encrypt(RawPassword password);

    boolean matches(RawPassword password, PasswordHash hash);
}
