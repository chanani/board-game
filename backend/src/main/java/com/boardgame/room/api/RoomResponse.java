package com.boardgame.room.api;

import com.boardgame.game.GameType;
import com.boardgame.room.domain.Room;
import com.boardgame.room.domain.RoomStatus;
import java.util.List;

public record RoomResponse(String code, String name, GameType gameType, String gameTypeName, RoomStatus status,
                           long hostId, int maxPlayers, List<RoomMemberResponse> members) {

    public static RoomResponse from(Room room) {
        long hostId = room.hostId();
        List<RoomMemberResponse> members = room.participants().stream()
                .map(participant -> new RoomMemberResponse(participant.memberId(), participant.nickname(),
                        participant.memberId() == hostId))
                .toList();
        GameType gameType = room.gameType();
        return new RoomResponse(room.codeValue(), room.nameValue(), gameType, gameType.displayName(),
                room.status(), hostId, gameType.maxPlayers(), members);
    }
}
