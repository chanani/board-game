package com.boardgame.oldmaid.view;

import com.boardgame.oldmaid.OldMaidEndReason;
import com.boardgame.oldmaid.OldMaidEvent;
import com.boardgame.oldmaid.OldMaidEventType;
import com.boardgame.oldmaid.PlayerId;
import java.util.List;

public record OldMaidEventView(long seq, OldMaidEventType type, Long actorId, Long targetId,
                               List<OldMaidCardView> cards, Integer count, OldMaidEndReason reason, boolean auto) {

    public static OldMaidEventView of(OldMaidEvent event) {
        return new OldMaidEventView(event.seq(), event.type(), idOf(event.actor()), idOf(event.target()),
                OldMaidCardView.listOf(event.cards()), event.count(), event.reason(), event.auto());
    }

    private static Long idOf(PlayerId player) {
        if (player == null) {
            return null;
        }
        return player.value();
    }
}
