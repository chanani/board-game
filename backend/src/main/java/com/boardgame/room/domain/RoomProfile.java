package com.boardgame.room.domain;

import com.boardgame.game.GameType;

public record RoomProfile(RoomCode code, RoomName name, GameType gameType) {
}
