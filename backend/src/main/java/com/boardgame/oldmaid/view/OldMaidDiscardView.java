package com.boardgame.oldmaid.view;

import com.boardgame.oldmaid.DiscardedPair;
import java.util.List;

// 버린 짝 한 쌍과 버린 사람(공개 정보).
public record OldMaidDiscardView(long playerId, List<OldMaidCardView> cards) {

    public static OldMaidDiscardView of(DiscardedPair discarded) {
        return new OldMaidDiscardView(discarded.ownerId(), OldMaidCardView.listOf(discarded.cards()));
    }
}
