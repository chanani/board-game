package com.boardgame.papersafari;

import java.util.List;
import java.util.Optional;
import java.util.Random;

// 시간 초과 자동 행동이 칸을 무작위로 고른다. 테스트는 고정된 Random을 넣는다.
record PositionPicker(Random random) {

    Position any() {
        return anyOf(Position.all()).orElseThrow();
    }

    Optional<Position> anyOf(List<Position> candidates) {
        if (candidates.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(candidates.get(random.nextInt(candidates.size())));
    }
}
