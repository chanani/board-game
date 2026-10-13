package com.boardgame.fruitstack.view;

public record FruitStackSessionView(String gameType, FruitStackView game) {

    public static final String GAME_TYPE = "FRUIT_STACK";

    public FruitStackSessionView(FruitStackView game) {
        this(GAME_TYPE, game);
    }
}
