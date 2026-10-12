package com.boardgame.invite.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;

/** 살아 있는 초대들. 서버 메모리에만 있고, 만료된 초대는 새 초대를 낼 때 치운다. */
@Component
public class RoomInvites {

    private final Map<InviteId, RoomInvite> invites = new HashMap<>();

    /** 새 초대를 낸다. 같은 친구를 같은 방으로 부른 앞선 초대는 새것으로 바뀐다. */
    public synchronized RoomInvite issue(InviteRoute route, Instant now) {
        invites.values().removeIf(invite -> invite.isExpired(now));
        requireCooledDown(route.parties(), now);
        invites.values().removeIf(invite -> invite.follows(route));
        RoomInvite invite = RoomInvite.send(route, now);
        invites.put(invite.id(), invite);
        return invite;
    }

    /** 아직 살아 있는 초대만 돌려준다. */
    public synchronized Optional<RoomInvite> find(InviteId id, Instant now) {
        return Optional.ofNullable(invites.get(id))
                .filter(invite -> !invite.isExpired(now));
    }

    public synchronized void remove(InviteId id) {
        invites.remove(id);
    }

    private void requireCooledDown(InviteParties parties, Instant now) {
        boolean tooSoon = invites.values().stream()
                .anyMatch(invite -> invite.blocksResend(parties, now));
        if (tooSoon) {
            throw new BusinessException(ErrorCode.INVITE_TOO_FAST);
        }
    }
}
