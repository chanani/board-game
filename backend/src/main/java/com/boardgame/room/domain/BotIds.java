package com.boardgame.room.domain;

// R2: 방마다 -1, -2, … 로 센다. 내보낸 컴퓨터의 번호는 다시 쓰지 않는다(화면 애니메이션·키 충돌 방지).
public class BotIds {

    private long last;

    public long next() {
        last--;
        return last;
    }
}
