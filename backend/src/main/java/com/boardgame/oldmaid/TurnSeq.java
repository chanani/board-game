package com.boardgame.oldmaid;

// 차례가 새로 시작할 때마다 1씩 오르는 순번. 마감은 이 값이 바뀔 때만 다시 잰다(R34).
public record TurnSeq(long value) {

    public static TurnSeq first() {
        return new TurnSeq(1L);
    }

    public TurnSeq next() {
        return new TurnSeq(value + 1);
    }
}
