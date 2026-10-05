package com.boardgame.papersafari;

public record Slot(Card card, Visibility visibility) {

    public static Slot faceDown(Card card) {
        return new Slot(card, Visibility.FACE_DOWN);
    }

    public static Slot faceUp(Card card) {
        return new Slot(card, Visibility.FACE_UP);
    }

    public Slot reveal() {
        return faceUp(card);
    }

    public boolean isFaceUp() {
        return visibility == Visibility.FACE_UP;
    }
}
