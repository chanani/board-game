package com.boardgame.papersafari;

// 화면에 실을 마감(epoch ms, 기다리는 행동이 없으면 null)과 서버 시각(epoch ms).
public record TurnTiming(Long deadline, long serverNow) {

    public static TurnTiming untimed() {
        return new TurnTiming(null, 0L);
    }
}
