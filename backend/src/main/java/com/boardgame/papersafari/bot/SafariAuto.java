package com.boardgame.papersafari.bot;

import com.boardgame.game.GameAction;
import com.boardgame.papersafari.view.SlotView;
import java.util.List;
import java.util.Optional;
import java.util.Random;

// R21·R25: 기존 자동 행동(PaperSafariRound.autoAct)과 같은 결정. 하도 이것을 쓴다.
final class SafariAuto {

    private SafariAuto() {
    }

    static GameAction flip(SafariSight sight, Random random) {
        return SafariMoves.flip(pick(sight.myFaceDown(), random));
    }

    static GameAction draw(SafariSight sight) {
        if (sight.discardTop().isPresent()) {
            return SafariMoves.drawDiscard();
        }
        return SafariMoves.drawDeck();
    }

    static GameAction place(SafariSight sight, Random random) {
        return SafariMoves.swap(pick(sight.mySlots(), random));
    }

    static GameAction peek(SafariSight sight, Random random) {
        return SafariMoves.peek(pick(sight.myFaceDown(), random));
    }

    static Optional<GameAction> fallback(SafariSight sight, Random random) {
        if (!sight.awaitsMe()) {
            return Optional.empty();
        }
        return Optional.of(decide(sight, random));
    }

    static SlotView pick(List<SlotView> slots, Random random) {
        return slots.get(random.nextInt(slots.size()));
    }

    private static GameAction decide(SafariSight sight, Random random) {
        return switch (sight.phase()) {
            case SETUP_FLIP -> flip(sight, random);
            case DRAW -> draw(sight);
            case PLACE -> place(sight, random);
            case PEEK, ROUND_OVER -> peek(sight, random);
        };
    }
}
