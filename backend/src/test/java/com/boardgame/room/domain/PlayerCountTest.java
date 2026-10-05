package com.boardgame.room.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import org.junit.jupiter.api.Test;

class PlayerCountTest {

    @Test
    void 인원을_더한다() {
        assertThat(PlayerCount.of(2).plus(PlayerCount.of(3))).isEqualTo(PlayerCount.of(5));
        assertThat(PlayerCount.zero().value()).isZero();
    }

    @Test
    void 음수_인원은_만들_수_없다() {
        assertError(() -> PlayerCount.of(-1), ErrorCode.INVALID_PLAYER_TOTAL);
    }
}
