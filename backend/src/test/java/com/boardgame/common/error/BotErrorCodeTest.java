package com.boardgame.common.error;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class BotErrorCodeTest {

    @Test
    void BOT_NOT_FOUND는_404와_안내_문구다() {
        assertThat(ErrorCode.BOT_NOT_FOUND.status()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(ErrorCode.BOT_NOT_FOUND.message()).isEqualTo("컴퓨터를 찾을 수 없어요.");
    }
}
