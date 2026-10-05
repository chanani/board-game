package com.boardgame.common.security;

import com.boardgame.member.domain.Member;
import java.io.Serializable;
import java.security.Principal;

public record LoginMember(long id, String nickname) implements Principal, Serializable {

    public static LoginMember from(Member member) {
        return new LoginMember(member.id(), member.nicknameValue());
    }

    public static long idOf(Principal principal) {
        return Long.parseLong(principal.getName());
    }

    @Override
    public String getName() {
        return String.valueOf(id);
    }
}
