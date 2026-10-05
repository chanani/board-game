package com.boardgame.record.domain;

import com.boardgame.game.ResultType;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

@Embeddable
public class ParticipantOutcome {

    @Enumerated(EnumType.STRING)
    @Column(name = "result", length = 10)
    private ResultType result;

    @Column(name = "tokens", nullable = false)
    private int tokens;

    protected ParticipantOutcome() {
    }

    private ParticipantOutcome(ResultType result, int tokens) {
        this.result = result;
        this.tokens = tokens;
    }

    public static ParticipantOutcome pending() {
        return new ParticipantOutcome(null, 0);
    }

    public static ParticipantOutcome of(ResultType result, int tokens) {
        return new ParticipantOutcome(result, tokens);
    }

    public ResultType result() {
        return result;
    }

    public int tokens() {
        return tokens;
    }
}
