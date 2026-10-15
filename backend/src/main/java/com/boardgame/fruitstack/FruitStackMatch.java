package com.boardgame.fruitstack;

import java.time.Instant;

// 씨앗, 경기 시각, 서버가 끝내러 오는 마감 묶음(필드 수 제한).
public record FruitStackMatch(Seed seed, MatchClock clock, MatchLimit limit) {

    static FruitStackMatch start(Seed seed, MatchClock clock, int players) {
        return new FruitStackMatch(seed, clock, MatchLimit.forPlayers(players, clock));
    }

    ScoreCeiling ceiling() {
        return ScoreCeiling.at(clock.elapsed());
    }

    void touch() {
        limit.touch(clock.now());
    }

    boolean isExpired() {
        return limit.isReached(clock.now());
    }

    Instant deadline() {
        return limit.deadline();
    }
}
