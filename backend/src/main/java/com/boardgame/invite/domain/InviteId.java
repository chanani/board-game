package com.boardgame.invite.domain;

import java.util.UUID;

/** 초대 한 건을 가리키는 추측할 수 없는 번호. 초대받은 사람만 알고, 이것으로 참가·거절한다. */
public record InviteId(String value) {

    public static InviteId random() {
        return new InviteId(UUID.randomUUID().toString());
    }
}
