package com.boardgame.papersafari;

// 이번 차례에 가져오기를 되돌린 적이 있는지 기억한다. 차례가 바뀌면 더는 해당하지 않는다.
public record CancelMark(TurnStage turn) {

    public static CancelMark none() {
        return new CancelMark(null);
    }

    public static CancelMark on(TurnStage turn) {
        return new CancelMark(turn);
    }

    public boolean covers(TurnStage stage) {
        return turn != null && stage.sameTurnAs(turn);
    }
}
