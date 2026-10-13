package com.boardgame.fruitstack;

import com.boardgame.game.ResultType;

public record Standing(PlayerId player, Score score, ResultType result, Place place, PlayerState state) {

    boolean isContender() {
        return state != PlayerState.FORFEITED;
    }

    boolean isWinner() {
        return result == ResultType.WIN;
    }

    int placeValue() {
        return place.value();
    }
}
