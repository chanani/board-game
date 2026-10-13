package com.boardgame.fruitstack;

// R4: 경기마다 씨앗 하나. 테스트는 고정 값을 준다.
@FunctionalInterface
public interface SeedSource {

    Seed next();
}
