package com.boardgame.papersafari.view;

import com.boardgame.papersafari.Card;
import com.boardgame.papersafari.CardKind;

public record CardView(CardKind kind, int value) {

    public static CardView of(Card card) {
        return new CardView(card.kind(), card.faceValue());
    }
}
