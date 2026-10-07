package com.boardgame.oldmaid;

import static com.boardgame.oldmaid.OldMaidFixtures.A;
import static com.boardgame.oldmaid.OldMaidFixtures.JOKER;
import static com.boardgame.oldmaid.OldMaidFixtures.c;
import static com.boardgame.oldmaid.OldMaidFixtures.d;
import static com.boardgame.oldmaid.OldMaidFixtures.game;
import static com.boardgame.oldmaid.OldMaidFixtures.h;
import static com.boardgame.oldmaid.OldMaidFixtures.hands;
import static com.boardgame.oldmaid.OldMaidFixtures.s;
import static com.boardgame.oldmaid.OldMaidSessionTest.draw;
import static com.boardgame.oldmaid.OldMaidSessionTest.peek;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameAction;
import com.boardgame.oldmaid.view.OldMaidSessionView;
import com.boardgame.oldmaid.view.OldMaidView;
import com.boardgame.support.FixedRandom;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class OldMaidSessionTimerTest {

    private static final Instant T0 = Instant.parse("2026-10-07T00:00:00Z");

    private final MutableClock clock = new MutableClock(T0);

    private OldMaidSession fourPlayers() {
        OldMaidGame game = game(A, hands(
                List.of(s(Rank.TWO), s(Rank.THREE)),
                List.of(h(Rank.FOUR), JOKER),
                List.of(c(Rank.FIVE)),
                List.of(d(Rank.SIX))));
        return new OldMaidSession(List.of(1L, 2L, 3L, 4L), game, clock);
    }

    private OldMaidView viewOf(OldMaidSession session, long memberId) {
        return ((OldMaidSessionView) session.viewFor(memberId)).game();
    }

    @Test
    void R34_시작하면_15초이고_차례가_바뀌면_그때부터_다시_잰다() {
        OldMaidSession session = fourPlayers();
        assertThat(session.deadline()).contains(T0.plusSeconds(15));

        clock.advance(Duration.ofSeconds(4));
        session.act(1L, draw(0));

        assertThat(session.deadline()).contains(T0.plusSeconds(19));
    }

    @Test
    void R34_신호와_섞기는_마감을_바꾸지_않는다() {
        OldMaidSession session = fourPlayers();
        clock.advance(Duration.ofSeconds(3));

        session.signal(1L, peek(1));
        session.act(3L, new GameAction("SHUFFLE", null, null));

        assertThat(session.deadline()).contains(T0.plusSeconds(15));
    }

    @Test
    void R34_남의_기권은_상대가_그대로면_마감을_바꾸지_않는다() {
        OldMaidSession session = fourPlayers();
        clock.advance(Duration.ofSeconds(3));

        session.forfeit(4L);

        assertThat(session.deadline()).contains(T0.plusSeconds(15));
    }

    @Test
    void R27_상대가_나가면_마감을_새로_잰다() {
        OldMaidSession session = fourPlayers();
        clock.advance(Duration.ofSeconds(3));

        session.forfeit(2L);

        assertThat(session.deadline()).contains(T0.plusSeconds(18));
    }

    @Test
    void R35_자동_행동은_대상과_순번을_남기고_사람이_행동하면_대상을_비운다() {
        OldMaidSession session = fourPlayers();
        clock.advance(Duration.ofSeconds(15));

        session.autoAct(new FixedRandom(1));

        OldMaidView view = viewOf(session, 3L);
        assertThat(view.lastAutoActorIds()).containsExactly(1L);
        assertThat(view.autoActSeq()).isEqualTo(1L);
        assertThat(view.events().get(0).auto()).isTrue();
        assertThat(session.deadline()).contains(T0.plusSeconds(30));

        session.act(2L, draw(0));
        assertThat(viewOf(session, 3L).lastAutoActorIds()).isEmpty();
        assertThat(viewOf(session, 3L).autoActSeq()).isEqualTo(1L);
    }
}
