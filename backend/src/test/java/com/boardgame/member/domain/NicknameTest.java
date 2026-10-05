package com.boardgame.member.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class NicknameTest {

    @Test
    void 두_자에서_열_자까지_허용한다() {
        assertThat(new Nickname("철수").value()).isEqualTo("철수");
        assertThat(new Nickname("가나다라마바사아자차").value()).hasSize(10);
    }

    @Test
    void 앞뒤_공백은_제거한다() {
        assertThat(new Nickname("  앨리스  ")).isEqualTo(new Nickname("앨리스"));
        assertThat(new Nickname("  앨리스  ").value()).isEqualTo("앨리스");
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"가", "   ", "가나다라마바사아자차카"})
    void 길이가_맞지_않으면_INVALID_NICKNAME(String value) {
        assertError(() -> new Nickname(value), ErrorCode.INVALID_NICKNAME);
    }
}
