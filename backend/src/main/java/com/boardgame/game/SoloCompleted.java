package com.boardgame.game;

/** 혼자 한 게임이 끝났다(수박게임 S6). 승패 없이 끝난 점수만 있고 최고 점수 기록에 쓴다. */
public record SoloCompleted(long memberId, int score) implements GameOutcome {
}
