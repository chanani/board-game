package com.boardgame.papersafari.bot;

import com.boardgame.game.GameAction;
import com.boardgame.papersafari.CardKind;
import com.boardgame.papersafari.view.SlotView;

// 페이퍼 사파리 행동 글자(PaperSafariCommand와 같은 이름).
final class SafariMoves {

    private SafariMoves() {
    }

    static GameAction flip(SlotView slot) {
        return at("FLIP", slot);
    }

    static GameAction swap(SlotView slot) {
        return at("SWAP", slot);
    }

    static GameAction peek(SlotView slot) {
        return at("PEEK", slot);
    }

    static GameAction drawDeck() {
        return new GameAction("DRAW_DECK", null, null);
    }

    static GameAction drawDiscard() {
        return new GameAction("DRAW_DISCARD", null, null);
    }

    static GameAction discard() {
        return new GameAction("DISCARD", null, null);
    }

    // 덱에서 뽑은 카드만 버릴 수 있고, 타잔은 반드시 바꿔 넣는다(DrawnCard.validateDiscardable).
    static boolean canDiscard(SafariSight sight) {
        return sight.heldFromDeck() && !sight.heldIs(CardKind.TARZAN);
    }

    private static GameAction at(String type, SlotView slot) {
        return new GameAction(type, slot.column(), slot.row());
    }
}
