package com.boardgame.invite.api;

import java.time.Duration;

/** 초대를 보냈다. cooldownSeconds가 지나야 같은 친구를 다시 부를 수 있다. */
public record InviteSentResponse(long cooldownSeconds) {

    public static InviteSentResponse cooldown(Duration cooldown) {
        return new InviteSentResponse(cooldown.toSeconds());
    }
}
