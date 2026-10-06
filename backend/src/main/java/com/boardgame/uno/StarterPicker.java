package com.boardgame.uno;

// R5: 시작 사람 자리(0..playerCount-1)를 고른다. 운영은 무작위, 테스트는 고정.
@FunctionalInterface
public interface StarterPicker {

    int pick(int playerCount);
}
