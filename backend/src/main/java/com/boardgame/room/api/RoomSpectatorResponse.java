package com.boardgame.room.api;

import com.boardgame.member.domain.AvatarBook;
import com.boardgame.room.domain.Participant;

public record RoomSpectatorResponse(long id, String nickname, String avatar) {

    public static RoomSpectatorResponse from(Participant participant, AvatarBook avatars) {
        long memberId = participant.memberId();
        return new RoomSpectatorResponse(memberId, participant.nickname(), avatars.keyOf(memberId));
    }
}
