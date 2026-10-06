// B/uno/UnoTimer.java
package com.boardgame.uno;

import java.time.Clock;
import java.time.Instant;
import java.util.List;

public class UnoTimer {

    private final UnoCountdown countdown;
    private final UnoAutoActors autoActors = new UnoAutoActors();

    public UnoTimer(Clock clock, StageSeq start) {
        this.countdown = new UnoCountdown(clock, start);
    }

    public void humanActed(StageSeq now) {
        autoActors.clear();
        countdown.follow(now);
    }

    public void autoActed(PlayerId actor, StageSeq now) {
        autoActors.replaceWith(List.of(actor));
        countdown.follow(now);
    }

    public void follow(StageSeq now) {
        countdown.follow(now);
    }

    public Instant deadline() {
        return countdown.deadline();
    }

    public UnoTiming timing(boolean waiting) {
        return countdown.timing(waiting);
    }

    public UnoAutoActors autoActors() {
        return autoActors;
    }
}
