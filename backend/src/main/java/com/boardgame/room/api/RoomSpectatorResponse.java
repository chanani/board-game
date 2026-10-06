package com.boardgame.room.api;

import com.boardgame.room.domain.Participant;

public record RoomSpectatorResponse(long id, String nickname) {

    public static RoomSpectatorResponse from(Participant participant) {
        return new RoomSpectatorResponse(participant.memberId(), participant.nickname());
    }
}
