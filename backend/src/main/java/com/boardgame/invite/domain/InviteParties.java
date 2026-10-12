package com.boardgame.invite.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;

/** 초대한 사람과 초대받은 사람. */
public record InviteParties(long inviterId, long inviteeId) {

    public static InviteParties of(long inviterId, Long friendId) {
        if (friendId == null || friendId == inviterId) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        return new InviteParties(inviterId, friendId);
    }
}
