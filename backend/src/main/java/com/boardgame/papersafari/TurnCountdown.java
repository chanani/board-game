package com.boardgame.papersafari;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

// 행동을 기다리기 시작한 시각을 기억하고, 15초 마감을 계산한다. 차례가 넘어가거나 단계가 나아갈 때 다시 잰다.
public class TurnCountdown {

    public static final Duration LIMIT = Duration.ofSeconds(15);

    private final Clock clock;
    private Instant awaitingSince;

    public TurnCountdown(Clock clock) {
        this.clock = clock;
        this.awaitingSince = clock.instant();
    }

    public void restart() {
        awaitingSince = clock.instant();
    }

    public Instant awaitingSince() {
        return awaitingSince;
    }

    public Instant deadline() {
        return awaitingSince.plus(LIMIT);
    }

    public TurnTiming timing(boolean waiting) {
        long now = clock.millis();
        if (!waiting) {
            return new TurnTiming(null, now);
        }
        return new TurnTiming(deadline().toEpochMilli(), now);
    }
}
