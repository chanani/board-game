package com.boardgame.room.api;

public record RoomMemberResponse(long id, String nickname, boolean host, boolean connected, long offlineSeconds,
                                 boolean ready) {
}
