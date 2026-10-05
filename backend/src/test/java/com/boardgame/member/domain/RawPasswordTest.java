package com.boardgame.member.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class RawPasswordTest {

    @Test
    void 가입용_비밀번호는_8자에서_64자까지_허용한다() {
        assertThat(RawPassword.of("password").value()).isEqualTo("password");
        assertThat(RawPassword.of("p".repeat(64)).value()).hasSize(64);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"short12"})
    void 가입용_비밀번호가_짧으면_INVALID_PASSWORD(String value) {
        assertError(() -> RawPassword.of(value), ErrorCode.INVALID_PASSWORD);
    }

    @Test
    void 가입용_비밀번호가_64자를_넘으면_INVALID_PASSWORD() {
        assertError(() -> RawPassword.of("p".repeat(65)), ErrorCode.INVALID_PASSWORD);
    }

    @Test
    void 로그인용_비밀번호는_검증하지_않고_null은_빈_문자열이다() {
        assertThat(RawPassword.unchecked("abc").value()).isEqualTo("abc");
        assertThat(RawPassword.unchecked(null).value()).isEmpty();
    }

    @Test
    void 문자열로_바꿔도_원문이_드러나지_않는다() {
        assertThat(RawPassword.of("password1").toString()).doesNotContain("password1");
    }
}
