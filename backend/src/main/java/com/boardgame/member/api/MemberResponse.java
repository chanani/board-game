package com.boardgame.member.api;

import com.boardgame.member.domain.Member;

public record MemberResponse(long id, String loginId, String nickname, String avatar) {

    public static MemberResponse from(Member member) {
        return new MemberResponse(member.id(), member.loginIdValue(), member.nicknameValue(), member.avatar().key());
    }
}
