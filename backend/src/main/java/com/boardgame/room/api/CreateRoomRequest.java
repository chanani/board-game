package com.boardgame.room.api;

import com.boardgame.game.GameType;

public record CreateRoomRequest(String name, GameType gameType, Integer maxPlayers, String password, String theme) {

    public CreateRoomRequest(String name, GameType gameType, Integer maxPlayers, String password) {
        this(name, gameType, maxPlayers, password, null);
    }
}
