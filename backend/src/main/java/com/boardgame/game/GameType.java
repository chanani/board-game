package com.boardgame.game;

public enum GameType {
    PAPER_SAFARI("페이퍼 사파리", 2, 5),
    UNO("우노", 2, 5),
    OLD_MAID("도둑잡기", 2, 6),
    FRUIT_STACK("과일 쌓기", 2, 5);

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

    /** 과일 쌓기는 각자의 브라우저에서 물리가 돌아 서버가 대신 둘 수 없다(R35). */
    public boolean supportsBots() {
        return this != FRUIT_STACK;
    }
}
