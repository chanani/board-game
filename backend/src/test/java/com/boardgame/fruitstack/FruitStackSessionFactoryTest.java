package com.boardgame.fruitstack;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.fruitstack.view.FruitStackSessionView;
import com.boardgame.game.GameSession;
import com.boardgame.game.GameType;
import com.boardgame.support.MutableClock;
import java.time.Instant;
import java.util.Iterator;
import java.util.List;
import org.junit.jupiter.api.Test;

class FruitStackSessionFactoryTest {

    private final MutableClock clock = new MutableClock(Instant.parse("2026-10-13T00:00:00Z"));

    private static int seedOf(GameSession session) {
        return ((FruitStackSessionView) session.viewFor(1)).game().seed();
    }

    @Test
    void R31_게임마다_씨앗을_새로_받는다() {
        Iterator<Seed> seeds = List.of(new Seed(7), new Seed(8)).iterator();
        FruitStackSessionFactory factory = new FruitStackSessionFactory(clock, seeds::next);

        assertThat(factory.type()).isEqualTo(GameType.FRUIT_STACK);
        assertThat(seedOf(factory.create(List.of(1L, 2L)))).isEqualTo(7);
        assertThat(seedOf(factory.create(List.of(1L, 2L)))).isEqualTo(8);
    }

    @Test
    void R4_기본_씨앗은_0_이상의_int다() {
        SeedSource source = new FruitStackConfig().fruitStackSeedSource();

        assertThat(source.next().value()).isGreaterThanOrEqualTo(0);
    }
}
