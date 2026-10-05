package com.boardgame.record.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class ParticipantSeat {

    @Column(name = "member_id", nullable = false)
    private long memberId;

    @Column(name = "seat", nullable = false)
    private int seat;

    protected ParticipantSeat() {
    }

    public ParticipantSeat(long memberId, int seat) {
        this.memberId = memberId;
        this.seat = seat;
    }

    public long memberId() {
        return memberId;
    }

    public int seat() {
        return seat;
    }
}
