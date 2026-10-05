package com.boardgame.record.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

@Entity
@Table(name = "match_round",
        uniqueConstraints = @UniqueConstraint(columnNames = {"match_id", "round_no"}))
public class MatchRound {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "match_id", nullable = false)
    private GameMatch match;

    @Column(name = "round_no", nullable = false)
    private int roundNumber;

    @Column(name = "ended_at", nullable = false)
    private Instant endedAt;

    protected MatchRound() {
    }

    private MatchRound(GameMatch match, int roundNumber, Instant endedAt) {
        this.match = match;
        this.roundNumber = roundNumber;
        this.endedAt = endedAt;
    }

    public static MatchRound of(GameMatch match, int roundNumber, Instant endedAt) {
        return new MatchRound(match, roundNumber, endedAt);
    }

    public GameMatch match() {
        return match;
    }

    public int roundNumber() {
        return roundNumber;
    }
}
