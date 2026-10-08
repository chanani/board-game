package com.boardgame.room.api;

import com.boardgame.game.GameType;
import com.boardgame.member.domain.AvatarBook;
import com.boardgame.room.application.PresenceTracker;
import com.boardgame.room.domain.Participant;
import com.boardgame.room.domain.Room;
import com.boardgame.room.domain.RoomStatus;
import com.boardgame.room.domain.RoomTheme;
import java.time.Instant;
import java.util.List;

public record RoomResponse(String code, String name, GameType gameType, String gameTypeName, RoomStatus status,
                           long hostId, int maxPlayers, boolean locked, RoomTheme theme, List<RoomMemberResponse> members,
                           List<RoomSpectatorResponse> spectators, boolean practice) {

    public static RoomResponse from(Room room, PresenceTracker presence, Instant now, AvatarBook avatars) {
        long hostId = room.hostId();
        List<RoomMemberResponse> members = room.participants().stream()
                .map(participant -> member(participant, hostId, room.readyIds(), presence, now, avatars))
                .toList();
        List<RoomSpectatorResponse> spectators = room.spectators().stream()
                .map(spectator -> RoomSpectatorResponse.from(spectator, avatars))
                .toList();
        GameType gameType = room.gameType();
        return new RoomResponse(room.codeValue(), room.nameValue(), gameType, gameType.displayName(),
                room.status(), hostId, room.capacity(), room.isLocked(), room.theme(), members, spectators,
                room.isPractice());
    }

    private static RoomMemberResponse member(Participant participant, long hostId, List<Long> readyIds,
                                             PresenceTracker presence, Instant now, AvatarBook avatars) {
        if (participant.isBot()) {
            return RoomMemberResponse.bot(participant);
        }
        long memberId = participant.memberId();
        long offlineSeconds = presence.offlineFor(memberId, now).toSeconds();
        return RoomMemberResponse.human(memberId, participant.nickname(), avatars.keyOf(memberId), memberId == hostId,
                presence.isConnected(memberId), offlineSeconds, readyIds.contains(memberId));
    }
}
