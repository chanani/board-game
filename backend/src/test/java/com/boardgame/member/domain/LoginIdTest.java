package com.boardgame.member.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class LoginIdTest {

    @Test
    void 영문과_숫자_4자에서_20자까지_허용한다() {
        assertThat(new LoginId("abcd").value()).isEqualTo("abcd");
        assertThat(new LoginId("alice01").value()).isEqualTo("alice01");
        assertThat(new LoginId("a".repeat(20)).value()).hasSize(20);
    }

    @Test
    void 대문자는_소문자로_바꿔_저장한다() {
        assertThat(new LoginId("Alice01")).isEqualTo(new LoginId("alice01"));
        assertThat(new LoginId("Alice01").value()).isEqualTo("alice01");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"abc", "aaaaaaaaaaaaaaaaaaaaa", "앨리스1234", "alice 01", "alice_01"})
    void 형식에_맞지_않으면_INVALID_LOGIN_ID(String value) {
        assertError(() -> new LoginId(value), ErrorCode.INVALID_LOGIN_ID);
    }
}
