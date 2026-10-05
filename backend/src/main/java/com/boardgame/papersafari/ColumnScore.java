package com.boardgame.papersafari;

final class ColumnScore {

    private ColumnScore() {
    }

    static Score of(Card top, Card bottom) {
        if (top.is(CardKind.WILD) || bottom.is(CardKind.WILD)) {
            return Score.ZERO;
        }
        if (top.matches(bottom)) {
            return Score.ZERO;
        }
        return top.score().plus(bottom.score());
    }
}
