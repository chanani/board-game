package com.boardgame.room.domain;

import com.boardgame.game.GameType;

public record GameOccupancy(GameType gameType, PlayerCount waiting, PlayerCount playing) {

    public static GameOccupancy empty(GameType gameType) {
        return new GameOccupancy(gameType, PlayerCount.zero(), PlayerCount.zero());
    }

    public GameOccupancy add(RoomStatus status, PlayerCount count) {
        if (status == RoomStatus.PLAYING) {
            return new GameOccupancy(gameType, waiting, playing.plus(count));
        }
        return new GameOccupancy(gameType, waiting.plus(count), playing);
    }
}
