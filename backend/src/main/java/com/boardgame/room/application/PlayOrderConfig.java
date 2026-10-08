package com.boardgame.room.application;

import com.boardgame.room.domain.PlayOrder;
import java.util.Random;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

// 매 판 시작 때 플레이 순서를 무작위로 섞는다. 스프링 컨텍스트 테스트는 속성을 false로 두어 자리 순서 그대로 시작한다.
@Configuration
public class PlayOrderConfig {

    public static final String SHUFFLE_PROPERTY = "app.play-order.shuffle";

    @Bean
    @ConditionalOnProperty(name = SHUFFLE_PROPERTY, havingValue = "true", matchIfMissing = true)
    public PlayOrder randomPlayOrder() {
        return PlayOrder.random(new Random());
    }

    @Bean
    @ConditionalOnProperty(name = SHUFFLE_PROPERTY, havingValue = "false")
    public PlayOrder seatedPlayOrder() {
        return PlayOrder.SEATED;
    }
}
