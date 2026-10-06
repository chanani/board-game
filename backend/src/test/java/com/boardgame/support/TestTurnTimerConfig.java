package com.boardgame.support;

import com.boardgame.room.application.TurnTimerConfig;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.TaskScheduler;

// 스프링 컨텍스트 테스트는 공유 캐시 컨텍스트와 메모리 방 목록을 쓰므로, 실제 타이머가 도중에 터지면 결과가 흔들린다.
// 예약만 기록하고 실행하지 않는 가짜 예약기를 쓴다.
@Configuration
public class TestTurnTimerConfig {

    @Bean(TurnTimerConfig.SCHEDULER)
    @ConditionalOnProperty(name = TurnTimerConfig.REAL_SCHEDULER_PROPERTY, havingValue = "false")
    public TaskScheduler fakeTurnTimerScheduler() {
        return new FakeTaskScheduler();
    }
}
