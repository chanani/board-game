package com.boardgame.game.event;

import com.boardgame.game.GameType;
import java.time.Instant;

/** 혼자 한 게임이 끝났다(수박게임 S6). 전적은 이 점수로 그 사람의 최고 점수만 바꾼다. */
public record SoloCompletedEvent(GameType gameType, long memberId, int score, Instant endedAt) {
}
