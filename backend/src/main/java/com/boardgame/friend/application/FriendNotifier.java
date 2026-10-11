package com.boardgame.friend.application;

public interface FriendNotifier {

    /** 한 사람의 열린 연결 모두에 친구 알림을 보낸다. 접속해 있지 않으면 아무 일도 없다. */
    void notify(long memberId, FriendSignal signal);
}
