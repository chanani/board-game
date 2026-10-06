package com.boardgame.room.api;

import com.boardgame.game.GameType;
import com.boardgame.room.domain.Participant;
import com.boardgame.room.domain.Room;
import com.boardgame.room.domain.RoomStatus;
import java.util.List;

public record RoomSummaryResponse(String code, String name, GameType gameType, String gameTypeName,
                                  int playerCount, int maxPlayers, String hostNickname,
                                  RoomStatus status, boolean locked, Integer roundNumber,
                                  int spectatorCount) {

    public static RoomSummaryResponse from(Room room) {
        List<Participant> participants = room.participants();
        GameType gameType = room.gameType();
        Participant host = participants.get(0);
        Integer roundNumber = room.roundNumber().orElse(null);
        return new RoomSummaryResponse(room.codeValue(), room.nameValue(), gameType, gameType.displayName(),
                participants.size(), room.capacity(), host.nickname(), room.status(), room.isLocked(),
                roundNumber, room.spectatorCount());
    }
}
