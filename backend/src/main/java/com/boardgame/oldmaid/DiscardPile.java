package com.boardgame.oldmaid;

import java.util.ArrayList;
import java.util.List;

// 버린 짝. 모두에게 앞면으로 공개된다.
public class DiscardPile {

    private final List<CardPair> pairs = new ArrayList<>();

    public void addAll(List<CardPair> more) {
        pairs.addAll(more);
    }

    public int cardCount() {
        return pairs.size() * 2;
    }

    // 오래된 것부터 최근 limit쌍.
    public List<CardPair> recent(int limit) {
        int from = Math.max(0, pairs.size() - limit);
        return List.copyOf(pairs.subList(from, pairs.size()));
    }
}
