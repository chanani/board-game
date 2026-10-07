package com.boardgame.oldmaid;

import com.boardgame.game.turn.AutoActorLog;
import com.boardgame.game.turn.StageTiming;
import java.util.List;

public record OldMaidViewContext(OldMaidMatch match, StageTiming timing, AutoActorLog autoActors) {

    public List<Long> participantIds() {
        return match.participantIds();
    }

    public long startedAtMillis() {
        return match.startedAtMillis();
    }
}
