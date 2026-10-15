package com.boardgame.fruitstack;

import java.time.Duration;
import java.time.Instant;

// S4: 혼자 하기는 상한이 없다. 받아 준 보고·판 신호가 5분 동안 없으면 버려진 게임으로 보고 지금 점수로 끝낸다.
public final class IdleLimit implements MatchLimit {

    public static final Duration IDLE = Duration.ofMinutes(5);

    private Instant lastSeen;

    IdleLimit(Instant startedAt) {
        this.lastSeen = startedAt;
    }

    @Override
    public Instant deadline() {
        return lastSeen.plus(IDLE);
    }

    @Override
    public void touch(Instant at) {
        if (at.isAfter(lastSeen)) {
            lastSeen = at;
        }
    }

    @Override
    public FruitStackEndReason reason() {
        return FruitStackEndReason.ABANDONED;
    }

    @Override
    public boolean isShown() {
        return false;
    }
}
