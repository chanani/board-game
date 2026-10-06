package com.boardgame.room.api;

import com.boardgame.game.GameType;
import com.boardgame.room.application.PresenceTracker;
import com.boardgame.room.domain.Participant;
import com.boardgame.room.domain.Room;
import com.boardgame.room.domain.RoomStatus;
import java.time.Instant;
import java.util.List;

public record RoomResponse(String code, String name, GameType gameType, String gameTypeName, RoomStatus status,
                           long hostId, int maxPlayers, boolean locked, List<RoomMemberResponse> members) {

    public static RoomResponse from(Room room, PresenceTracker presence, Instant now) {
        long hostId = room.hostId();
        List<RoomMemberResponse> members = room.participants().stream()
                .map(participant -> member(participant, hostId, presence, now))
                .toList();
        GameType gameType = room.gameType();
        return new RoomResponse(room.codeValue(), room.nameValue(), gameType, gameType.displayName(),
                room.status(), hostId, room.capacity(), room.isLocked(), members);
    }

    private static RoomMemberResponse member(Participant participant, long hostId, PresenceTracker presence,
                                             Instant now) {
        long memberId = participant.memberId();
        long offlineSeconds = presence.offlineFor(memberId, now).toSeconds();
        return new RoomMemberResponse(memberId, participant.nickname(), memberId == hostId,
                presence.isConnected(memberId), offlineSeconds);
    }
}
