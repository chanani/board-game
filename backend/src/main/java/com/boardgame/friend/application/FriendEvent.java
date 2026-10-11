package com.boardgame.friend.application;

/** 친구 관계가 바뀌어 memberId에게 알려야 한다. 커밋된 뒤에만 보내서, 받은 쪽이 다시 불러올 때 바뀐 내용이 보이게 한다. */
public record FriendEvent(long memberId, FriendSignal signal) {
}
