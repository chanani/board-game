package com.boardgame.oldmaid.bot;

import java.time.Instant;

// 마지막으로 섞은 때와 그 차례. 서버 쿨다운(1초)에 여유를 둬 1.1초가 지나야 한다.
final class ShuffleMemory {

    private static final long COOLDOWN_MILLIS = 1100;

    private Instant last = Instant.MIN;
    private long turnSeq = -1;

    boolean cooled(Instant at) {
        return !at.isBefore(last.plusMillis(COOLDOWN_MILLIS));
    }

    boolean shuffledIn(long seq) {
        return turnSeq == seq;
    }

    void remember(Instant at, long seq) {
        this.last = at;
        this.turnSeq = seq;
    }
}
