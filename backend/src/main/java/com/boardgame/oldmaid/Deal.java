package com.boardgame.oldmaid;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

// 나눈 직후: 첫 사람, 짝을 버린 손패, 사람마다 버린 짝(첫 사람부터 순서).
public record Deal(PlayerId first, Hands hands, Map<PlayerId, List<CardPair>> pairs) {

    private static final int MIN_HOLDERS = 2;

    // R6
    public static Deal of(PlayerId first, List<PlayerId> order, Hands hands) {
        Map<PlayerId, List<CardPair>> pairs = new LinkedHashMap<>();
        order.forEach(player -> pairs.put(player, hands.of(player).discardPairs()));
        return new Deal(first, hands, pairs);
    }

    // R7
    public boolean isPlayable() {
        return hands.holderCount() >= MIN_HOLDERS;
    }
}
