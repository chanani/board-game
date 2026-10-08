package com.boardgame.room.domain;

import java.util.Collection;
import java.util.stream.IntStream;

// R3: 컴퓨터 이름 번호. 방에 지금 앉아 있는 컴퓨터 중 가장 작은 빈 번호(1부터)를 쓴다.
public record BotNumber(int value) {

    private static final String NAME_PREFIX = "컴퓨터 ";

    public static BotNumber smallestFree(Collection<BotNumber> taken) {
        return IntStream.iterate(1, number -> number + 1)
                .mapToObj(BotNumber::new)
                .filter(number -> !taken.contains(number))
                .findFirst()
                .orElseThrow();
    }

    public String nickname() {
        return NAME_PREFIX + value;
    }
}
