package com.boardgame.room.domain;

import java.time.Instant;

/** 기록용 매치 키와 시작 시각. */
public record MatchStamp(String matchKey, Instant startedAt) {
}
