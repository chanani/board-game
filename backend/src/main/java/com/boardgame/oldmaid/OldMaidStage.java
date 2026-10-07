package com.boardgame.oldmaid;

// 게임 중 단계: 처음 버리기(R36, 모두 동시에) → 뽑기(R12) ↔ 짝 버리기(R37, 뽑은 카드로 짝이 된 뽑은 사람만).
public enum OldMaidStage {
    OPENING_DISCARD, DRAW, DISCARD
}
