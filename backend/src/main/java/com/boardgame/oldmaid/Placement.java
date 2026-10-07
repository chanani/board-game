package com.boardgame.oldmaid;

// R31
public enum Placement {
    FINISHED, THIEF, LAST_STANDING, FORFEITED;

    // 끝낸 사람이 하나도 없으면(모두 기권) 마지막 사람은 1등인 남은 승자다(D9).
    static Placement lastHolder(boolean anyoneFinished) {
        if (anyoneFinished) {
            return THIEF;
        }
        return LAST_STANDING;
    }
}
