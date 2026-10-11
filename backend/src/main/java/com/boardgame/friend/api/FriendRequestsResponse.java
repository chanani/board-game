package com.boardgame.friend.api;

import java.util.List;

/** 내가 받은 요청(incoming)과 내가 보낸 요청(outgoing). 둘 다 최근 것이 먼저다. */
public record FriendRequestsResponse(List<FriendRequestResponse> incoming, List<FriendRequestResponse> outgoing) {
}
