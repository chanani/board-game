package com.boardgame.record.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.time.Instant;

@Embeddable
public class MatchPeriod {

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    protected MatchPeriod() {
    }

    private MatchPeriod(Instant startedAt, Instant endedAt) {
        this.startedAt = startedAt;
        this.endedAt = endedAt;
    }

    public static MatchPeriod startingAt(Instant startedAt) {
        return new MatchPeriod(startedAt, null);
    }

    public MatchPeriod endAt(Instant endedAt) {
        return new MatchPeriod(startedAt, endedAt);
    }

    public boolean isEnded() {
        return endedAt != null;
    }

    public Instant startedAt() {
        return startedAt;
    }

    public Instant endedAt() {
        return endedAt;
    }
}
