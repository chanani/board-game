package com.boardgame.member.application;

import com.boardgame.member.domain.Avatar;

/** 회원이 프로필 그림을 바꿨다. 커밋 뒤에 방 화면이 새 그림을 바로 알도록 쓴다. */
public record AvatarChangedEvent(long memberId, Avatar avatar) {
}
