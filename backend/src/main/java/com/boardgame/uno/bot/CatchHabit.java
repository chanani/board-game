package com.boardgame.uno.bot;

import com.boardgame.game.bot.ThinkTime;
import java.time.Duration;
import java.util.Random;

// R30·R31·R32: 남이 우노를 안 외친 것을 봤을 때 잡을 확률(%)과 잡는 데 걸리는 시간 범위.
record CatchHabit(int percent, int minMillis, int maxMillis) {

    boolean tries(Random random) {
        return random.nextInt(100) < percent;
    }

    Duration delay(Random random) {
        return ThinkTime.between(random, minMillis, maxMillis);
    }
}
