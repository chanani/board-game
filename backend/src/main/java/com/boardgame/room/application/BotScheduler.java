package com.boardgame.room.application;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Component;

// 컴퓨터 계획의 걸음을 예약한다. 예약 스레드에서 예외가 나면 조용히 사라지므로 기록을 남긴다.
@Component
public class BotScheduler {

    private static final Logger log = LoggerFactory.getLogger(BotScheduler.class);

    private final TaskScheduler scheduler;
    private final Clock clock;
    private final BotPace pace;

    public BotScheduler(@Qualifier(BotConfig.SCHEDULER) TaskScheduler scheduler, Clock clock,
                        @Value("${app.bots.pace:1.0}") double pace) {
        this.scheduler = scheduler;
        this.clock = clock;
        this.pace = new BotPace(pace);
    }

    public void schedule(Duration delay, Runnable task) {
        scheduler.schedule(() -> runQuietly(task), clock.instant().plus(pace.scale(delay)));
    }

    public double pace() {
        return pace.factor();
    }

    public Instant now() {
        return clock.instant();
    }

    private void runQuietly(Runnable task) {
        try {
            task.run();
        } catch (RuntimeException exception) {
            log.warn("컴퓨터 예약 실행 실패", exception);
        }
    }
}
