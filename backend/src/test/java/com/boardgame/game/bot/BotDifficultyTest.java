package com.boardgame.game.bot;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import org.junit.jupiter.api.Test;

class BotDifficultyTest {

    @Test
    void R8_난이도_글자를_읽고_모르는_값은_INVALID_INPUT() {
        assertThat(BotDifficulty.parse("EASY")).isEqualTo(BotDifficulty.EASY);
        assertThat(BotDifficulty.parse("MEDIUM")).isEqualTo(BotDifficulty.MEDIUM);
        assertThat(BotDifficulty.parse("HARD")).isEqualTo(BotDifficulty.HARD);
        assertError(() -> BotDifficulty.parse("hard"), ErrorCode.INVALID_INPUT);
        assertError(() -> BotDifficulty.parse(null), ErrorCode.INVALID_INPUT);
    }
}
