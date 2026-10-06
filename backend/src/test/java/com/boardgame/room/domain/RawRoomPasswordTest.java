package com.boardgame.room.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import org.junit.jupiter.api.Test;

class RawRoomPasswordTest {

    @Test
    void 네_자에서_스무_자까지_받는다() {
        assertThat(new RawRoomPassword("1234").value()).isEqualTo("1234");
        assertThat(new RawRoomPassword("a".repeat(20)).value()).hasSize(20);
    }

    @Test
    void 범위를_벗어나거나_비면_거부한다() {
        assertError(() -> new RawRoomPassword("123"), ErrorCode.INVALID_ROOM_PASSWORD);
        assertError(() -> new RawRoomPassword("a".repeat(21)), ErrorCode.INVALID_ROOM_PASSWORD);
        assertError(() -> new RawRoomPassword("   "), ErrorCode.INVALID_ROOM_PASSWORD);
    }

    @Test
    void 앞뒤_공백은_뗀다() {
        assertThat(new RawRoomPassword("  abcd  ").value()).isEqualTo("abcd");
    }
}
