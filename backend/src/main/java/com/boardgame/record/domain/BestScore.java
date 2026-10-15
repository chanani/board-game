package com.boardgame.record.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.time.Instant;

/** 최고 점수와 그 점수를 낸 시각. */
@Embeddable
public class BestScore {

    @Column(name = "best_score", nullable = false)
    private int score;

    @Column(name = "achieved_at", nullable = false)
    private Instant achievedAt;

    protected BestScore() {
    }

    BestScore(int score, Instant achievedAt) {
        this.score = score;
        this.achievedAt = achievedAt;
    }

    boolean isBeatenBy(int other) {
        return other > score;
    }

    int score() {
        return score;
    }

    Instant achievedAt() {
        return achievedAt;
    }
}
