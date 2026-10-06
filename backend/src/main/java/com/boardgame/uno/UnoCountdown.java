// B/uno/UnoCountdown.java
package com.boardgame.uno;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

// D14·D15: 단계 순번(StageSeq)이 바뀔 때만 다시 재는 15초 마감. 외치기·잡기·남의 기권은 순번을 바꾸지 않는다.
public class UnoCountdown {

    public static final Duration LIMIT = Duration.ofSeconds(15);

    private final Clock clock;
    private Instant awaitingSince;
    private StageSeq followed;

    public UnoCountdown(Clock clock, StageSeq start) {
        this.clock = clock;
        this.awaitingSince = clock.instant();
        this.followed = start;
    }

    public void follow(StageSeq now) {
        if (now.equals(followed)) {
            return;
        }
        followed = now;
        awaitingSince = clock.instant();
    }

    public Instant deadline() {
        return awaitingSince.plus(LIMIT);
    }

    public UnoTiming timing(boolean waiting) {
        long now = clock.millis();
        if (!waiting) {
            return new UnoTiming(null, now);
        }
        return new UnoTiming(deadline().toEpochMilli(), now);
    }
}
