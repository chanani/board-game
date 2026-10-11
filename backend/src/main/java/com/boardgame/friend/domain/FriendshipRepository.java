package com.boardgame.friend.domain;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FriendshipRepository extends JpaRepository<Friendship, Long> {

    @Query("select f from Friendship f where f.pair.lowId = :memberId or f.pair.highId = :memberId")
    List<Friendship> findAllOf(@Param("memberId") long memberId);

    Optional<Friendship> findByPairLowIdAndPairHighId(long lowId, long highId);

    default FriendList friendListOf(long memberId) {
        return FriendList.of(memberId, findAllOf(memberId));
    }

    default Optional<Friendship> findByPair(FriendPair pair) {
        return findByPairLowIdAndPairHighId(pair.lowId(), pair.highId());
    }
}
