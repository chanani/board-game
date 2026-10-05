package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;

public record DrawnCard(Card card, DrawSource source) {

    public boolean fromDeck() {
        return source == DrawSource.DECK;
    }

    public boolean triggersTarzan() {
        return fromDeck() && card.is(CardKind.TARZAN);
    }

    public boolean triggersElephant() {
        return fromDeck() && card.is(CardKind.ELEPHANT);
    }

    public void validateDiscardable() {
        if (!fromDeck()) {
            throw new BusinessException(ErrorCode.MUST_SWAP_DISCARD_CARD);
        }
        if (triggersTarzan()) {
            throw new BusinessException(ErrorCode.MUST_SWAP_TARZAN);
        }
    }
}
