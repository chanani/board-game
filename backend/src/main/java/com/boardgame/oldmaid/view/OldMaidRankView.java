package com.boardgame.oldmaid.view;

import com.boardgame.oldmaid.Placement;
import com.boardgame.oldmaid.RankedPlayer;

public record OldMaidRankView(long playerId, int rank, Placement placement) {

    public static OldMaidRankView of(RankedPlayer entry) {
        return new OldMaidRankView(entry.player().value(), entry.rank().value(), entry.placement());
    }
}
