package com.boardgame.game.turn;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

// 결정 단계의 키(우노 StageSeq, 도둑잡기 TurnSeq)가 바뀔 때만 다시 재는 마감. 같은 키면 그대로 둔다.
public class StageCountdown<K> {

    private final Clock clock;
    private final Duration limit;
    private StageStart<K> current;

    public StageCountdown(Clock clock, Duration limit, K start) {
        this.clock = clock;
        this.limit = limit;
        this.current = new StageStart<>(start, clock.instant());
    }

    public void follow(K key) {
        if (current.isFor(key)) {
            return;
        }
        current = new StageStart<>(key, clock.instant());
    }

    public Instant deadline() {
        return current.since().plus(limit);
    }

    public Instant now() {
        return clock.instant();
    }

    public StageTiming timing(boolean waiting) {
        long now = clock.millis();
        if (!waiting) {
            return new StageTiming(null, now);
        }
        return new StageTiming(deadline().toEpochMilli(), now);
    }
}
