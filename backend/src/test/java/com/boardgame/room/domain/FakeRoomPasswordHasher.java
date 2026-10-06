package com.boardgame.room.domain;

public class FakeRoomPasswordHasher implements RoomPasswordHasher {

    @Override
    public RoomPasswordHash hash(RawRoomPassword raw) {
        return new RoomPasswordHash("h:" + raw.value());
    }

    @Override
    public boolean matches(RawRoomPassword raw, RoomPasswordHash hash) {
        return hash(raw).equals(hash);
    }
}
