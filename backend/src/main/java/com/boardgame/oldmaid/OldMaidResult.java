package com.boardgame.oldmaid;

import java.util.Optional;

// R16·R29·R30: 끝난 이유와 최종 등수.
public record OldMaidResult(OldMaidEndReason reason, Ranking ranking) {

    public PlayerId winner() {
        return ranking.winner().player();
    }

    public FinishRank rankOf(PlayerId player) {
        return ranking.rankOf(player);
    }

    public Optional<PlayerId> thief() {
        return ranking.thief();
    }

    public OldMaidEvent toEvent() {
        return OldMaidEvent.gameEnd(ranking.lastHolder(), reason);
    }
}
