package com.boardgame.room.api;

import com.boardgame.game.GameType;

public record CreateRoomRequest(String name, GameType gameType) {
}
