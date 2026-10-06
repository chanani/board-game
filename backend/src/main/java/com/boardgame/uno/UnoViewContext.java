// B/uno/UnoViewContext.java
package com.boardgame.uno;

import java.util.List;

public record UnoViewContext(UnoMatch match, UnoTiming timing, UnoAutoActors autoActors) {

    public List<Long> participantIds() {
        return match.participantIds();
    }

    public long startedAtMillis() {
        return match.startedAtMillis();
    }
}
