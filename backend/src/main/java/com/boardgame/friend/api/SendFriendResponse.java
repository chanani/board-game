package com.boardgame.friend.api;

import com.boardgame.member.domain.Member;

/** 요청 결과. 상대가 먼저 보낸 요청이 있었다면 바로 친구가 되어 ACCEPTED다. */
public record SendFriendResponse(Status status, long memberId, String nickname) {

    public enum Status {
        REQUESTED,
        ACCEPTED
    }

    public static SendFriendResponse requested(Member receiver) {
        return new SendFriendResponse(Status.REQUESTED, receiver.id(), receiver.nicknameValue());
    }

    public static SendFriendResponse accepted(Member receiver) {
        return new SendFriendResponse(Status.ACCEPTED, receiver.id(), receiver.nicknameValue());
    }
}
