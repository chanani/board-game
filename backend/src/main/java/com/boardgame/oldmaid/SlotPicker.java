package com.boardgame.oldmaid;

// 0 이상 bound 미만의 자리 하나를 고른다(첫 사람, 받은 카드를 끼울 자리). 운영은 무작위, 테스트는 고정.
@FunctionalInterface
public interface SlotPicker {

    int pick(int bound);
}
