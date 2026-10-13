package com.boardgame.fruitstack;

import com.boardgame.support.MutableClock;
import java.time.Instant;
import java.util.List;

final class FruitStackFixtures {

    static final PlayerId A = new PlayerId(1);
    static final PlayerId B = new PlayerId(2);
    static final PlayerId C = new PlayerId(3);
    static final Instant T0 = Instant.parse("2026-10-13T00:00:00Z");

    private FruitStackFixtures() {
    }

    static MutableClock clock() {
        return new MutableClock(T0);
    }

    static FruitStackGame game(MutableClock clock, PlayerId... players) {
        return FruitStackGame.start(List.of(players), new Seed(12345), clock);
    }

    static Score score(int value) {
        return new Score(value);
    }
}
