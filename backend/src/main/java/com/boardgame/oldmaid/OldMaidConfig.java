package com.boardgame.oldmaid;

import java.util.concurrent.ThreadLocalRandom;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OldMaidConfig {

    @Bean
    public OldMaidShuffler oldMaidShuffler() {
        return new RandomOldMaidShuffler();
    }

    @Bean
    public SlotPicker oldMaidSlotPicker() {
        return bound -> ThreadLocalRandom.current().nextInt(bound);
    }
}
