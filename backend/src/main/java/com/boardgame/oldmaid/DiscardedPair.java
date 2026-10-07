package com.boardgame.oldmaid;

import java.util.List;

// 버린 짝 한 쌍과 그 짝을 버린 사람(모두에게 공개).
public record DiscardedPair(PlayerId owner, CardPair pair) {

    public long ownerId() {
        return owner.value();
    }

    public List<PlayingCard> cards() {
        return pair.cards();
    }
}
