package com.boardgame.room.api;

public record RoomMemberResponse(long id, String nickname, String avatar, boolean host, boolean connected,
                                 long offlineSeconds, boolean ready) {
}
