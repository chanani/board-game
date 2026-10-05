package com.boardgame.record.domain;

import com.boardgame.game.GameType;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "game_match")
public class GameMatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "match_key", nullable = false, unique = true, length = 36)
    private String matchKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "game_type", nullable = false, length = 30)
    private GameType gameType;

    @Embedded
    private MatchPeriod period;

    protected GameMatch() {
    }

    private GameMatch(String matchKey, GameType gameType, MatchPeriod period) {
        this.matchKey = matchKey;
        this.gameType = gameType;
        this.period = period;
    }

    public static GameMatch start(String matchKey, GameType gameType, Instant startedAt) {
        return new GameMatch(matchKey, gameType, MatchPeriod.startingAt(startedAt));
    }

    public void finish(Instant endedAt) {
        period = period.endAt(endedAt);
    }

    public boolean isFinished() {
        return period.isEnded();
    }

    public Long id() {
        return id;
    }

    public String matchKey() {
        return matchKey;
    }

    public GameType gameType() {
        return gameType;
    }

    public Instant startedAt() {
        return period.startedAt();
    }

    public Instant endedAt() {
        return period.endedAt();
    }
}
