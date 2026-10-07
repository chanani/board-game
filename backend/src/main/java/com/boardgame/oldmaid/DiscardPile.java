package com.boardgame.oldmaid;

import java.util.ArrayList;
import java.util.List;

// 버린 짝(버린 순서대로, 누가 버렸는지와 함께). 모두에게 앞면으로 공개된다.
public class DiscardPile {

    private final List<DiscardedPair> pairs = new ArrayList<>();

    public void addAll(PlayerId owner, List<CardPair> more) {
        more.forEach(pair -> pairs.add(new DiscardedPair(owner, pair)));
    }

    public int cardCount() {
        return pairs.size() * 2;
    }

    // 오래된 것부터 최근 limit쌍.
    public List<CardPair> recent(int limit) {
        int from = Math.max(0, pairs.size() - limit);
        return pairs.subList(from, pairs.size())
                .stream()
                .map(DiscardedPair::pair)
                .toList();
    }

    // 처음부터 지금까지 버린 짝 전체(오래된 것부터).
    public List<DiscardedPair> all() {
        return List.copyOf(pairs);
    }
}
