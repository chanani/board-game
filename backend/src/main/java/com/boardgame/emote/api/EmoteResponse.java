package com.boardgame.emote.api;

import com.boardgame.emote.domain.Emote;

// id는 매번 달라, 같은 사람이 같은 표정을 다시 보내도 화면이 말풍선을 새로 띄울 수 있다.
public record EmoteResponse(String roomCode, long id, long memberId, String emote) {

    public static EmoteResponse of(String roomCode, long id, long memberId, Emote emote) {
        return new EmoteResponse(roomCode, id, memberId, emote.name());
    }
}
