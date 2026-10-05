package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.stream.IntStream;

public class Deck {

    private final Deque<Card> cards;

    private Deck(List<Card> cards) {
        this.cards = new ArrayDeque<>(cards);
    }

    public static Deck of(List<Card> cards) {
        return new Deck(cards);
    }

    public Card draw() {
        if (cards.isEmpty()) {
            throw new BusinessException(ErrorCode.DECK_EXHAUSTED);
        }
        return cards.pop();
    }

    public List<Card> drawMany(int count) {
        return IntStream.range(0, count).mapToObj(index -> draw()).toList();
    }

    public void refill(List<Card> newCards) {
        cards.addAll(newCards);
    }

    public boolean isEmpty() {
        return cards.isEmpty();
    }

    public int size() {
        return cards.size();
    }
}
