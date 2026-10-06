package com.boardgame.uno;

// 단계가 시작될 때마다 1씩 오르는 순번. 마감은 이 값이 바뀔 때만 다시 잰다(스펙 3.3).
public record StageSeq(long value) {

    public static StageSeq first() {
        return new StageSeq(1L);
    }

    public StageSeq next() {
        return new StageSeq(value + 1);
    }
}
