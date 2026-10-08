package com.boardgame.game.bot;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.support.FixedRandom;
import java.time.Duration;
import java.util.Random;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class ThinkTimeTest {

    @Test
    void R19_생각_시간은_0_8초에서_1_8초_사이다() {
        Random random = new Random(7);

        IntStream.range(0, 500).mapToObj(index -> ThinkTime.standard(random))
                .forEach(delay -> assertThat(delay).isBetween(Duration.ofMillis(800), Duration.ofMillis(1800)));
        assertThat(ThinkTime.standard(new FixedRandom(0))).isEqualTo(Duration.ofMillis(800));
        assertThat(ThinkTime.between(new FixedRandom(1000), 2500, 5000)).isEqualTo(Duration.ofMillis(3500));
    }
}
