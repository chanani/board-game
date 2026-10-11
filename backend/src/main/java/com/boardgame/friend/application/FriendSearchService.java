package com.boardgame.friend.application;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.friend.api.FriendSearchResponse;
import com.boardgame.friend.domain.FriendPair;
import com.boardgame.friend.domain.FriendRelation;
import com.boardgame.friend.domain.FriendRequestRepository;
import com.boardgame.friend.domain.FriendshipRepository;
import com.boardgame.member.domain.Member;
import com.boardgame.member.domain.MemberRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 닉네임이 정확히 같은 회원을 찾아, 나와의 사이와 함께 보여 준다. 찾기만 하고 요청은 보내지 않는다. */
@Service
@Transactional(readOnly = true)
public class FriendSearchService {

    private final MemberRepository memberRepository;
    private final FriendshipRepository friendshipRepository;
    private final FriendRequestRepository requestRepository;

    public FriendSearchService(MemberRepository memberRepository, FriendshipRepository friendshipRepository,
                               FriendRequestRepository requestRepository) {
        this.memberRepository = memberRepository;
        this.friendshipRepository = friendshipRepository;
        this.requestRepository = requestRepository;
    }

    public FriendSearchResponse search(long memberId, String nickname) {
        Member found = memberRepository.findByNicknameValue(nickname.strip())
                .orElseThrow(() -> new BusinessException(ErrorCode.MEMBER_NOT_FOUND));
        return FriendSearchResponse.of(found, relationOf(memberId, found.id()));
    }

    private FriendRelation relationOf(long memberId, long otherId) {
        if (memberId == otherId) {
            return FriendRelation.SELF;
        }
        if (friendshipRepository.findByPair(FriendPair.of(memberId, otherId)).isPresent()) {
            return FriendRelation.FRIEND;
        }
        return requestRepository.findBetween(memberId, otherId).stream()
                .findFirst()
                .map(request -> request.relationFor(memberId))
                .orElse(FriendRelation.NONE);
    }
}
