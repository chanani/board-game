package com.boardgame.room.application;

import java.time.Duration;

// app.bots.pace: 컴퓨터 지연에 곱하는 배율(기본 1.0). STOMP 통합 테스트만 짧게 줄인다.
public record BotPace(double factor) {

    public Duration scale(Duration delay) {
        return Duration.ofMillis(Math.round(delay.toMillis() * factor));
    }
}
