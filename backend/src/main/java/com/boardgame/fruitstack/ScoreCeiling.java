package com.boardgame.fruitstack;

import java.time.Duration;

// R19·D6: 떨어뜨린 과일 하나가 낼 수 있는 점수는 22를 넘지 못하고, 쿨다운 500ms라 떨어뜨린 횟수는 경과÷500+1을 넘지 못한다. 여유 4번.
public record ScoreCeiling(long value) {

    private static final long PER_DROP = 22;
    private static final long DROP_GAP_MS = 500;
    private static final long GRACE_DROPS = 5;

    public static ScoreCeiling at(Duration elapsed) {
        long elapsedMs = Math.max(0, elapsed.toMillis());
        return new ScoreCeiling(PER_DROP * (elapsedMs / DROP_GAP_MS + GRACE_DROPS));
    }

    boolean isBelow(int score) {
        return value < score;
    }
}
