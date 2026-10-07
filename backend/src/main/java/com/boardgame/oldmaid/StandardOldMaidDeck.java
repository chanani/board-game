package com.boardgame.oldmaid;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

// R1·R2: 카드 번호 순서의 53장.
public final class StandardOldMaidDeck {

    private StandardOldMaidDeck() {
    }

    public static List<PlayingCard> cards() {
        List<PlayingCard> cards = new ArrayList<>(Arrays.stream(Suit.values())
                .flatMap(suit -> Rank.STANDARD.stream().map(rank -> PlayingCard.of(suit, rank)))
                .toList());
        cards.add(PlayingCard.joker());
        return List.copyOf(cards);
    }
}
