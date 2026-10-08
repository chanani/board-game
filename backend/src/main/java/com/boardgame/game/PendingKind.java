package com.boardgame.game;

// R18: 기다리는 결정의 종류. TURN = 차례 행동, TOGETHER = 모두 동시에 하는 단계(처음 뒤집기·처음 짝 버리기),
// REACTION = 차례 밖 행동(우노 잡기·늦은 외침, 도둑잡기 섞기). REACTION은 하지 않아도 된다.
public enum PendingKind {
    TURN, TOGETHER, REACTION
}
