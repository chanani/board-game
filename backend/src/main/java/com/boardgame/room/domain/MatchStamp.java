package com.boardgame.room.domain;

import java.time.Instant;

/** 기록용 매치 키와 시작 시각, 그리고 연습 경기(R37: 컴퓨터가 낀 게임, 시작 때 정함 D8)인지. */
public record MatchStamp(String matchKey, Instant startedAt, boolean practice) {
}
