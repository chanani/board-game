package com.boardgame.room.application;

import java.time.Clock;
import java.util.Random;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

@Configuration
public class BotConfig {

    public static final String SCHEDULER = "botTaskScheduler";
    public static final String RANDOM = "botRandom";
    public static final String REAL_SCHEDULER_PROPERTY = "app.bots.real-scheduler";

    // 턴 타이머와 따로 둔다(컴퓨터 생각 시간이 시간 초과 처리를 막지 않게). 테스트는 속성을 false로 두고 가짜 예약기를 쓴다.
    @Bean(SCHEDULER)
    @ConditionalOnProperty(name = REAL_SCHEDULER_PROPERTY, havingValue = "true", matchIfMissing = true)
    public TaskScheduler botTaskScheduler(Clock clock) {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setClock(clock);
        scheduler.setPoolSize(2);
        scheduler.setThreadNamePrefix("bot-");
        scheduler.setRemoveOnCancelPolicy(true);
        return scheduler;
    }

    @Bean(RANDOM)
    public Random botRandom() {
        return new Random();
    }
}
