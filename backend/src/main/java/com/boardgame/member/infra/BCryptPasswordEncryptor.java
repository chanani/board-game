package com.boardgame.member.infra;

import com.boardgame.member.domain.PasswordEncryptor;
import com.boardgame.member.domain.PasswordHash;
import com.boardgame.member.domain.RawPassword;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class BCryptPasswordEncryptor implements PasswordEncryptor {

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();

    @Override
    public PasswordHash encrypt(RawPassword password) {
        return new PasswordHash(encoder.encode(password.value()));
    }

    @Override
    public boolean matches(RawPassword password, PasswordHash hash) {
        if (password.exceedsBcryptLimit()) {
            return false;
        }
        return encoder.matches(password.value(), hash.value());
    }
}
