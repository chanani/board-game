package com.boardgame.room.application;

import java.util.concurrent.ScheduledFuture;

record ArmedTimer(TimerVersion version, ScheduledFuture<?> future) {

    boolean is(TimerVersion other) {
        return version.equals(other);
    }

    void cancel() {
        future.cancel(false);
    }
}
