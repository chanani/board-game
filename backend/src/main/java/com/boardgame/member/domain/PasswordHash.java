package com.boardgame.member.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.util.Objects;

@Embeddable
public class PasswordHash {

    @Column(name = "password_hash", nullable = false, length = 100)
    private String value;

    protected PasswordHash() {
    }

    public PasswordHash(String value) {
        this.value = value;
    }

    public String value() {
        return value;
    }

    @Override
    public boolean equals(Object other) {
        if (!(other instanceof PasswordHash that)) {
            return false;
        }
        return Objects.equals(value, that.value);
    }

    @Override
    public int hashCode() {
        return Objects.hashCode(value);
    }
}
