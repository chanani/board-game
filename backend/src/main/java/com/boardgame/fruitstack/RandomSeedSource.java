package com.boardgame.fruitstack;

import java.util.concurrent.ThreadLocalRandom;

public class RandomSeedSource implements SeedSource {

    @Override
    public Seed next() {
        ThreadLocalRandom random = ThreadLocalRandom.current();
        return new Seed(random.nextInt(Integer.MAX_VALUE));
    }
}
