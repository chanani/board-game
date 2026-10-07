package com.boardgame.member.application;

import com.boardgame.member.domain.Avatar;

/** 한 회원의 프로필 그림을 찾는다. 방에 들어올 때 잠금 밖에서 한 번만 부른다. */
@FunctionalInterface
public interface AvatarLookup {

    Avatar avatarOf(long memberId);
}
