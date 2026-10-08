package com.boardgame.room.api;

import com.boardgame.game.GameType;
import com.boardgame.room.domain.Participant;
import com.boardgame.room.domain.Room;
import com.boardgame.room.domain.RoomStatus;
import com.boardgame.room.domain.RoomTheme;
import java.util.List;

public record RoomSummaryResponse(String code, String name, GameType gameType, String gameTypeName,
                                  int playerCount, int maxPlayers, String hostNickname,
                                  RoomStatus status, boolean locked, Integer roundNumber,
                                  int spectatorCount, RoomTheme theme) {

    public static RoomSummaryResponse from(Room room) {
        List<Participant> participants = room.participants();
        GameType gameType = room.gameType();
        // R12: 방장은 첫 사람이다(컴퓨터가 먼저 앉아 있어도).
        Participant host = room.host();
        Integer roundNumber = room.roundNumber().orElse(null);
        return new RoomSummaryResponse(room.codeValue(), room.nameValue(), gameType, gameType.displayName(),
                participants.size(), room.capacity(), host.nickname(), room.status(), room.isLocked(),
                roundNumber, room.spectatorCount(), room.theme());
    }
}
