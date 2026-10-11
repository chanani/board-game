package com.boardgame.friend.application;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.friend.api.FriendResponse;
import com.boardgame.friend.domain.FriendList;
import com.boardgame.friend.domain.FriendPair;
import com.boardgame.friend.domain.Friendship;
import com.boardgame.friend.domain.FriendshipRepository;
import com.boardgame.member.domain.MemberRepository;
import com.boardgame.room.application.PresenceTracker;
import java.util.List;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 친구 목록을 보여 주고 친구를 지운다. */
@Service
@Transactional(readOnly = true)
public class FriendService {

    private final MemberRepository memberRepository;
    private final FriendshipRepository friendshipRepository;
    private final PresenceTracker presence;
    private final ApplicationEventPublisher eventPublisher;

    public FriendService(MemberRepository memberRepository, FriendshipRepository friendshipRepository,
                         PresenceTracker presence, ApplicationEventPublisher eventPublisher) {
        this.memberRepository = memberRepository;
        this.friendshipRepository = friendshipRepository;
        this.presence = presence;
        this.eventPublisher = eventPublisher;
    }

    /** 접속 중인 친구가 위에 온다. 접속 여부는 방 안팎과 상관없이 사이트에 열린 연결이 있는지로 본다. */
    public List<FriendResponse> friends(long memberId) {
        FriendList friends = friendshipRepository.friendListOf(memberId);
        return memberRepository.findAllById(friends.friendIds()).stream()
                .map(member -> FriendResponse.of(member, presence.isConnected(member.id())))
                .sorted(FriendResponse.ONLINE_FIRST)
                .toList();
    }

    /** 한 줄이 두 사람 모두의 친구 관계라, 지우면 양쪽 목록에서 함께 사라진다. */
    @Transactional
    public void remove(long memberId, long friendId) {
        Friendship friendship = friendshipRepository.findByPair(FriendPair.of(memberId, friendId))
                .orElseThrow(() -> new BusinessException(ErrorCode.FRIEND_NOT_FOUND));
        friendshipRepository.delete(friendship);
        eventPublisher.publishEvent(new FriendEvent(friendId, FriendSignal.updated()));
    }
}
