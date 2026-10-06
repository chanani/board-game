package com.boardgame;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.room.application.TurnTimerConfig;
import com.boardgame.support.FakeTaskScheduler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.scheduling.TaskScheduler;

@SpringBootTest
class BoardGameApplicationTests {

    @Autowired
    @Qualifier(TurnTimerConfig.SCHEDULER)
    private TaskScheduler turnTimerScheduler;

    @Test
    void 애플리케이션_컨텍스트가_뜬다() {
    }

    @Test
    void 테스트에서는_턴_타이머가_실제로_돌지_않는다() {
        assertThat(turnTimerScheduler).isInstanceOf(FakeTaskScheduler.class);
    }
}
