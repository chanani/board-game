package com.boardgame.record.domain;

import com.boardgame.game.ResultType;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class ResultCounts {

    @Column(name = "wins", nullable = false)
    private int wins;

    @Column(name = "draws", nullable = false)
    private int draws;

    @Column(name = "losses", nullable = false)
    private int losses;

    protected ResultCounts() {
    }

    private ResultCounts(int wins, int draws, int losses) {
        this.wins = wins;
        this.draws = draws;
        this.losses = losses;
    }

    public static ResultCounts empty() {
        return new ResultCounts(0, 0, 0);
    }

    public ResultCounts add(ResultType result) {
        return switch (result) {
            case WIN -> new ResultCounts(wins + 1, draws, losses);
            case DRAW -> new ResultCounts(wins, draws + 1, losses);
            case LOSE -> new ResultCounts(wins, draws, losses + 1);
        };
    }

    public int wins() {
        return wins;
    }

    public int draws() {
        return draws;
    }

    public int losses() {
        return losses;
    }

    public int total() {
        return wins + draws + losses;
    }

    public Double winRate() {
        if (total() == 0) {
            return null;
        }
        return (double) wins / total();
    }
}
