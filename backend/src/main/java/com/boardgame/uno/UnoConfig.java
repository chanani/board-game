package com.boardgame.uno;

import java.util.concurrent.ThreadLocalRandom;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class UnoConfig {

    @Bean
    public UnoShuffler unoShuffler() {
        return new RandomUnoShuffler();
    }

    @Bean
    public StarterPicker unoStarterPicker() {
        return count -> ThreadLocalRandom.current().nextInt(count);
    }
}
