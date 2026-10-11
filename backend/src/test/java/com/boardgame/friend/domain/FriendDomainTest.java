package com.boardgame.friend.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import com.boardgame.common.error.ErrorCode;
import java.util.List;
import java.util.stream.LongStream;
import org.junit.jupiter.api.Test;

class FriendDomainTest {

    private static final long ALICE = 1L;
    private static final long BOB = 2L;
    private static final long CAROL = 3L;

    @Test
    void 친구_쌍은_누가_먼저든_같은_쌍이다() {
        assertThat(FriendPair.of(BOB, ALICE)).isEqualTo(FriendPair.of(ALICE, BOB));
        assertThat(FriendPair.of(BOB, ALICE).lowId()).isEqualTo(ALICE);
        assertThat(FriendPair.of(BOB, ALICE).highId()).isEqualTo(BOB);
    }

    @Test
    void 친구_관계는_양쪽에서_서로를_가리킨다() {
        Friendship friendship = Friendship.between(BOB, ALICE);

        assertThat(friendship.friendOf(ALICE)).isEqualTo(BOB);
        assertThat(friendship.friendOf(BOB)).isEqualTo(ALICE);
    }

    @Test
    void 나와는_친구가_될_수_없다() {
        assertError(() -> FriendPair.of(ALICE, ALICE), ErrorCode.CANNOT_FRIEND_SELF);
        assertError(() -> Friendship.between(ALICE, ALICE), ErrorCode.CANNOT_FRIEND_SELF);
        assertError(() -> FriendRequest.send(ALICE, ALICE), ErrorCode.CANNOT_FRIEND_SELF);
    }

    @Test
    void 받은_사람이_수락하면_두_사람의_친구_관계가_만들어진다() {
        FriendRequest request = FriendRequest.send(ALICE, BOB);

        Friendship friendship = request.acceptBy(BOB);

        assertThat(request.requesterId()).isEqualTo(ALICE);
        assertThat(request.receiverId()).isEqualTo(BOB);
        assertThat(friendship.friendOf(ALICE)).isEqualTo(BOB);
    }

    @Test
    void 보낸_사람이나_남은_수락_거절할_수_없다() {
        FriendRequest request = FriendRequest.send(ALICE, BOB);

        assertError(() -> request.acceptBy(ALICE), ErrorCode.FRIEND_REQUEST_NOT_FOUND);
        assertError(() -> request.acceptBy(CAROL), ErrorCode.FRIEND_REQUEST_NOT_FOUND);
        assertError(() -> request.ensureReceivedBy(ALICE), ErrorCode.FRIEND_REQUEST_NOT_FOUND);
        assertThatCode(() -> request.ensureReceivedBy(BOB)).doesNotThrowAnyException();
    }

    @Test
    void 보낸_사람만_취소할_수_있다() {
        FriendRequest request = FriendRequest.send(ALICE, BOB);

        assertError(() -> request.ensureSentBy(BOB), ErrorCode.FRIEND_REQUEST_NOT_FOUND);
        assertError(() -> request.ensureSentBy(CAROL), ErrorCode.FRIEND_REQUEST_NOT_FOUND);
        assertThatCode(() -> request.ensureSentBy(ALICE)).doesNotThrowAnyException();
    }

    @Test
    void 친구_목록은_주인이_아닌_쪽의_번호를_모은다() {
        FriendList friends = FriendList.of(BOB, List.of(Friendship.between(ALICE, BOB), Friendship.between(BOB, CAROL)));

        assertThat(friends.friendIds()).containsExactly(ALICE, CAROL);
    }

    @Test
    void 친구는_100명까지만_만들_수_있다() {
        assertThatCode(() -> friendsOfAlice(FriendList.MAX_FRIENDS - 1).ensureRoom()).doesNotThrowAnyException();
        assertError(() -> friendsOfAlice(FriendList.MAX_FRIENDS).ensureRoom(), ErrorCode.FRIEND_LIMIT_REACHED);
    }

    private FriendList friendsOfAlice(int count) {
        List<Friendship> friendships = LongStream.rangeClosed(1, count)
                .mapToObj(index -> Friendship.between(ALICE, ALICE + index))
                .toList();
        return FriendList.of(ALICE, friendships);
    }
}
