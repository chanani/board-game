package com.boardgame.game;

// 클라이언트가 보내는 행동. 페이퍼 사파리는 column/row, 우노는 cardId/color/targetId를 쓴다. 없는 칸은 null.
public record GameAction(String type, Integer column, Integer row, Integer cardId, String color, Long targetId) {

    public GameAction(String type, Integer column, Integer row) {
        this(type, column, row, null, null, null);
    }
}
