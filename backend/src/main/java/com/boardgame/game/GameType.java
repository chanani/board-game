package com.boardgame.game;

public enum GameType {
    PAPER_SAFARI("페이퍼 사파리", 2, 5),
    UNO("우노", 2, 5),
    OLD_MAID("도둑잡기", 2, 6);

    private final String displayName;
    private final int minPlayers;
    private final int maxPlayers;

    GameType(String displayName, int minPlayers, int maxPlayers) {
        this.displayName = displayName;
        this.minPlayers = minPlayers;
        this.maxPlayers = maxPlayers;
    }

    public String displayName() {
        return displayName;
    }

    public int minPlayers() {
        return minPlayers;
    }

    public int maxPlayers() {
        return maxPlayers;
    }
}
