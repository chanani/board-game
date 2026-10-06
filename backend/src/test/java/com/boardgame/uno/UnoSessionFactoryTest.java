package com.boardgame.uno;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameSession;
import com.boardgame.game.GameType;
import com.boardgame.support.MutableClock;
import com.boardgame.uno.view.UnoSessionView;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class UnoSessionFactoryTest {

    @Test
    void 우노_세션을_만들고_각자_7장을_받는다() {
        UnoSessionFactory factory = new UnoSessionFactory(new MutableClock(Instant.parse("2026-10-07T00:00:00Z")),
                StackedUnoShuffler.of(StandardUnoDeck.cards()), count -> 0);

        GameSession session = factory.create(List.of(10L, 20L));

        assertThat(factory.type()).isEqualTo(GameType.UNO);
        UnoSessionView view = (UnoSessionView) session.viewFor(10L);
        assertThat(view.game().hand()).hasSize(7);
        assertThat(view.game().currentPlayerId()).isEqualTo(10L);
    }
}
