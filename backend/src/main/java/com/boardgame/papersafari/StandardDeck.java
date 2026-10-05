package com.boardgame.papersafari;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.IntStream;

public final class StandardDeck {

    private static final int COPIES = 4;
    private static final int WILD_COPIES = 2;

    private StandardDeck() {
    }

    public static List<Card> cards() {
        List<Card> cards = new ArrayList<>();
        IntStream.rangeClosed(0, 9).forEach(value -> addCopies(cards, Card.number(value), COPIES));
        addCopies(cards, Card.elephant(), COPIES);
        addCopies(cards, Card.tarzan(), COPIES);
        addCopies(cards, Card.fox(), COPIES);
        addCopies(cards, Card.wild(), WILD_COPIES);
        return cards;
    }

    private static void addCopies(List<Card> cards, Card card, int copies) {
        cards.addAll(Collections.nCopies(copies, card));
    }
}
