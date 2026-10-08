package com.boardgame.game.bot;

import java.time.Duration;
import java.util.Random;

// R19: 생각 시간은 난이도와 무관하게 0.8~1.8초. between은 따로 정한 범위(우노 잡기, 도둑잡기 신호·하의 처음 버리기)에 쓴다.
public final class ThinkTime {

    private static final int MIN_MILLIS = 800;
    private static final int MAX_MILLIS = 1800;

    private ThinkTime() {
    }

    public static Duration standard(Random random) {
        return between(random, MIN_MILLIS, MAX_MILLIS);
    }

    public static Duration between(Random random, int minMillis, int maxMillis) {
        return Duration.ofMillis(minMillis + random.nextInt(maxMillis - minMillis + 1));
    }
}
