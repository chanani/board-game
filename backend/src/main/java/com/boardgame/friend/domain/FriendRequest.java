package com.boardgame.friend.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.common.persistence.BaseTimeEntity;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/**
 * 아직 답하지 않은 친구 요청. 수락·거절·취소하면 줄을 지운다(수락이면 Friendship이 대신 생긴다).
 * 그래서 거절당한 뒤에도 다시 요청할 수 있다.
 */
@Entity
@Table(name = "friend_request",
        uniqueConstraints = @UniqueConstraint(name = "uk_friend_request_parties",
                columnNames = {"requester_id", "receiver_id"}),
        indexes = @Index(name = "idx_friend_request_receiver", columnList = "receiver_id"))
public class FriendRequest extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Embedded
    private RequestParties parties;

    protected FriendRequest() {
    }

    private FriendRequest(RequestParties parties) {
        this.parties = parties;
    }

    public static FriendRequest send(long requesterId, long receiverId) {
        return new FriendRequest(RequestParties.of(requesterId, receiverId));
    }

    /** 받은 사람만 수락할 수 있다. 수락하면 두 사람의 친구 관계를 돌려준다. */
    public Friendship acceptBy(long memberId) {
        ensureReceivedBy(memberId);
        return Friendship.between(parties.requesterId(), parties.receiverId());
    }

    /** 받은 사람만 수락·거절할 수 있다. 남의 요청은 없는 요청처럼 보인다. */
    public void ensureReceivedBy(long memberId) {
        if (!parties.isReceivedBy(memberId)) {
            throw new BusinessException(ErrorCode.FRIEND_REQUEST_NOT_FOUND);
        }
    }

    /** 보낸 사람만 취소할 수 있다. */
    public void ensureSentBy(long memberId) {
        if (!parties.isSentBy(memberId)) {
            throw new BusinessException(ErrorCode.FRIEND_REQUEST_NOT_FOUND);
        }
    }

    public Long id() {
        return id;
    }

    public long requesterId() {
        return parties.requesterId();
    }

    public long receiverId() {
        return parties.receiverId();
    }
}
