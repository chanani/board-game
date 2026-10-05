package com.boardgame.record.domain;

import com.boardgame.game.GameType;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class MemberGameStatId implements Serializable {

    @Column(name = "member_id", nullable = false)
    private long memberId;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "game_type", nullable = false, length = 30)
    private GameType gameType;

    protected MemberGameStatId() {
    }

    public MemberGameStatId(long memberId, GameType gameType) {
        this.memberId = memberId;
        this.gameType = gameType;
    }

    public long memberId() {
        return memberId;
    }

    public GameType gameType() {
        return gameType;
    }

    @Override
    public boolean equals(Object other) {
        if (!(other instanceof MemberGameStatId that)) {
            return false;
        }
        return memberId == that.memberId && gameType == that.gameType;
    }

    @Override
    public int hashCode() {
        return Objects.hash(memberId, gameType);
    }
}
