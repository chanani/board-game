package com.boardgame.invite.api;

import com.boardgame.common.security.LoginMember;
import com.boardgame.invite.application.RoomInviteService;
import com.boardgame.room.api.RoomResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rooms/{code}/invites")
public class RoomInviteController {

    private final RoomInviteService inviteService;

    public RoomInviteController(RoomInviteService inviteService) {
        this.inviteService = inviteService;
    }

    /** 대기실 참가자가 접속 중인 친구를 방으로 부른다. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public InviteSentResponse send(@PathVariable String code, @AuthenticationPrincipal LoginMember member,
                                   @RequestBody(required = false) InviteFriendRequest request) {
        return inviteService.send(code, member, request);
    }

    /** 초대받은 사람이 방에 들어간다. 비공개방이어도 비밀번호를 묻지 않는다. */
    @PostMapping("/{inviteId}/accept")
    public RoomResponse accept(@PathVariable String code, @PathVariable String inviteId,
                               @AuthenticationPrincipal LoginMember member) {
        return inviteService.accept(code, member, inviteId);
    }

    @PostMapping("/{inviteId}/decline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void decline(@PathVariable String code, @PathVariable String inviteId,
                        @AuthenticationPrincipal LoginMember member) {
        inviteService.decline(code, member, inviteId);
    }
}
