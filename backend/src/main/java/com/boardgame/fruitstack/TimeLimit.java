package com.boardgame.fruitstack;

import java.time.Instant;

// R17: 대결은 시작 + 10분에 지금 점수로 끝난다. 어떤 행동으로도 바뀌지 않는다.
public final class TimeLimit implements MatchLimit {

    private final Instant limitAt;

    TimeLimit(Instant limitAt) {
        this.limitAt = limitAt;
    }

    @Override
    public Instant deadline() {
        return limitAt;
    }

    @Override
    public void touch(Instant at) {
        // 상한은 움직이지 않는다.
    }

    @Override
    public FruitStackEndReason reason() {
        return FruitStackEndReason.TIME_UP;
    }

    @Override
    public boolean isShown() {
        return true;
    }
}
