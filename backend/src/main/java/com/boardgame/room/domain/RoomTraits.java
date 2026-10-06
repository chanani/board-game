package com.boardgame.room.domain;

// 방의 접근 방식(잠금)과 겉모양(테마)을 묶어 RoomSettings가 필드 3개를 넘지 않게 한다.
public record RoomTraits(RoomLock lock, RoomTheme theme) {
}
