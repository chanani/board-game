package com.boardgame.uno;

import java.util.ArrayList;
import java.util.List;

// 버린 카드 더미. 마지막이 맨 위.
public class DiscardPile {

    private final List<UnoCard> cards = new ArrayList<>();

    public DiscardPile(UnoCard first) {
        cards.add(first);
    }

    public UnoCard top() {
        return cards.get(cards.size() - 1);
    }

    public void place(UnoCard card) {
        cards.add(card);
    }

    public int size() {
        return cards.size();
    }

    // R14: 맨 위 한 장만 남기고 나머지를 꺼낸다.
    public List<UnoCard> takeAllButTop() {
        UnoCard top = top();
        List<UnoCard> rest = new ArrayList<>(cards.subList(0, cards.size() - 1));
        cards.clear();
        cards.add(top);
        return rest;
    }
}
