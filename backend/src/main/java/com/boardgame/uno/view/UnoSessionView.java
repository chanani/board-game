package com.boardgame.uno.view;

import com.boardgame.game.ClockFreeView;

public record UnoSessionView(String gameType, UnoView game) implements ClockFreeView {

    public static final String GAME_TYPE = "UNO";

    public UnoSessionView(UnoView game) {
        this(GAME_TYPE, game);
    }

    // R19: 컴퓨터의 결정 비교용(서버 시각을 뺀 같은 화면).
    @Override
    public UnoSessionView withoutClock() {
        return new UnoSessionView(gameType, game.withoutClock());
    }
}
