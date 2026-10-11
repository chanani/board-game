package com.boardgame.friend.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.util.Objects;

/** 친구인 두 회원. 번호가 작은 쪽을 앞에 두어, 누가 먼저 요청했든 한 쌍은 한 줄로만 저장된다. */
@Embeddable
public class FriendPair {

    @Column(name = "member_low_id", nullable = false)
    private long lowId;

    @Column(name = "member_high_id", nullable = false)
    private long highId;

    protected FriendPair() {
    }

    private FriendPair(long lowId, long highId) {
        this.lowId = lowId;
        this.highId = highId;
    }

    public static FriendPair of(long memberId, long otherId) {
        if (memberId == otherId) {
            throw new BusinessException(ErrorCode.CANNOT_FRIEND_SELF);
        }
        return new FriendPair(Math.min(memberId, otherId), Math.max(memberId, otherId));
    }

    /** 이 쌍에서 memberId가 아닌 쪽. */
    public long otherOf(long memberId) {
        if (memberId == lowId) {
            return highId;
        }
        return lowId;
    }

    public long lowId() {
        return lowId;
    }

    public long highId() {
        return highId;
    }

    @Override
    public boolean equals(Object other) {
        if (!(other instanceof FriendPair that)) {
            return false;
        }
        return lowId == that.lowId && highId == that.highId;
    }

    @Override
    public int hashCode() {
        return Objects.hash(lowId, highId);
    }
}
