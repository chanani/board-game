package com.boardgame.record.domain;

import com.boardgame.game.ResultType;
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
@Table(name = "match_participant",
        indexes = @Index(name = "idx_match_participant_member", columnList = "member_id"),
        uniqueConstraints = @UniqueConstraint(columnNames = {"match_id", "member_id"}))
public class MatchParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "match_id", nullable = false)
    private GameMatch match;

    @Embedded
    private ParticipantSeat seat;

    @Embedded
    private ParticipantOutcome outcome;

    protected MatchParticipant() {
    }

    private MatchParticipant(GameMatch match, ParticipantSeat seat, ParticipantOutcome outcome) {
        this.match = match;
        this.seat = seat;
        this.outcome = outcome;
    }

    public static MatchParticipant join(GameMatch match, long memberId, int seat) {
        return new MatchParticipant(match, new ParticipantSeat(memberId, seat), ParticipantOutcome.pending());
    }

    public void finish(ResultType result, int tokens) {
        outcome = ParticipantOutcome.of(result, tokens);
    }

    public GameMatch match() {
        return match;
    }

    public long memberId() {
        return seat.memberId();
    }

    public int seat() {
        return seat.seat();
    }

    public ResultType result() {
        return outcome.result();
    }

    public int tokens() {
        return outcome.tokens();
    }
}
