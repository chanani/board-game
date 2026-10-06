package com.boardgame.room.domain;

// 사람이 모두 나가 방이 사라졌을 때 발행한다. 방에 딸린 메모리 데이터(채팅 등)를 정리하는 용도다.
public record RoomClosedEvent(String code) {
}
