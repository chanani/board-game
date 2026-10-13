package com.boardgame.fruitstack;

// 씨앗과 경기 시각 묶음(필드 수 제한).
public record FruitStackMatch(Seed seed, MatchClock clock) {

    ScoreCeiling ceiling() {
        return ScoreCeiling.at(clock.elapsed());
    }
}
