package com.boardgame.member.domain;

import java.util.Collection;
import java.util.Map;
import java.util.stream.Collectors;

/** 여러 회원의 프로필 그림. 목록에 없는 회원(탈퇴 등)은 id로 정한 기본 그림을 돌려준다. */
public final class AvatarBook {

    private final Map<Long, Avatar> avatars;

    private AvatarBook(Map<Long, Avatar> avatars) {
        this.avatars = Map.copyOf(avatars);
    }

    public static AvatarBook empty() {
        return new AvatarBook(Map.of());
    }

    public static AvatarBook of(Collection<Member> members) {
        return new AvatarBook(members.stream().collect(Collectors.toMap(Member::id, Member::avatar)));
    }

    public String keyOf(long memberId) {
        return avatars.getOrDefault(memberId, Avatar.defaultFor(memberId)).key();
    }
}
