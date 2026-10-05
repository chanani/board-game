package com.boardgame.member.api;

public record SignUpRequest(String loginId, String nickname, String password) {
}
