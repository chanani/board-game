package com.boardgame.friend.api;

import com.boardgame.member.domain.Member;

/** 요청 한 건. memberId·nickname·avatar는 상대(받은 요청이면 보낸 사람, 보낸 요청이면 받는 사람)다. */
public record FriendRequestResponse(long requestId, long memberId, String nickname, String avatar) {

    public static FriendRequestResponse of(long requestId, Member other) {
        return new FriendRequestResponse(requestId, other.id(), other.nicknameValue(), other.avatar().key());
    }
}
