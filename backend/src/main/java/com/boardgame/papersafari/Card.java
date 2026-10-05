package com.boardgame.papersafari;

public record Card(CardKind kind, CardValue value) {

    private static final int MIN_NUMBER = 0;
    private static final int MAX_NUMBER = 9;

    public static Card number(int value) {
        if (value < MIN_NUMBER || value > MAX_NUMBER) {
            throw new IllegalArgumentException("숫자 카드는 0~9만 가능합니다: " + value);
        }
        return new Card(CardKind.NUMBER, new CardValue(value));
    }

    public static Card elephant() {
        return new Card(CardKind.ELEPHANT, CardValue.TEN);
    }

    public static Card tarzan() {
        return new Card(CardKind.TARZAN, CardValue.TEN);
    }

    public static Card fox() {
        return new Card(CardKind.FOX, CardValue.MINUS_TWO);
    }

    public static Card wild() {
        return new Card(CardKind.WILD, CardValue.ZERO);
    }

    public boolean is(CardKind other) {
        return kind == other;
    }

    public boolean matches(Card other) {
        return value.equals(other.value);
    }

    public Score score() {
        return new Score(value.value());
    }

    public int faceValue() {
        return value.value();
    }
}
