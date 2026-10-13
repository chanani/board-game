package com.boardgame.fruitstack.view;

// /user/queue/signal로 방의 모두에게 가는 판 신호(R24). board는 서버가 풀어 보지 않은 그대로다.
public record FruitStackBoardSignal(String gameType, String type, long startedAt, long playerId, long seq,
                                    String board) {

    public static FruitStackBoardSignal of(long startedAt, long playerId, long seq, String board) {
        return new FruitStackBoardSignal(FruitStackSessionView.GAME_TYPE, "BOARD", startedAt, playerId, seq, board);
    }
}
