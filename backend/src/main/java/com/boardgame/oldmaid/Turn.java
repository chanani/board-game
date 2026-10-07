package com.boardgame.oldmaid;

// 지금 뽑는 사람과 그 상대(R11), 차례 순번과 단계(뽑기·짝 버리기).
public record Turn(PlayerId drawer, PlayerId target, TurnStep step) {

    public boolean isDrawer(PlayerId player) {
        return drawer.equals(player);
    }

    public TurnSeq seq() {
        return step.seq();
    }

    public boolean is(OldMaidStage stage) {
        return step.is(stage);
    }

    // R37: 같은 차례에서 짝 버리기 단계로.
    Turn discarding() {
        return new Turn(drawer, target, step.discarding());
    }

    // R27: 짝 버리기 단계에서 상대만 바뀌면 순번·단계(마감)는 그대로다.
    Turn withTarget(PlayerId next) {
        return new Turn(drawer, next, step);
    }
}
