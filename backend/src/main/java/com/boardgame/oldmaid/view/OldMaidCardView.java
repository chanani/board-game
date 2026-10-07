package com.boardgame.oldmaid.view;

import com.boardgame.oldmaid.PlayingCard;
import com.boardgame.oldmaid.Rank;
import com.boardgame.oldmaid.Suit;
import java.util.List;

// 조커는 suit = null, rank = "JOKER".
public record OldMaidCardView(int id, Suit suit, Rank rank) {

    public static OldMaidCardView of(PlayingCard card) {
        return new OldMaidCardView(card.id().value(), card.suit(), card.rank());
    }

    public static List<OldMaidCardView> listOf(List<PlayingCard> cards) {
        return cards.stream()
                .map(OldMaidCardView::of)
                .toList();
    }
}
