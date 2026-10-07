package com.boardgame.oldmaid;

import com.boardgame.game.GameSession;
import com.boardgame.game.GameSessionFactory;
import com.boardgame.game.GameType;
import java.time.Clock;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class OldMaidSessionFactory implements GameSessionFactory {

    private final Clock clock;
    private final OldMaidShuffler shuffler;
    private final SlotPicker picker;

    public OldMaidSessionFactory(Clock clock, OldMaidShuffler shuffler, SlotPicker picker) {
        this.clock = clock;
        this.shuffler = shuffler;
        this.picker = picker;
    }

    @Override
    public GameType type() {
        return GameType.OLD_MAID;
    }

    // R33: 게임마다 새 덱·새 무작위 첫 사람.
    @Override
    public GameSession create(List<Long> memberIds) {
        return new OldMaidSession(memberIds, new OldMaidRoundFactory(shuffler, picker), clock);
    }
}
