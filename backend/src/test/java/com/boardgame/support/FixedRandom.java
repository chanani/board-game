package com.boardgame.support;

import java.util.Random;

// 무작위 선택을 고정한다. 후보 목록에서 언제나 index번째(후보 수로 나눈 나머지)를 고른다.
public class FixedRandom extends Random {

    private final int index;

    public FixedRandom(int index) {
        this.index = index;
    }

    @Override
    public int nextInt(int bound) {
        return index % bound;
    }
}
