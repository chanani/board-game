package com.boardgame.invite.application;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.common.security.LoginMember;
import com.boardgame.friend.domain.FriendPair;
import com.boardgame.friend.domain.FriendshipRepository;
import com.boardgame.invite.api.InviteFriendRequest;
import com.boardgame.invite.api.InviteSentResponse;
import com.boardgame.invite.domain.InviteId;
import com.boardgame.invite.domain.InviteParties;
import com.boardgame.invite.domain.InviteRoute;
import com.boardgame.invite.domain.RoomInvite;
import com.boardgame.invite.domain.RoomInvites;
import com.boardgame.room.api.RoomResponse;
import com.boardgame.room.api.RoomSummaryResponse;
import com.boardgame.room.application.PresenceTracker;
import com.boardgame.room.application.RoomService;
import com.boardgame.room.domain.RoomCode;
import java.time.Clock;
import java.util.Optional;
import org.springframework.stereotype.Service;

/** 대기실에서 친구를 부르고, 초대받은 사람이 그 초대로 들어오거나 거절한다. */
@Service
public class RoomInviteService {

    private final RoomService roomService;
    private final FriendshipRepository friendshipRepository;
    private final PresenceTracker presence;
    private final RoomInvites invites;
    private final InviteNotifier notifier;
    private final Clock clock;

    public RoomInviteService(RoomService roomService, FriendshipRepository friendshipRepository,
                             PresenceTracker presence, RoomInvites invites, InviteNotifier notifier, Clock clock) {
        this.roomService = roomService;
        this.friendshipRepository = friendshipRepository;
        this.presence = presence;
        this.invites = invites;
        this.notifier = notifier;
        this.clock = clock;
    }

    // 방 확인은 방 잠금 안에서 잠깐 하고, 친구 확인(DB)은 잠금 밖에서 한다. 그사이 방이 달라져도 참가할 때 다시 확인한다.
    public InviteSentResponse send(String rawCode, LoginMember inviter, InviteFriendRequest request) {
        InviteParties parties = InviteParties.of(inviter.id(), friendIdOf(request));
        RoomSummaryResponse room = roomService.invitable(rawCode, parties.inviterId(), parties.inviteeId());
        requireFriends(parties);
        requireOnline(parties.inviteeId());
        RoomInvite invite = invites.issue(new InviteRoute(parties, RoomCode.parse(rawCode)), clock.instant());
        notifier.notify(parties.inviteeId(), InviteSignal.invited(invite, inviter.nickname(), room));
        return InviteSentResponse.cooldown(RoomInvite.COOLDOWN);
    }

    /** 초대가 살아 있으면 비밀번호 없이 들어간다. 들어가지 못하면 초대는 만료될 때까지 남는다. 방이 사라졌으면 ROOM_NOT_FOUND. */
    public RoomResponse accept(String rawCode, LoginMember invitee, String inviteId) {
        RoomInvite invite = find(rawCode, invitee.id(), inviteId)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVITE_EXPIRED));
        RoomResponse room = roomService.joinInvited(rawCode, invitee, invite.inviterId());
        invites.remove(invite.id());
        return room;
    }

    /** 이미 만료된 초대를 거절하면 아무 일도 없다. */
    public void decline(String rawCode, LoginMember invitee, String inviteId) {
        find(rawCode, invitee.id(), inviteId)
                .ifPresent(invite -> turnDown(invite, invitee));
    }

    private void turnDown(RoomInvite invite, LoginMember invitee) {
        invites.remove(invite.id());
        notifier.notify(invite.inviterId(), InviteSignal.declined(invitee.id(), invitee.nickname()));
    }

    private Optional<RoomInvite> find(String rawCode, long inviteeId, String inviteId) {
        RoomCode code = RoomCode.parse(rawCode);
        return invites.find(new InviteId(inviteId), clock.instant())
                .filter(invite -> invite.invites(inviteeId, code));
    }

    private Long friendIdOf(InviteFriendRequest request) {
        if (request == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        return request.friendId();
    }

    private void requireFriends(InviteParties parties) {
        FriendPair pair = FriendPair.of(parties.inviterId(), parties.inviteeId());
        if (friendshipRepository.findByPair(pair).isEmpty()) {
            throw new BusinessException(ErrorCode.INVITE_NOT_FRIEND);
        }
    }

    private void requireOnline(long memberId) {
        if (!presence.isConnected(memberId)) {
            throw new BusinessException(ErrorCode.INVITE_FRIEND_OFFLINE);
        }
    }
}
