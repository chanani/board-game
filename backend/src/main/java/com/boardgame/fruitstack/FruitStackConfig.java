package com.boardgame.fruitstack;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FruitStackConfig {

    @Bean
    public SeedSource fruitStackSeedSource() {
        return new RandomSeedSource();
    }
}
