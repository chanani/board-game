package com.boardgame.record.domain;

import com.boardgame.game.ResultType;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

@Embeddable
public class RoundOutcomeRecord {

    @Enumerated(EnumType.STRING)
    @Column(name = "result", nullable = false, length = 10)
    private ResultType result;

    @Column(name = "score", nullable = false)
    private int score;

    protected RoundOutcomeRecord() {
    }

    public RoundOutcomeRecord(ResultType result, int score) {
        this.result = result;
        this.score = score;
    }

    public ResultType result() {
        return result;
    }

    public int score() {
        return score;
    }
}
