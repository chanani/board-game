package com.boardgame.oldmaid.view;

import com.boardgame.game.ClockFreeView;

public record OldMaidSessionView(String gameType, OldMaidView game) implements ClockFreeView {

    public static final String GAME_TYPE = "OLD_MAID";

    public OldMaidSessionView(OldMaidView game) {
        this(GAME_TYPE, game);
    }

    // R19: 컴퓨터의 결정 비교용(서버 시각을 뺀 같은 화면).
    @Override
    public OldMaidSessionView withoutClock() {
        return new OldMaidSessionView(gameType, game.withoutClock());
    }
}
