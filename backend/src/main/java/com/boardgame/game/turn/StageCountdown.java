package com.boardgame.game.turn;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.function.Function;

// 결정 단계의 키(우노 StageSeq, 도둑잡기 TurnStep)가 바뀔 때만 다시 재는 마감. 같은 키면 그대로 둔다.
// 단계마다 시간이 다르면(도둑잡기 처음 버리기 30초) 키로 시간을 고른다.
public class StageCountdown<K> {

    private final Clock clock;
    private final Function<K, Duration> limits;
    private StageStart<K> current;

    public StageCountdown(Clock clock, Duration limit, K start) {
        this(clock, key -> limit, start);
    }

    public StageCountdown(Clock clock, Function<K, Duration> limits, K start) {
        this.clock = clock;
        this.limits = limits;
        this.current = new StageStart<>(start, clock.instant());
    }

    public void follow(K key) {
        if (current.isFor(key)) {
            return;
        }
        current = new StageStart<>(key, clock.instant());
    }

    public Instant deadline() {
        Duration limit = limits.apply(current.key());
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
