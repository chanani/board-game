package com.boardgame.fruitstack;

import java.time.Duration;
import java.time.Instant;
import java.util.OptionalLong;

// R24: 한 사람의 판 신호 문. 마지막으로 받아 준 시각에서 200ms가 지나야 다음을 받는다. 순번은 받을 때만 오른다.
public class SnapshotGate {

    static final Duration MIN_GAP = Duration.ofMillis(200);

    private Instant lastAt = Instant.EPOCH;
    private long seq;

    OptionalLong tryPass(Instant now) {
        Instant opensAt = lastAt.plus(MIN_GAP);
        if (now.isBefore(opensAt)) {
            return OptionalLong.empty();
        }
        lastAt = now;
        seq++;
        return OptionalLong.of(seq);
    }
}
