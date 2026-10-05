package com.boardgame.room.api;

import com.boardgame.game.GameType;
import com.boardgame.room.domain.GameOccupancy;
import com.boardgame.room.domain.PlayerCount;

public record GameSummaryResponse(GameType gameType, String name, int minPlayers, int maxPlayers,
                                  int waitingPlayers, int playingPlayers) {

    public static GameSummaryResponse from(GameOccupancy occupancy) {
        GameType type = occupancy.gameType();
        PlayerCount waiting = occupancy.waiting();
        PlayerCount playing = occupancy.playing();
        return new GameSummaryResponse(type, type.displayName(), type.minPlayers(), type.maxPlayers(),
                waiting.value(), playing.value());
    }
}
