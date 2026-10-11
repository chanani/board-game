package com.boardgame.friend.api;

import com.boardgame.common.security.LoginMember;
import com.boardgame.friend.application.FriendRequestQueryService;
import com.boardgame.friend.application.FriendRequestService;
import com.boardgame.friend.application.FriendService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/friends")
public class FriendController {

    private final FriendService friendService;
    private final FriendRequestService requestService;
    private final FriendRequestQueryService requestQueryService;

    public FriendController(FriendService friendService, FriendRequestService requestService,
                            FriendRequestQueryService requestQueryService) {
        this.friendService = friendService;
        this.requestService = requestService;
        this.requestQueryService = requestQueryService;
    }

    @GetMapping
    public List<FriendResponse> friends(@AuthenticationPrincipal LoginMember member) {
        return friendService.friends(member.id());
    }

    @DeleteMapping("/{friendId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(@AuthenticationPrincipal LoginMember member, @PathVariable long friendId) {
        friendService.remove(member.id(), friendId);
    }

    @GetMapping("/requests")
    public FriendRequestsResponse requests(@AuthenticationPrincipal LoginMember member) {
        return requestQueryService.requests(member.id());
    }

    @PostMapping("/requests")
    @ResponseStatus(HttpStatus.CREATED)
    public SendFriendResponse send(@AuthenticationPrincipal LoginMember member,
                                   @RequestBody SendFriendRequest request) {
        return requestService.send(member, request);
    }

    @PostMapping("/requests/{requestId}/accept")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void accept(@AuthenticationPrincipal LoginMember member, @PathVariable long requestId) {
        requestService.accept(member, requestId);
    }

    @PostMapping("/requests/{requestId}/decline")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void decline(@AuthenticationPrincipal LoginMember member, @PathVariable long requestId) {
        requestService.decline(member.id(), requestId);
    }

    /** 내가 보낸 요청을 취소한다. */
    @DeleteMapping("/requests/{requestId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(@AuthenticationPrincipal LoginMember member, @PathVariable long requestId) {
        requestService.cancel(member.id(), requestId);
    }
}
