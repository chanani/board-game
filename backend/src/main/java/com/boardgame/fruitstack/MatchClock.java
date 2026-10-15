package com.boardgame.fruitstack;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

// R17: 경기 시각. 상한은 시작 + 10분.
public class MatchClock {

    public static final Duration LIMIT = Duration.ofMinutes(10);

    private final Clock clock;
    private final Instant startedAt;

    public MatchClock(Clock clock) {
        this.clock = clock;
        this.startedAt = clock.instant();
    }

    public Instant startedAt() {
        return startedAt;
    }

    public Instant now() {
        return clock.instant();
    }

    public Duration elapsed() {
        return Duration.between(startedAt, now());
    }

    public Instant limitAt() {
        return startedAt.plus(LIMIT);
    }
}
