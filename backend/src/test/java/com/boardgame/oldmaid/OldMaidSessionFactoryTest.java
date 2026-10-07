package com.boardgame.oldmaid;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameSession;
import com.boardgame.game.GameType;
import com.boardgame.support.MutableClock;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class OldMaidSessionFactoryTest {

    @Test
    void 도둑잡기_세션을_만든다() {
        OldMaidSessionFactory factory = new OldMaidSessionFactory(new MutableClock(Instant.EPOCH),
                new RandomOldMaidShuffler(), bound -> 0);

        GameSession session = factory.create(List.of(1L, 2L, 3L, 4L, 5L, 6L));

        assertThat(factory.type()).isEqualTo(GameType.OLD_MAID);
        assertThat(GameType.OLD_MAID.displayName()).isEqualTo("도둑잡기");
        assertThat(GameType.OLD_MAID.minPlayers()).isEqualTo(2);
        assertThat(GameType.OLD_MAID.maxPlayers()).isEqualTo(6);
        assertThat(session.isFinished()).isFalse();
        assertThat(session.deadline()).isPresent();
    }
}
