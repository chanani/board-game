package com.boardgame.oldmaid.view;

public record OldMaidSessionView(String gameType, OldMaidView game) {

    public static final String GAME_TYPE = "OLD_MAID";

    public OldMaidSessionView(OldMaidView game) {
        this(GAME_TYPE, game);
    }
}
