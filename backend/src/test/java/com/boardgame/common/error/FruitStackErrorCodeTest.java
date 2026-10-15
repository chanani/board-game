package com.boardgame.common.error;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameType;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class FruitStackErrorCodeTest {

    @Test
    void 수박게임_오류_코드의_상태와_문구() {
        assertThat(ErrorCode.FRUIT_STACK_INVALID_PLAYER_COUNT.status()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ErrorCode.FRUIT_STACK_INVALID_PLAYER_COUNT.message()).isEqualTo("수박게임은 2~5명이 플레이할 수 있습니다.");
        assertThat(ErrorCode.FRUIT_STACK_SCORE_REJECTED.status()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(ErrorCode.FRUIT_STACK_SCORE_REJECTED.message()).isEqualTo("점수를 반영할 수 없어요.");
        assertThat(ErrorCode.BOTS_NOT_SUPPORTED.status()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(ErrorCode.BOTS_NOT_SUPPORTED.message()).isEqualTo("이 게임은 컴퓨터와 할 수 없어요.");
    }

    @Test
    void 수박게임은_2명에서_5명이고_컴퓨터를_받지_않는다() {
        assertThat(GameType.FRUIT_STACK.displayName()).isEqualTo("수박게임");
        assertThat(GameType.FRUIT_STACK.minPlayers()).isEqualTo(2);
        assertThat(GameType.FRUIT_STACK.maxPlayers()).isEqualTo(5);
        assertThat(GameType.FRUIT_STACK.supportsBots()).isFalse();
        assertThat(GameType.PAPER_SAFARI.supportsBots()).isTrue();
        assertThat(GameType.UNO.supportsBots()).isTrue();
        assertThat(GameType.OLD_MAID.supportsBots()).isTrue();
        assertThat(GameType.values()[3]).isEqualTo(GameType.FRUIT_STACK);
    }
}
