package com.boardgame.friend.application;

/** /user/queue/friends로 한 사람에게 가는 알림. 받은 쪽은 친구 목록·요청을 다시 불러온다. nickname은 상대 닉네임. */
public record FriendSignal(FriendSignalType type, String nickname) {

    public static FriendSignal requestReceived(String requesterNickname) {
        return new FriendSignal(FriendSignalType.REQUEST_RECEIVED, requesterNickname);
    }

    public static FriendSignal requestAccepted(String acceptorNickname) {
        return new FriendSignal(FriendSignalType.REQUEST_ACCEPTED, acceptorNickname);
    }

    /** 거절·취소·삭제처럼 따로 알리지 않고 화면만 새로 고치게 하는 신호. */
    public static FriendSignal updated() {
        return new FriendSignal(FriendSignalType.UPDATED, null);
    }
}
