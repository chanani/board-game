package com.boardgame.friend.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;

@DataJpaTest
class FriendRepositoryTest {

    private static final long ALICE = 11L;
    private static final long BOB = 12L;
    private static final long CAROL = 13L;

    @Autowired
    private FriendshipRepository friendshipRepository;

    @Autowired
    private FriendRequestRepository requestRepository;

    @Test
    void 친구_관계는_어느_쪽에서_찾아도_나온다() {
        friendshipRepository.saveAndFlush(Friendship.between(BOB, ALICE));
        friendshipRepository.saveAndFlush(Friendship.between(BOB, CAROL));

        assertThat(friendshipRepository.friendListOf(ALICE).friendIds()).containsExactly(BOB);
        assertThat(friendshipRepository.friendListOf(BOB).friendIds()).containsExactlyInAnyOrder(ALICE, CAROL);
        assertThat(friendshipRepository.findByPair(FriendPair.of(ALICE, BOB))).isPresent();
        assertThat(friendshipRepository.findByPair(FriendPair.of(ALICE, CAROL))).isEmpty();
    }

    @Test
    void 같은_두_사람의_친구_관계는_한_줄만_저장된다() {
        friendshipRepository.saveAndFlush(Friendship.between(ALICE, BOB));

        assertThatThrownBy(() -> friendshipRepository.saveAndFlush(Friendship.between(BOB, ALICE)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void 같은_방향의_요청은_한_번만_저장된다() {
        requestRepository.saveAndFlush(FriendRequest.send(ALICE, BOB));

        assertThatThrownBy(() -> requestRepository.saveAndFlush(FriendRequest.send(ALICE, BOB)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void 받은_요청과_보낸_요청을_따로_찾고_두_사람_사이_요청은_방향과_상관없이_찾는다() {
        FriendRequest toBob = requestRepository.saveAndFlush(FriendRequest.send(ALICE, BOB));
        FriendRequest toAlice = requestRepository.saveAndFlush(FriendRequest.send(BOB, ALICE));
        requestRepository.saveAndFlush(FriendRequest.send(CAROL, BOB));

        assertThat(requestRepository.findByPartiesReceiverIdOrderByIdDesc(BOB))
                .extracting(FriendRequest::requesterId).containsExactly(CAROL, ALICE);
        assertThat(requestRepository.findByPartiesRequesterIdOrderByIdDesc(ALICE)).containsExactly(toBob);
        assertThat(requestRepository.findBetween(BOB, ALICE)).containsExactlyInAnyOrder(toBob, toAlice);
        assertThat(toBob.createdAt()).isNotNull();
    }
}
