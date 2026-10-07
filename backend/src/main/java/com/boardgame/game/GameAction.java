package com.boardgame.game;

import java.util.List;

// 클라이언트가 보내는 행동·신호. 페이퍼 사파리는 column/row, 우노는 cardId/color/targetId, 도둑잡기는 index·cardIds를 쓴다.
// 없는 칸은 null.
public record GameAction(String type, Integer column, Integer row, Integer cardId, String color, Long targetId,
                         Integer index, List<Integer> cardIds) {

    public GameAction(String type, Integer column, Integer row) {
        this(type, column, row, null, null, null, null, null);
    }

    public GameAction(String type, Integer column, Integer row, Integer cardId, String color, Long targetId) {
        this(type, column, row, cardId, color, targetId, null, null);
    }

    public GameAction(String type, Integer column, Integer row, Integer cardId, String color, Long targetId,
                      Integer index) {
        this(type, column, row, cardId, color, targetId, index, null);
    }
}
