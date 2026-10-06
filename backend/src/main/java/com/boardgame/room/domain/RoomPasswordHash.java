package com.boardgame.room.domain;

public record RoomPasswordHash(String value) {

    // 로그나 레코드 출력으로 해시가 새지 않게 가린다.
    @Override
    public String toString() {
        return "RoomPasswordHash[****]";
    }
}
