package com.boardgame.friend.api;

import com.boardgame.member.domain.Member;
import java.util.Comparator;

/** 친구 한 명. online은 지금 사이트에 연결(웹소켓)이 열려 있는지다. */
public record FriendResponse(long memberId, String nickname, String avatar, boolean online) {

    /** 접속 중인 친구를 위에, 그 안에서는 닉네임 순으로 둔다. */
    public static final Comparator<FriendResponse> ONLINE_FIRST =
            Comparator.comparing(FriendResponse::online).reversed().thenComparing(FriendResponse::nickname);

    public static FriendResponse of(Member member, boolean online) {
        return new FriendResponse(member.id(), member.nicknameValue(), member.avatar().key(), online);
    }
}
