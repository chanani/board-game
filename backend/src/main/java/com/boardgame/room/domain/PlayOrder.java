package com.boardgame.room.domain;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.stream.Stream;

// 게임을 시작할 때 앉은 참가자(사람·컴퓨터)의 플레이 순서를 정한다. 게임 안 자리도 이 순서를 따른다.
// 대기실 자리 순서는 바꾸지 않는다.
@FunctionalInterface
public interface PlayOrder {

    // 대기실 자리 순서 그대로(무작위를 끈 테스트용).
    PlayOrder SEATED = List::copyOf;

    List<Long> arrange(List<Long> seated);

    // 매 판 무작위 순서. 남은 사람 중 한 명씩 뽑아 세우므로, 언제나 0을 고르는 고정 무작위면 자리 순서가 그대로 남는다.
    static PlayOrder random(Random random) {
        return seated -> draw(seated, random);
    }

    private static List<Long> draw(List<Long> seated, Random random) {
        List<Long> remaining = new ArrayList<>(seated);
        return Stream.generate(() -> remaining.remove(random.nextInt(remaining.size())))
                .limit(seated.size())
                .toList();
    }
}
