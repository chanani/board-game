package com.boardgame.uno;

import java.util.Arrays;
import java.util.Optional;

// 지금 행동할 사람과 단계. drawn은 DRAWN 단계의 방금 뽑은 카드.
public record Turn(PlayerId actor, UnoStage stage, CardId drawn) {

    public static Turn play(PlayerId actor) {
        return new Turn(actor, UnoStage.PLAY, null);
    }

    public static Turn drawn(PlayerId actor, CardId card) {
        return new Turn(actor, UnoStage.DRAWN, card);
    }

    public static Turn chooseColor(PlayerId actor) {
        return new Turn(actor, UnoStage.CHOOSE_COLOR, null);
    }

    public boolean isActor(PlayerId player) {
        return actor.equals(player);
    }

    public boolean isIn(UnoStage... stages) {
        return Arrays.asList(stages).contains(stage);
    }

    public Optional<CardId> drawnCard() {
        return Optional.ofNullable(drawn);
    }
}
