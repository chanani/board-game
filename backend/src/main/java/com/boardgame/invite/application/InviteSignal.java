package com.boardgame.invite.application;

import com.boardgame.game.GameType;
import com.boardgame.invite.domain.RoomInvite;
import com.boardgame.room.api.RoomSummaryResponse;

/**
 * /user/queue/invites로 한 사람에게 가는 알림. INVITED는 초대받은 사람에게(상대 = 초대한 사람),
 * DECLINED는 초대한 사람에게(상대 = 거절한 사람) 간다. 방 비밀번호는 싣지 않는다.
 */
public record InviteSignal(InviteSignalType type, String inviteId, long memberId, String nickname,
                           String roomCode, String roomName, GameType gameType, String gameTypeName,
                           Long expiresInSeconds) {

    public static InviteSignal invited(RoomInvite invite, String inviterNickname, RoomSummaryResponse room) {
        return new InviteSignal(InviteSignalType.INVITED, invite.idValue(), invite.inviterId(), inviterNickname,
                room.code(), room.name(), room.gameType(), room.gameTypeName(), RoomInvite.LIFETIME.toSeconds());
    }

    public static InviteSignal declined(long declinerId, String declinerNickname) {
        return new InviteSignal(InviteSignalType.DECLINED, null, declinerId, declinerNickname,
                null, null, null, null, null);
    }
}
