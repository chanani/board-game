package com.boardgame.room.application;

import jakarta.annotation.PreDestroy;
import java.time.Duration;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;
import org.springframework.stereotype.Component;

/** 게임 중 오래 끊긴 참가자를 5초마다 확인해 자동 기권시킨다. 테스트에서는 속성으로 끈다. */
@Component
@ConditionalOnProperty(name = "app.disconnect-forfeit.enabled", havingValue = "true", matchIfMissing = true)
public class DisconnectForfeitScheduler {

    private static final Logger log = LoggerFactory.getLogger(DisconnectForfeitScheduler.class);
    private static final Duration INTERVAL = Duration.ofSeconds(5);

    private final ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();

    public DisconnectForfeitScheduler(RoomService roomService) {
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("disconnect-forfeit-");
        scheduler.initialize();
        scheduler.scheduleWithFixedDelay(() -> sweep(roomService), INTERVAL);
    }

    private static void sweep(RoomService roomService) {
        try {
            roomService.forfeitLongDisconnected();
        } catch (RuntimeException e) {
            // 한 번 실패해도 다음 주기에 다시 확인한다.
            log.warn("자동 기권 확인 실패", e);
        }
    }

    @PreDestroy
    public void stop() {
        scheduler.shutdown();
    }
}
