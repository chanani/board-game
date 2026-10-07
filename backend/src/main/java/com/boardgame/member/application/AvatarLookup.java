package com.boardgame.member.application;

import com.boardgame.member.domain.AvatarBook;
import java.util.Collection;

/** 방·순위표처럼 여러 회원을 한꺼번에 보여 줄 때 프로필 그림을 한 번에 찾는다. */
@FunctionalInterface
public interface AvatarLookup {

    AvatarBook avatarsOf(Collection<Long> memberIds);
}
