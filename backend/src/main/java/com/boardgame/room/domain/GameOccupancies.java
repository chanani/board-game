package com.boardgame.room.domain;

import com.boardgame.game.GameType;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

public class GameOccupancies {

    private final Map<GameType, GameOccupancy> occupancies;

    private GameOccupancies(Map<GameType, GameOccupancy> occupancies) {
        this.occupancies = occupancies;
    }

    public static GameOccupancies of(List<Room> rooms) {
        Map<GameType, GameOccupancy> occupancies = new EnumMap<>(GameType.class);
        Arrays.stream(GameType.values()).forEach(type -> occupancies.put(type, GameOccupancy.empty(type)));
        rooms.forEach(room -> occupancies.computeIfPresent(room.gameType(), (type, current) -> room.addTo(current)));
        return new GameOccupancies(occupancies);
    }

    public List<GameOccupancy> asList() {
        return List.copyOf(occupancies.values());
    }
}
