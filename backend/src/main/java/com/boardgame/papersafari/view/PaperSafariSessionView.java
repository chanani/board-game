package com.boardgame.papersafari.view;

import com.boardgame.game.ClockFreeView;

// gameType은 프론트가 받은 화면만 보고 게임 종류를 고르게 하는 구분자다(칸이 늘기만 해 예전 화면과 호환된다).
public record PaperSafariSessionView(String gameType, PaperSafariView game) implements ClockFreeView {

    public static final String GAME_TYPE = "PAPER_SAFARI";

    public PaperSafariSessionView(PaperSafariView game) {
        this(GAME_TYPE, game);
    }

    // R19: 컴퓨터의 결정 비교용(서버 시각을 뺀 같은 화면).
    @Override
    public PaperSafariSessionView withoutClock() {
        return new PaperSafariSessionView(gameType, game.withoutClock());
    }
}
