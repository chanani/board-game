package com.boardgame.fruitstack;

import java.time.Instant;

// 서버가 경기를 끝내러 오는 마감. 대결은 R17의 10분 상한, 혼자 하기는 S4의 방치 마감.
public sealed interface MatchLimit permits TimeLimit, IdleLimit {

    int SOLO = 1;

    static MatchLimit forPlayers(int count, MatchClock clock) {
        if (count == SOLO) {
            return new IdleLimit(clock.startedAt());
        }
        return new TimeLimit(clock.limitAt());
    }

    Instant deadline();

    // 받아 준 점수·탈락 보고와 판 신호.
    void touch(Instant at);

    FruitStackEndReason reason();

    // 화면에 남은 시간으로 보이는 마감인지(대결의 상한만).
    boolean isShown();

    default boolean isReached(Instant now) {
        Instant deadline = deadline();
        return !deadline.isAfter(now);
    }
}
