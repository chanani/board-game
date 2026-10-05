package com.boardgame.common.error;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class BusinessExceptionTest {

    @Test
    void 에러_코드의_메시지를_예외_메시지로_쓴다() {
        BusinessException exception = new BusinessException(ErrorCode.NOT_YOUR_TURN);

        assertThat(exception).isInstanceOf(RuntimeException.class)
                .hasMessage("지금은 당신의 차례가 아닙니다.");
        assertThat(exception.errorCode()).isEqualTo(ErrorCode.NOT_YOUR_TURN);
    }

    @Test
    void 에러_코드는_HTTP_상태와_코드_문자열을_가진다() {
        assertThat(ErrorCode.NOT_YOUR_TURN.status()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(ErrorCode.NOT_YOUR_TURN.code()).isEqualTo("NOT_YOUR_TURN");
        assertThat(ErrorCode.INTERNAL_ERROR.status()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
