package com.boardgame.room.application;

// 예약된 걸음을 방 잠금 안에서 실행하는 쪽(RoomService). BotDriver가 RoomService를 직접 알지 않게 한다.
@FunctionalInterface
public interface BotRunner {

    void run(BotTicket ticket);
}
