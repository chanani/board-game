package com.boardgame.oldmaid;

// 지금 뽑는 사람과 그 상대(R11), 차례 순번.
public record Turn(PlayerId drawer, PlayerId target, TurnSeq seq) {

    public boolean isDrawer(PlayerId player) {
        return drawer.equals(player);
    }
}
