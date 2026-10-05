package com.boardgame.record.domain;

import com.boardgame.game.GameType;
import com.boardgame.game.ResultType;
import jakarta.persistence.Embedded;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "member_game_stat")
public class MemberGameStat {

    public static final int RANKING_MIN_MATCHES = 5;

    @EmbeddedId
    private MemberGameStatId id;

    @Embedded
    private ResultCounts matches;

    @Embedded
    private RoundRecord rounds;

    protected MemberGameStat() {
    }

    private MemberGameStat(MemberGameStatId id, ResultCounts matches, RoundRecord rounds) {
        this.id = id;
        this.matches = matches;
        this.rounds = rounds;
    }

    public static MemberGameStat empty(long memberId, GameType gameType) {
        return new MemberGameStat(new MemberGameStatId(memberId, gameType), ResultCounts.empty(), RoundRecord.empty());
    }

    public void recordMatch(ResultType result) {
        matches = matches.add(result);
    }

    public void recordRound(ResultType result, int score) {
        rounds = rounds.add(result, score);
    }

    public boolean isRanked() {
        return matches.total() >= RANKING_MIN_MATCHES;
    }

    public long memberId() {
        return id.memberId();
    }

    public GameType gameType() {
        return id.gameType();
    }

    public ResultCounts matches() {
        return matches;
    }

    public RoundRecord rounds() {
        return rounds;
    }
}
