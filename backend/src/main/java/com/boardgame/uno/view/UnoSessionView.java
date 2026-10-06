package com.boardgame.uno.view;

public record UnoSessionView(String gameType, UnoView game) {

    public static final String GAME_TYPE = "UNO";

    public UnoSessionView(UnoView game) {
        this(GAME_TYPE, game);
    }
}
