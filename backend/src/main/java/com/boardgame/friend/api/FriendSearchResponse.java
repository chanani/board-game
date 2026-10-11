package com.boardgame.friend.api;

import com.boardgame.friend.domain.FriendRelation;
import com.boardgame.member.domain.Member;

/** 닉네임으로 찾은 회원과, 나와 그 사람의 사이. */
public record FriendSearchResponse(long memberId, String nickname, String avatar, FriendRelation relation) {

    public static FriendSearchResponse of(Member found, FriendRelation relation) {
        return new FriendSearchResponse(found.id(), found.nicknameValue(), found.avatar().key(), relation);
    }
}
