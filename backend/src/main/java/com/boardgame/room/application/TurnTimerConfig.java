package com.boardgame.room.application;

import java.time.Clock;
import java.util.Random;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

@Configuration
public class TurnTimerConfig {

    public static final String SCHEDULER = "turnTimerScheduler";
    public static final String RANDOM = "turnTimerRandom";
    public static final String REAL_SCHEDULER_PROPERTY = "app.turn-timer.real-scheduler";

    // 마감은 주입된 Clock 기준이므로, 예약기도 같은 Clock으로 남은 시간을 잰다.
    // 테스트는 속성을 false로 두고 실제로 기다리지 않는 예약기를 따로 등록한다.
    @Bean(SCHEDULER)
    @ConditionalOnProperty(name = REAL_SCHEDULER_PROPERTY, havingValue = "true", matchIfMissing = true)
    public TaskScheduler turnTimerScheduler(Clock clock) {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setClock(clock);
        scheduler.setPoolSize(1);
        scheduler.setThreadNamePrefix("turn-timer-");
        scheduler.setRemoveOnCancelPolicy(true);
        return scheduler;
    }

    @Bean(RANDOM)
    public Random turnTimerRandom() {
        return new Random();
    }
}
