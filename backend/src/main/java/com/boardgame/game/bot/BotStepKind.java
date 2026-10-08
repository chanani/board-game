package com.boardgame.game.bot;

// ACT = 행동(상태를 바꾼다, room.act), SIGNAL = 신호(상태를 바꾸지 않는다, room.signal — 도둑잡기 고르는 카드 들어 올림).
public enum BotStepKind {
    ACT, SIGNAL
}
