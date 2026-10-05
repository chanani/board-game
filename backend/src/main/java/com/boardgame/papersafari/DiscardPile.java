package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Optional;

public class DiscardPile {

    private final Deque<Card> cards = new ArrayDeque<>();

    public void place(Card card) {
        cards.push(card);
    }

    public Card takeTop() {
        if (cards.isEmpty()) {
            throw new BusinessException(ErrorCode.EMPTY_DISCARD_PILE);
        }
        return cards.pop();
    }

    public Optional<Card> top() {
        return Optional.ofNullable(cards.peek());
    }

    public List<Card> takeAllButTop() {
        if (cards.size() <= 1) {
            return List.of();
        }
        Card top = cards.pop();
        List<Card> rest = new ArrayList<>(cards);
        cards.clear();
        cards.push(top);
        return rest;
    }
}
