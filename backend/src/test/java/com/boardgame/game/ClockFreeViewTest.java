package com.boardgame.game;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.oldmaid.OldMaidSessionFactory;
import com.boardgame.papersafari.PaperSafariSession;
import com.boardgame.papersafari.RoundFactory;
import com.boardgame.support.MutableClock;
import com.boardgame.uno.UnoSessionFactory;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

// R19: 같은 상태의 화면은 시각만 흘러도 다르지만(serverNow), 시각을 뺀 화면은 같다. 상태가 바뀌면 다르다.
class ClockFreeViewTest {

    private static final List<Long> PLAYERS = List.of(1L, 2L, 3L);

    private final MutableClock clock = new MutableClock(Instant.parse("2026-10-08T00:00:00Z"));

    @Test
    void R19_세_게임_모두_시각만_흐르면_시각을_뺀_화면이_같다() {
        List<GameSession> sessions = List.of(
                new PaperSafariSession(PLAYERS, new RoundFactory(cards -> new ArrayList<>(cards), count -> 0), clock),
                new UnoSessionFactory(clock, cards -> new ArrayList<>(cards), count -> 0).create(PLAYERS),
                new OldMaidSessionFactory(clock, cards -> new ArrayList<>(cards), bound -> 0).create(PLAYERS));

        for (GameSession session : sessions) {
            Object before = session.viewFor(1L);
            clock.advance(Duration.ofMillis(700));
            Object after = session.viewFor(1L);

            assertThat(after).isNotEqualTo(before);
            assertThat(ClockFreeView.of(after)).isEqualTo(ClockFreeView.of(before));
        }
    }

    @Test
    void R19_상태가_바뀌면_시각을_뺀_화면도_다르다() {
        GameSession uno = new UnoSessionFactory(clock, cards -> new ArrayList<>(cards), count -> 0).create(PLAYERS);
        Object before = uno.viewFor(2L);

        uno.autoAct(new Random(0));

        assertThat(ClockFreeView.of(uno.viewFor(2L))).isNotEqualTo(ClockFreeView.of(before));
    }

    @Test
    void 시각이_없는_화면은_그대로_비교한다() {
        assertThat(ClockFreeView.of("view-1")).isEqualTo("view-1");
    }
}
