package com.boardgame.fruitstack;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameAction;
import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.RoundCompleted;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

class FruitStackSessionTimerTest {

    private static final Instant T0 = Instant.parse("2026-10-13T00:00:00Z");

    private final MutableClock clock = new MutableClock(T0);
    private final FruitStackSession session = new FruitStackSession(List.of(11L, 22L, 33L), new Seed(1), clock);

    private static GameAction action(String type, Integer score, String board) {
        return new GameAction(type, null, null, null, null, null, null, null, score, board);
    }

    @Test
    void R17_마감은_시작_10분_뒤이고_보고_탈락_신호로_바뀌지_않는다() {
        assertThat(session.deadline()).contains(T0.plusSeconds(600));

        clock.advance(Duration.ofSeconds(30));
        session.act(11, action("SCORE", 20, null));
        session.act(22, action("OUT", 5, null));
        session.signal(11, action("BOARD", null, "WAAAA"));

        assertThat(session.deadline()).contains(T0.plusSeconds(600));
    }

    @Test
    void R17_마감_전의_autoAct는_빈_결과이고_상태도_그대로다() {
        clock.advance(Duration.ofSeconds(599));

        assertThat(session.autoAct(new Random())).isEmpty();
        assertThat(session.isFinished()).isFalse();
        assertThat(session.deadline()).contains(T0.plusSeconds(600));
    }

    @Test
    void R17_마감이_지나면_지금_점수로_끝내고_마감은_비어_있다() {
        session.act(11, action("SCORE", 20, null));
        clock.advance(Duration.ofSeconds(600));

        List<GameOutcome> outcomes = session.autoAct(new Random());

        assertThat(outcomes).hasSize(2);
        assertThat(outcomes.get(0)).isInstanceOf(RoundCompleted.class);
        assertThat(outcomes.get(1)).isInstanceOf(GameCompleted.class);
        assertThat(session.isFinished()).isTrue();
        assertThat(session.deadline()).isEmpty();
        assertThat(session.autoAct(new Random())).isEmpty();
    }
}
