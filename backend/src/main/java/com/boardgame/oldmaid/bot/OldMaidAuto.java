package com.boardgame.oldmaid.bot;

import com.boardgame.game.GameAction;
import java.util.Optional;
import java.util.Random;

// R21: 기존 자동 행동(autoAct)과 같은 결정. 버릴 수 있으면 모두 버리고, 내가 뽑을 차례면 무작위 자리, 아니면 빈 값.
final class OldMaidAuto {

    private OldMaidAuto() {
    }

    static Optional<GameAction> decide(OldMaidSight sight, Random random) {
        if (sight.canDiscard()) {
            return Optional.of(OldMaidMoves.discardAll());
        }
        if (sight.isDrawing() && sight.targetCardCount() > 0) {
            return Optional.of(OldMaidMoves.draw(random.nextInt(sight.targetCardCount())));
        }
        return Optional.empty();
    }
}
