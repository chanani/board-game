package com.boardgame.friend.domain;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {

    List<FriendRequest> findByPartiesReceiverIdOrderByIdDesc(long receiverId);

    List<FriendRequest> findByPartiesRequesterIdOrderByIdDesc(long requesterId);

    Optional<FriendRequest> findByPartiesRequesterIdAndPartiesReceiverId(long requesterId, long receiverId);

    /** 두 사람 사이에 오간 요청을 방향과 상관없이 모두 찾는다(친구가 되면 남은 요청은 의미가 없어 함께 지운다). */
    @Query("select r from FriendRequest r where (r.parties.requesterId = :memberId and r.parties.receiverId = :otherId) "
            + "or (r.parties.requesterId = :otherId and r.parties.receiverId = :memberId)")
    List<FriendRequest> findBetween(@Param("memberId") long memberId, @Param("otherId") long otherId);
}
