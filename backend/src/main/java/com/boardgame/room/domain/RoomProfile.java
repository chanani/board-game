package com.boardgame.room.domain;

import com.boardgame.game.GameType;

public record RoomProfile(RoomCode code, RoomName name, RoomSettings settings) {

    public RoomProfile reconfigured(Capacity capacity, RoomTheme theme) {
        return new RoomProfile(code, name, settings.reconfigured(capacity, theme));
    }

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
