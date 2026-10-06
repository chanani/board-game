package com.boardgame.common.security;

/** 로그아웃 요청이 세션을 지우기 전에 낸다. 방 쪽이 이 회원을 방에서 내보낸다. */
public record MemberLoggedOutEvent(long memberId) {
}
