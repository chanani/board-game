package com.boardgame.fruitstack;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.Test;

class ScoreCeilingTest {

    @Test
    void R19_상한은_22_곱하기_경과를_500ms로_나눈_몫_더하기_5() {
        assertThat(ScoreCeiling.at(Duration.ZERO).value()).isEqualTo(110);
        assertThat(ScoreCeiling.at(Duration.ofMillis(499)).value()).isEqualTo(110);
        assertThat(ScoreCeiling.at(Duration.ofMillis(500)).value()).isEqualTo(132);
        assertThat(ScoreCeiling.at(Duration.ofMinutes(10)).value()).isEqualTo(26510);
        assertThat(ScoreCeiling.at(Duration.ofMillis(-30)).value()).isEqualTo(110);
    }

    @Test
    void R19_상한과_같은_점수는_넘지_않은_것이다() {
        assertThat(new Score(110).exceeds(ScoreCeiling.at(Duration.ZERO))).isFalse();
        assertThat(new Score(111).exceeds(ScoreCeiling.at(Duration.ZERO))).isTrue();
    }
}
