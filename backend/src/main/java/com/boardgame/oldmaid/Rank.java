package com.boardgame.oldmaid;

import java.util.Arrays;
import java.util.List;

// R1·R2: 선언 순서 = 카드 번호의 랭크 순서. JOKER는 짝이 없는 랭크다.
public enum Rank {
    ACE, TWO, THREE, FOUR, FIVE, SIX, SEVEN, EIGHT, NINE, TEN, JACK, QUEEN, KING, JOKER;

    public static final List<Rank> STANDARD = Arrays.stream(values())
            .filter(rank -> !rank.isJoker())
            .toList();

    public boolean isJoker() {
        return this == JOKER;
    }
}
