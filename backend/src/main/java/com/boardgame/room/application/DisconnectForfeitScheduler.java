package com.boardgame.room.application;

import jakarta.annotation.PreDestroy;
import java.time.Duration;
import java.time.Instant;
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
    private static final int SHUTDOWN_WAIT_SECONDS = 5;

    private final ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();

    public DisconnectForfeitScheduler(RoomService roomService) {
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("disconnect-forfeit-");
        // 끄는 동안 처리 중인 확인은 마저 끝내되 오래 기다리지 않는다.
        scheduler.setWaitForTasksToCompleteOnShutdown(true);
        scheduler.setAwaitTerminationSeconds(SHUTDOWN_WAIT_SECONDS);
        scheduler.initialize();
        // 앱이 막 뜬 직후에는 확인하지 않고, 한 주기 뒤부터 시작한다.
        Instant firstRun = scheduler.getClock()
                .instant()
                .plus(INTERVAL);
        scheduler.scheduleWithFixedDelay(() -> sweep(roomService), firstRun, INTERVAL);
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
