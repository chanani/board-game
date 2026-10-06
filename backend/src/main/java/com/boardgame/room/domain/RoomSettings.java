package com.boardgame.room.domain;

import com.boardgame.game.GameType;

public record RoomSettings(GameType gameType, Capacity capacity, RoomLock lock) {
}
