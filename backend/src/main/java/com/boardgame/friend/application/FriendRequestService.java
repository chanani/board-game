package com.boardgame.friend.application;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.common.security.LoginMember;
import com.boardgame.friend.api.SendFriendRequest;
import com.boardgame.friend.api.SendFriendResponse;
import com.boardgame.friend.domain.FriendList;
import com.boardgame.friend.domain.FriendPair;
import com.boardgame.friend.domain.FriendRequest;
import com.boardgame.friend.domain.FriendRequestRepository;
import com.boardgame.friend.domain.Friendship;
import com.boardgame.friend.domain.FriendshipRepository;
import com.boardgame.member.domain.Member;
import com.boardgame.member.domain.MemberRepository;
import java.util.Optional;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 친구 요청을 보내고, 수락·거절·취소한다. */
@Service
@Transactional
public class FriendRequestService {

    private final MemberRepository memberRepository;
    private final FriendshipRepository friendshipRepository;
    private final FriendRequestRepository requestRepository;
    private final ApplicationEventPublisher eventPublisher;

    public FriendRequestService(MemberRepository memberRepository, FriendshipRepository friendshipRepository,
                                FriendRequestRepository requestRepository,
                                ApplicationEventPublisher eventPublisher) {
        this.memberRepository = memberRepository;
        this.friendshipRepository = friendshipRepository;
        this.requestRepository = requestRepository;
        this.eventPublisher = eventPublisher;
    }

    /** 상대가 이미 나에게 요청을 보내 두었다면 새 요청을 만들지 않고 바로 친구가 된다. */
    public SendFriendResponse send(LoginMember requester, SendFriendRequest request) {
        Member receiver = findTarget(request);
        long receiverId = receiver.id();
        ensureNotFriends(FriendPair.of(requester.id(), receiverId));
        ensureNotSent(requester.id(), receiverId);
        friendListOf(requester.id()).ensureRoom();
        Optional<FriendRequest> reverse =
                requestRepository.findByPartiesRequesterIdAndPartiesReceiverId(receiverId, requester.id());
        if (reverse.isPresent()) {
            befriend(reverse.get(), requester);
            return SendFriendResponse.accepted(receiver);
        }
        requestRepository.save(FriendRequest.send(requester.id(), receiverId));
        notify(receiverId, FriendSignal.requestReceived(requester.nickname()));
        return SendFriendResponse.requested(receiver);
    }

    public void accept(LoginMember acceptor, long requestId) {
        befriend(find(requestId), acceptor);
    }

    public void decline(long memberId, long requestId) {
        FriendRequest request = find(requestId);
        request.ensureReceivedBy(memberId);
        requestRepository.delete(request);
        notify(request.requesterId(), FriendSignal.updated());
    }

    public void cancel(long memberId, long requestId) {
        FriendRequest request = find(requestId);
        request.ensureSentBy(memberId);
        requestRepository.delete(request);
        notify(request.receiverId(), FriendSignal.updated());
    }

    private void befriend(FriendRequest request, LoginMember acceptor) {
        Friendship friendship = request.acceptBy(acceptor.id());
        long requesterId = request.requesterId();
        friendListOf(acceptor.id()).ensureRoom();
        friendListOf(requesterId).ensureRoom();
        friendshipRepository.save(friendship);
        requestRepository.deleteAll(requestRepository.findBetween(requesterId, acceptor.id()));
        notify(requesterId, FriendSignal.requestAccepted(acceptor.nickname()));
    }

    private Member findTarget(SendFriendRequest request) {
        return lookUp(request).orElseThrow(() -> new BusinessException(ErrorCode.MEMBER_NOT_FOUND));
    }

    private Optional<Member> lookUp(SendFriendRequest request) {
        if (request.hasMemberId()) {
            return memberRepository.findById(request.memberId());
        }
        return memberRepository.findByNicknameValue(request.strippedNickname());
    }

    private FriendRequest find(long requestId) {
        return requestRepository.findById(requestId)
                .orElseThrow(() -> new BusinessException(ErrorCode.FRIEND_REQUEST_NOT_FOUND));
    }

    private void ensureNotFriends(FriendPair pair) {
        if (friendshipRepository.findByPair(pair).isPresent()) {
            throw new BusinessException(ErrorCode.ALREADY_FRIENDS);
        }
    }

    private void ensureNotSent(long requesterId, long receiverId) {
        Optional<FriendRequest> sent =
                requestRepository.findByPartiesRequesterIdAndPartiesReceiverId(requesterId, receiverId);
        if (sent.isPresent()) {
            throw new BusinessException(ErrorCode.FRIEND_REQUEST_ALREADY_SENT);
        }
    }

    private FriendList friendListOf(long memberId) {
        return friendshipRepository.friendListOf(memberId);
    }

    private void notify(long memberId, FriendSignal signal) {
        eventPublisher.publishEvent(new FriendEvent(memberId, signal));
    }
}
