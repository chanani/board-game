package com.boardgame.oldmaid.view;

import com.boardgame.oldmaid.OldMaidEndReason;
import com.boardgame.oldmaid.OldMaidResult;
import com.boardgame.oldmaid.PlayerId;
import java.util.List;

public record OldMaidResultView(OldMaidEndReason reason, List<OldMaidRankView> ranking, Long thiefId) {

    public static OldMaidResultView of(OldMaidResult result) {
        List<OldMaidRankView> ranking = result.ranking()
                .entries()
                .stream()
                .map(OldMaidRankView::of)
                .toList();
        Long thief = result.thief()
                .map(PlayerId::value)
                .orElse(null);
        return new OldMaidResultView(result.reason(), ranking, thief);
    }
}
