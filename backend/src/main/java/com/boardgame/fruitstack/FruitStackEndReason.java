package com.boardgame.fruitstack;

// R26·R30·S4: 끝난 이유. FORFEIT(상대가 모두 나가 혼자 남음, 혼자 하기에서는 내가 나감)과
// ABANDONED(혼자 하기가 5분 동안 아무 보고 없이 버려짐)는 라운드 기록을 남기지 않는다.
public enum FruitStackEndReason {
    ALL_OUT, DECIDED, TIME_UP, FORFEIT, ABANDONED;

    public boolean recordsRound() {
        return this != FORFEIT && this != ABANDONED;
    }
}
