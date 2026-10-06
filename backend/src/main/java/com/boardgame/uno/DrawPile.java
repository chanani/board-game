package com.boardgame.uno;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

// 뽑을 더미. 앞에서부터 뽑는다.
public class DrawPile {

    private final Deque<UnoCard> cards;
    private final UnoShuffler shuffler;

    public DrawPile(List<UnoCard> cards, UnoShuffler shuffler) {
        this.cards = new ArrayDeque<>(cards);
        this.shuffler = shuffler;
    }

    public boolean isEmpty() {
        return cards.isEmpty();
    }

    public int size() {
        return cards.size();
    }

    public UnoCard take() {
        return cards.pollFirst();
    }

    // R14: 비었을 때 버린 카드들을 섞어 새 더미로.
    public void refill(List<UnoCard> recycled) {
        cards.addAll(shuffler.shuffle(recycled));
    }

    // R35: 기권자 손패를 섞어 맨 아래에.
    public void putUnder(List<UnoCard> extra) {
        cards.addAll(shuffler.shuffle(extra));
    }

    // R7: 첫 카드가 +4면 더미에 다시 넣고 섞는다.
    public void reshuffleWith(UnoCard card) {
        List<UnoCard> all = new ArrayList<>(cards);
        all.add(card);
        cards.clear();
        cards.addAll(shuffler.shuffle(all));
    }
}
