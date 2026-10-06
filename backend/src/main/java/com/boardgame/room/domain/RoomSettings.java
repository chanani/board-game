package com.boardgame.room.domain;

import com.boardgame.game.GameType;

public record RoomSettings(GameType gameType, Capacity capacity, RoomTraits traits) {

    public RoomSettings(GameType gameType, Capacity capacity, RoomLock lock) {
        this(gameType, capacity, new RoomTraits(lock, RoomTheme.WOOD));
    }

    public RoomSettings reconfigured(Capacity newCapacity, RoomTheme newTheme) {
        return new RoomSettings(gameType, newCapacity, new RoomTraits(lock(), newTheme));
    }

    public RoomLock lock() {
        return traits.lock();
    }

    public RoomTheme theme() {
        return traits.theme();
    }
}
