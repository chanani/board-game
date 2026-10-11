package com.boardgame.friend.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.List;

/** 한 회원의 친구 목록. 친구 수 제한을 여기서 지킨다. */
public final class FriendList {

    public static final int MAX_FRIENDS = 100;

    private final long ownerId;
    private final List<Friendship> friendships;

    private FriendList(long ownerId, List<Friendship> friendships) {
        this.ownerId = ownerId;
        this.friendships = List.copyOf(friendships);
    }

    public static FriendList of(long ownerId, List<Friendship> friendships) {
        return new FriendList(ownerId, friendships);
    }

    /** 친구를 한 명 더 만들 자리가 없으면 막는다. */
    public void ensureRoom() {
        if (friendships.size() >= MAX_FRIENDS) {
            throw new BusinessException(ErrorCode.FRIEND_LIMIT_REACHED);
        }
    }

    public List<Long> friendIds() {
        return friendships.stream()
                .map(friendship -> friendship.friendOf(ownerId))
                .toList();
    }
}
