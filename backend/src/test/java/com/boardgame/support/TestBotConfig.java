package com.boardgame.support;

import com.boardgame.room.application.BotConfig;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.TaskScheduler;

// 스프링 컨텍스트 테스트는 컴퓨터 예약을 기록만 하고 실행하지 않는다(TestTurnTimerConfig와 같은 방식).
@Configuration
public class TestBotConfig {

    @Bean(BotConfig.SCHEDULER)
    @ConditionalOnProperty(name = BotConfig.REAL_SCHEDULER_PROPERTY, havingValue = "false")
    public TaskScheduler fakeBotScheduler() {
        return new FakeTaskScheduler();
    }
}
