package com.boardgame.room.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class RoomNameTest {

    @Test
    void 앞뒤_공백을_지우고_20자까지_허용한다() {
        assertThat(new RoomName("  즐거운 방  ").value()).isEqualTo("즐거운 방");
        assertThat(new RoomName("가".repeat(20)).value()).hasSize(20);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "가가가가가가가가가가가가가가가가가가가가가"})
    void 길이가_맞지_않으면_INVALID_ROOM_NAME(String value) {
        assertError(() -> new RoomName(value), ErrorCode.INVALID_ROOM_NAME);
    }
}
