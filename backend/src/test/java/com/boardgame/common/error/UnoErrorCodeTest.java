package com.boardgame.common.error;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class UnoErrorCodeTest {

    @Test
    void 우노_오류_코드의_상태와_문구() {
        assertThat(ErrorCode.UNO_INVALID_PLAYER_COUNT.statusCode()).isEqualTo(400);
        assertThat(ErrorCode.UNO_INVALID_PLAYER_COUNT.message()).isEqualTo("우노는 2~5명이 플레이할 수 있습니다.");
        assertThat(ErrorCode.UNO_CARD_NOT_IN_HAND.statusCode()).isEqualTo(400);
        assertThat(ErrorCode.UNO_CARD_NOT_IN_HAND.message()).isEqualTo("내 손에 없는 카드예요.");
        assertThat(ErrorCode.UNO_CARD_NOT_PLAYABLE.statusCode()).isEqualTo(409);
        assertThat(ErrorCode.UNO_CARD_NOT_PLAYABLE.message()).isEqualTo("지금 낼 수 없는 카드예요.");
        assertThat(ErrorCode.UNO_ONLY_DRAWN_CARD.statusCode()).isEqualTo(409);
        assertThat(ErrorCode.UNO_ONLY_DRAWN_CARD.message()).isEqualTo("방금 뽑은 카드만 낼 수 있어요.");
        assertThat(ErrorCode.UNO_COLOR_REQUIRED.statusCode()).isEqualTo(400);
        assertThat(ErrorCode.UNO_COLOR_REQUIRED.message()).isEqualTo("와일드 카드는 색을 골라야 해요.");
        assertThat(ErrorCode.UNO_INVALID_COLOR.statusCode()).isEqualTo(400);
        assertThat(ErrorCode.UNO_INVALID_COLOR.message()).isEqualTo("고를 수 없는 색이에요.");
        assertThat(ErrorCode.UNO_CALL_NOT_ALLOWED.statusCode()).isEqualTo(409);
        assertThat(ErrorCode.UNO_CALL_NOT_ALLOWED.message()).isEqualTo("지금은 우노를 외칠 수 없어요.");
        assertThat(ErrorCode.UNO_CATCH_CLOSED.statusCode()).isEqualTo(409);
        assertThat(ErrorCode.UNO_CATCH_CLOSED.message()).isEqualTo("지금은 우노를 잡을 수 없어요.");
    }
}
