package com.boardgame.record.domain;

import com.boardgame.game.ResultType;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.AttributeOverrides;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Embedded;

@Embeddable
public class RoundRecord {

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "wins", column = @Column(name = "round_wins", nullable = false)),
            @AttributeOverride(name = "draws", column = @Column(name = "round_draws", nullable = false)),
            @AttributeOverride(name = "losses", column = @Column(name = "round_losses", nullable = false))})
    private ResultCounts counts;

    @Column(name = "round_score_sum", nullable = false)
    private long scoreSum;

    protected RoundRecord() {
    }

    private RoundRecord(ResultCounts counts, long scoreSum) {
        this.counts = counts;
        this.scoreSum = scoreSum;
    }

    public static RoundRecord empty() {
        return new RoundRecord(ResultCounts.empty(), 0);
    }

    public RoundRecord add(ResultType result, int score) {
        return new RoundRecord(counts.add(result), scoreSum + score);
    }

    public ResultCounts counts() {
        return counts;
    }

    public long scoreSum() {
        return scoreSum;
    }

    public Double winRate() {
        return counts.winRate();
    }

    public Double averageScore() {
        if (counts.total() == 0) {
            return null;
        }
        return (double) scoreSum / counts.total();
    }
}
