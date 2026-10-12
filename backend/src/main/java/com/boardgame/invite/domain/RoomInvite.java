package com.boardgame.invite.domain;

import com.boardgame.room.domain.RoomCode;
import java.time.Duration;
import java.time.Instant;

/** 대기실에서 친구에게 보낸 초대 한 건. 저장하지 않고 메모리에만 두며, 잠깐 뒤에 만료된다. */
public record RoomInvite(InviteId id, InviteRoute route, Instant sentAt) {

    /** 초대는 이 시간 동안만 받을 수 있다. */
    public static final Duration LIFETIME = Duration.ofSeconds(30);
    /** 같은 친구를 다시 부르려면 이만큼 기다려야 한다. */
    public static final Duration COOLDOWN = Duration.ofSeconds(10);

    public static RoomInvite send(InviteRoute route, Instant now) {
        return new RoomInvite(InviteId.random(), route, now);
    }

    public boolean isExpired(Instant now) {
        return !now.isBefore(sentAt.plus(LIFETIME));
    }

    /** 같은 사람이 같은 친구를 방금 불렀으면 다시 부르지 못하게 막는다. */
    public boolean blocksResend(InviteParties parties, Instant now) {
        return route.isBetween(parties) && now.isBefore(sentAt.plus(COOLDOWN));
    }

    public boolean follows(InviteRoute other) {
        return route.equals(other);
    }

    /** 이 초대가 memberId에게 온, room으로 가는 초대인지. */
    public boolean invites(long memberId, RoomCode room) {
        return route.isAddressedTo(memberId) && route.leadsTo(room);
    }

    public long inviterId() {
        return route.inviterId();
    }

    public String idValue() {
        return id.value();
    }
}
