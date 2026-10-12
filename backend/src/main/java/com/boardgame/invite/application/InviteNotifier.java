package com.boardgame.invite.application;

public interface InviteNotifier {

    /** 한 사람의 열린 연결 모두에 초대 알림을 보낸다. 접속해 있지 않으면 아무 일도 없다. */
    void notify(long memberId, InviteSignal signal);
}
