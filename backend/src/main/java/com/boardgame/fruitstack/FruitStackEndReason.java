package com.boardgame.fruitstack;

// R26·R30: 끝난 이유. FORFEIT(상대가 모두 나가 혼자 남음)만 라운드 기록을 남기지 않는다.
public enum FruitStackEndReason {
    ALL_OUT, DECIDED, TIME_UP, FORFEIT;

    public boolean recordsRound() {
        return this != FORFEIT;
    }
}
