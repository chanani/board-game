package com.boardgame.friend.domain;

import com.boardgame.common.persistence.BaseTimeEntity;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/** 서로 친구인 한 쌍. 한 줄이 양쪽 모두의 친구 관계라, 지우면 두 사람 목록에서 함께 사라진다. */
@Entity
@Table(name = "friendship",
        uniqueConstraints = @UniqueConstraint(name = "uk_friendship_pair",
                columnNames = {"member_low_id", "member_high_id"}),
        indexes = @Index(name = "idx_friendship_high", columnList = "member_high_id"))
public class Friendship extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Embedded
    private FriendPair pair;

    protected Friendship() {
    }

    private Friendship(FriendPair pair) {
        this.pair = pair;
    }

    public static Friendship between(long memberId, long otherId) {
        return new Friendship(FriendPair.of(memberId, otherId));
    }

    public long friendOf(long memberId) {
        return pair.otherOf(memberId);
    }

    public Long id() {
        return id;
    }
}
