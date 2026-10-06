package com.boardgame.uno.view;

import com.boardgame.uno.PlayerId;
import com.boardgame.uno.UnoColor;
import com.boardgame.uno.UnoEvent;
import com.boardgame.uno.UnoEventReason;
import com.boardgame.uno.UnoEventType;

public record UnoEventView(long seq, UnoEventType type, Long actorId, Long targetId, UnoCardView card,
                           UnoColor color, Integer count, UnoEventReason reason, boolean auto) {

    public static UnoEventView of(UnoEvent event) {
        UnoCardView card = event.card() == null ? null : UnoCardView.of(event.card());
        return new UnoEventView(event.seq(), event.type(), idOf(event.actor()), idOf(event.target()), card,
                event.color(), event.count(), event.reason(), event.auto());
    }

    private static Long idOf(PlayerId player) {
        if (player == null) {
            return null;
        }
        return player.value();
    }
}
