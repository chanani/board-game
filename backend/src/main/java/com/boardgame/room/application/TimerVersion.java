package com.boardgame.room.application;

// 예약 작업의 판번호. 다시 예약할 때마다 새 번호가 생기고, 실행 때 번호가 최신일 때만 행동한다.
public record TimerVersion(long value) {
}
