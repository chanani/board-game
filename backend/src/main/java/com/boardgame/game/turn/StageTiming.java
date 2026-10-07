package com.boardgame.game.turn;

// 화면에 실을 마감(epoch ms, 기다리지 않으면 null)과 서버 시각(epoch ms).
public record StageTiming(Long deadline, long serverNow) {
}
