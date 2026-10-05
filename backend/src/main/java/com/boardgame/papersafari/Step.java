package com.boardgame.papersafari;

import java.util.Optional;

record Step(TurnPhase phase, DrawnCard drawn) {

    static Step of(TurnPhase phase) {
        return new Step(phase, null);
    }

    static Step placing(DrawnCard drawn) {
        return new Step(TurnPhase.PLACE, drawn);
    }

    boolean isIn(TurnPhase other) {
        return phase == other;
    }

    Optional<DrawnCard> held() {
        return Optional.ofNullable(drawn);
    }

    Step afterLeave() {
        if (!phase.isPlaying()) {
            return this;
        }
        return of(TurnPhase.DRAW);
    }
}
