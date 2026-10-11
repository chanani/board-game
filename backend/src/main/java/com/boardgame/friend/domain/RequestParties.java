package com.boardgame.friend.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

/** 친구 요청을 보낸 사람과 받은 사람. */
@Embeddable
public class RequestParties {

    @Column(name = "requester_id", nullable = false)
    private long requesterId;

    @Column(name = "receiver_id", nullable = false)
    private long receiverId;

    protected RequestParties() {
    }

    private RequestParties(long requesterId, long receiverId) {
        this.requesterId = requesterId;
        this.receiverId = receiverId;
    }

    public static RequestParties of(long requesterId, long receiverId) {
        if (requesterId == receiverId) {
            throw new BusinessException(ErrorCode.CANNOT_FRIEND_SELF);
        }
        return new RequestParties(requesterId, receiverId);
    }

    public boolean isSentBy(long memberId) {
        return requesterId == memberId;
    }

    public boolean isReceivedBy(long memberId) {
        return receiverId == memberId;
    }

    public long requesterId() {
        return requesterId;
    }

    public long receiverId() {
        return receiverId;
    }
}
