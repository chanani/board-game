package com.boardgame.friend.api;

/** 친구 요청 대상. memberId가 있으면 그 회원에게, 없으면 닉네임이 정확히 같은 회원에게 보낸다. */
public record SendFriendRequest(String nickname, Long memberId) {

    public boolean hasMemberId() {
        return memberId != null;
    }

    public String strippedNickname() {
        if (nickname == null) {
            return "";
        }
        return nickname.strip();
    }
}
