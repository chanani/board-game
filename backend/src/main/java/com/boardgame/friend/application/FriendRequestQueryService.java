package com.boardgame.friend.application;

import com.boardgame.friend.api.FriendRequestResponse;
import com.boardgame.friend.api.FriendRequestsResponse;
import com.boardgame.friend.domain.FriendRequest;
import com.boardgame.friend.domain.FriendRequestRepository;
import com.boardgame.member.domain.Member;
import com.boardgame.member.domain.MemberRepository;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.function.ToLongFunction;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 내가 받은 요청과 보낸 요청을 상대 정보와 함께 보여 준다. */
@Service
@Transactional(readOnly = true)
public class FriendRequestQueryService {

    private final MemberRepository memberRepository;
    private final FriendRequestRepository requestRepository;

    public FriendRequestQueryService(MemberRepository memberRepository, FriendRequestRepository requestRepository) {
        this.memberRepository = memberRepository;
        this.requestRepository = requestRepository;
    }

    public FriendRequestsResponse requests(long memberId) {
        List<FriendRequest> incoming = requestRepository.findByPartiesReceiverIdOrderByIdDesc(memberId);
        List<FriendRequest> outgoing = requestRepository.findByPartiesRequesterIdOrderByIdDesc(memberId);
        return new FriendRequestsResponse(
                responses(incoming, FriendRequest::requesterId),
                responses(outgoing, FriendRequest::receiverId));
    }

    private List<FriendRequestResponse> responses(List<FriendRequest> requests, ToLongFunction<FriendRequest> other) {
        Map<Long, Member> members = membersOf(requests.stream().map(other::applyAsLong).toList());
        return requests.stream()
                .filter(request -> members.containsKey(other.applyAsLong(request)))
                .map(request -> FriendRequestResponse.of(request.id(), members.get(other.applyAsLong(request))))
                .toList();
    }

    private Map<Long, Member> membersOf(List<Long> memberIds) {
        return memberRepository.findAllById(memberIds).stream()
                .collect(Collectors.toMap(Member::id, Function.identity()));
    }
}
