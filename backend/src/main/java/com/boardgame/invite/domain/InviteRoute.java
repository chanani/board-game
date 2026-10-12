package com.boardgame.invite.domain;

import com.boardgame.room.domain.RoomCode;

/** 누가 누구를 어느 방으로 불렀는지. */
public record InviteRoute(InviteParties parties, RoomCode code) {

    public boolean isBetween(InviteParties other) {
        return parties.equals(other);
    }

    public boolean leadsTo(RoomCode room) {
        return code.equals(room);
    }

    public boolean isAddressedTo(long memberId) {
        return parties.inviteeId() == memberId;
    }

    public long inviterId() {
        return parties.inviterId();
    }
}
