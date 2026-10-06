package com.boardgame.room.domain;

import com.boardgame.game.GameType;

public record RoomProfile(RoomCode code, RoomName name, RoomSettings settings) {

    public GameType gameType() {
        return settings.gameType();
    }

    public Capacity capacity() {
        return settings.capacity();
    }

    public RoomTheme theme() {
        return settings.theme();
    }

    public RoomLock lock() {
        return settings.lock();
    }
}
