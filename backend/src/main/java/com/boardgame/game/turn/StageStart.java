package com.boardgame.game.turn;

import java.time.Instant;

// 지금 재고 있는 결정 단계의 키와 그 단계가 시작된 시각.
record StageStart<K>(K key, Instant since) {

    boolean isFor(K other) {
        return key.equals(other);
    }
}
