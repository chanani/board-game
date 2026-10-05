package com.boardgame.record.domain;

import com.boardgame.game.ResultType;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(name = "round_participant",
        indexes = @Index(name = "idx_round_participant_member", columnList = "member_id"),
        uniqueConstraints = @UniqueConstraint(columnNames = {"round_id", "member_id"}))
public class RoundParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "round_id", nullable = false)
    private MatchRound round;

    @Column(name = "member_id", nullable = false)
    private long memberId;

    @Embedded
    private RoundOutcomeRecord outcome;

    protected RoundParticipant() {
    }

    private RoundParticipant(MatchRound round, long memberId, RoundOutcomeRecord outcome) {
        this.round = round;
        this.memberId = memberId;
        this.outcome = outcome;
    }

    public static RoundParticipant of(MatchRound round, long memberId, ResultType result, int score) {
        return new RoundParticipant(round, memberId, new RoundOutcomeRecord(result, score));
    }

    public MatchRound round() {
        return round;
    }

    public long memberId() {
        return memberId;
    }

    public ResultType result() {
        return outcome.result();
    }

    public int score() {
        return outcome.score();
    }
}
