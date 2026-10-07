package com.boardgame.oldmaid;

// 마감을 다시 재는 단위: 차례 순번과 그 차례의 단계. 둘 중 하나라도 바뀌면 새 마감이다(R34·R38).
public record TurnStep(TurnSeq seq, OldMaidStage stage) {

    private static final TurnSeq OPENING_SEQ = new TurnSeq(0L);

    // 처음 버리기 단계는 차례가 아직 없어 순번 0이다. 첫 차례가 1(TurnSeq.first())이다.
    public static TurnStep opening() {
        return new TurnStep(OPENING_SEQ, OldMaidStage.OPENING_DISCARD);
    }

    public TurnStep nextTurn() {
        return new TurnStep(seq.next(), OldMaidStage.DRAW);
    }

    public TurnStep discarding() {
        return new TurnStep(seq, OldMaidStage.DISCARD);
    }

    public boolean is(OldMaidStage other) {
        return stage == other;
    }
}
