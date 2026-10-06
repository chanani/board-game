package com.boardgame.room.domain;

public interface RoomPasswordHasher {

    RoomPasswordHash hash(RawRoomPassword raw);

    boolean matches(RawRoomPassword raw, RoomPasswordHash hash);
}
