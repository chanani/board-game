package com.boardgame.papersafari.bot;

import com.boardgame.papersafari.CardKind;
import com.boardgame.papersafari.view.CardView;
import com.boardgame.papersafari.view.SlotView;

// 칸 하나의 어림: value가 null이면 모르는 뒷면. wild면 같은 줄 이웃을 복사한다.
record Guess(Integer value, boolean wild) {

    static final Guess UNKNOWN = new Guess(null, false);

    static Guess of(SlotView slot) {
        if (slot.card() == null) {
            return UNKNOWN;
        }
        return of(slot.card());
    }

    static Guess of(CardView card) {
        return new Guess(card.value(), card.kind() == CardKind.WILD);
    }

    boolean known() {
        return value != null;
    }

    double worth(double unknown) {
        if (!known()) {
            return unknown;
        }
        return value;
    }

    boolean pairs(Guess other) {
        return known() && value.equals(other.value());
    }

    boolean matches(CardView card) {
        return known() && value == card.value();
    }

    Guess zeroIfWild() {
        if (!wild) {
            return this;
        }
        return new Guess(0, false);
    }
}
