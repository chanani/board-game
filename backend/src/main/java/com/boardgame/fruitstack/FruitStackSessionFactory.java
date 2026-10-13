package com.boardgame.fruitstack;

import com.boardgame.game.GameSession;
import com.boardgame.game.GameSessionFactory;
import com.boardgame.game.GameType;
import java.time.Clock;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class FruitStackSessionFactory implements GameSessionFactory {

    private final Clock clock;
    private final SeedSource seeds;

    public FruitStackSessionFactory(Clock clock, SeedSource seeds) {
        this.clock = clock;
        this.seeds = seeds;
    }

    @Override
    public GameType type() {
        return GameType.FRUIT_STACK;
    }

    // R31: 게임마다 새 씨앗.
    @Override
    public GameSession create(List<Long> memberIds) {
        return new FruitStackSession(memberIds, seeds.next(), clock);
    }
}
