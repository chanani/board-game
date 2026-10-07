package com.boardgame.common.error;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class OldMaidErrorCodeTest {

    @Test
    void 도둑잡기_오류_코드의_상태와_문구() {
        assertThat(ErrorCode.OLD_MAID_INVALID_PLAYER_COUNT.status()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ErrorCode.OLD_MAID_INVALID_PLAYER_COUNT.message()).isEqualTo("도둑잡기는 2~6명이 플레이할 수 있습니다.");
        assertThat(ErrorCode.OLD_MAID_INVALID_SLOT.status()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ErrorCode.OLD_MAID_INVALID_SLOT.message()).isEqualTo("고를 수 없는 카드 자리예요.");
        assertThat(ErrorCode.OLD_MAID_SHUFFLE_NOT_ALLOWED.status()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(ErrorCode.OLD_MAID_SHUFFLE_NOT_ALLOWED.message()).isEqualTo("지금은 손패를 섞을 수 없어요.");
        assertThat(ErrorCode.OLD_MAID_SHUFFLE_TOO_FAST.status()).isEqualTo(HttpStatus.TOO_MANY_REQUESTS);
        assertThat(ErrorCode.OLD_MAID_SHUFFLE_TOO_FAST.message()).isEqualTo("조금 뒤에 다시 섞을 수 있어요.");
    }

    @Test
    void 최대_인원_오류는_게임마다_다른_범위를_말하지_않는다() {
        assertThat(ErrorCode.INVALID_CAPACITY.message()).isEqualTo("이 게임에서 고를 수 없는 최대 인원이에요.");
    }
}
