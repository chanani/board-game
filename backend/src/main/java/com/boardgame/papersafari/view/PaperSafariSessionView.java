package com.boardgame.papersafari.view;

// gameType은 프론트가 받은 화면만 보고 게임 종류를 고르게 하는 구분자다(칸이 늘기만 해 예전 화면과 호환된다).
public record PaperSafariSessionView(String gameType, PaperSafariView game) {

    public static final String GAME_TYPE = "PAPER_SAFARI";

    public PaperSafariSessionView(PaperSafariView game) {
        this(GAME_TYPE, game);
    }
}
