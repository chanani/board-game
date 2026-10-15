package com.boardgame.record.domain;

import com.boardgame.game.GameType;
import jakarta.persistence.Embedded;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import java.time.Instant;

/** 수박게임 혼자 하기 S6: 회원별·게임별 혼자 한 게임의 최고 점수. 승패·평균 점수와 따로 둔다. */
@Entity
@Table(name = "solo_best_score")
public class SoloBestScore {

    @EmbeddedId
    private MemberGameStatId id;

    @Embedded
    private BestScore best;

    protected SoloBestScore() {
    }

    private SoloBestScore(MemberGameStatId id, BestScore best) {
        this.id = id;
        this.best = best;
    }

    public static SoloBestScore first(long memberId, GameType gameType, int score, Instant achievedAt) {
        return new SoloBestScore(new MemberGameStatId(memberId, gameType), new BestScore(score, achievedAt));
    }

    /** 지금 최고 점수보다 엄격히 높을 때만 바꾼다. 바꿨으면 true. */
    public boolean offer(int score, Instant achievedAt) {
        if (!best.isBeatenBy(score)) {
            return false;
        }
        best = new BestScore(score, achievedAt);
        return true;
    }

    public long memberId() {
        return id.memberId();
    }

    public GameType gameType() {
        return id.gameType();
    }

    public int score() {
        return best.score();
    }

    public Instant achievedAt() {
        return best.achievedAt();
    }
}
