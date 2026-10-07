package com.boardgame.oldmaid;

import java.util.List;

// R3: 버린 짝 한 쌍(손패 순서로 앞 카드가 first).
public record CardPair(PlayingCard first, PlayingCard second) {

    public List<PlayingCard> cards() {
        return List.of(first, second);
    }
}
