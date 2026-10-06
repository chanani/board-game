// B/uno/UnoSessionFactory.java
package com.boardgame.uno;

import com.boardgame.game.GameSession;
import com.boardgame.game.GameSessionFactory;
import com.boardgame.game.GameType;
import java.time.Clock;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class UnoSessionFactory implements GameSessionFactory {

    private final Clock clock;
    private final UnoShuffler shuffler;
    private final StarterPicker starterPicker;

    public UnoSessionFactory(Clock clock, UnoShuffler shuffler, StarterPicker starterPicker) {
        this.clock = clock;
        this.shuffler = shuffler;
        this.starterPicker = starterPicker;
    }

    @Override
    public GameType type() {
        return GameType.UNO;
    }

    // R34: 게임마다 새 덱·새 무작위 시작 사람.
    @Override
    public GameSession create(List<Long> memberIds) {
        return new UnoSession(memberIds, new UnoRoundFactory(shuffler, starterPicker), clock);
    }
}
