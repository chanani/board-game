package com.boardgame.oldmaid;

import static com.boardgame.oldmaid.OldMaidFixtures.A;
import static com.boardgame.oldmaid.OldMaidFixtures.JOKER;
import static com.boardgame.oldmaid.OldMaidFixtures.c;
import static com.boardgame.oldmaid.OldMaidFixtures.d;
import static com.boardgame.oldmaid.OldMaidFixtures.game;
import static com.boardgame.oldmaid.OldMaidFixtures.h;
import static com.boardgame.oldmaid.OldMaidFixtures.hands;
import static com.boardgame.oldmaid.OldMaidFixtures.s;
import static com.boardgame.oldmaid.OldMaidFixtures.opening;
import static com.boardgame.oldmaid.OldMaidSessionTest.discard;
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

    // A: 5·5·2, B: 9·9·조커, C: 3. 처음 버리기 단계로 시작한다.
    private OldMaidSession openingSession() {
        OldMaidGame game = opening(A, hands(
                List.of(s(Rank.FIVE), h(Rank.FIVE), s(Rank.TWO)),
                List.of(c(Rank.NINE), JOKER, d(Rank.NINE)),
                List.of(c(Rank.THREE))));
        return new OldMaidSession(List.of(1L, 2L, 3L), game, clock);
    }

    @Test
    void R38_처음_버리기_단계는_30초이고_누가_버려도_다시_재지_않으며_끝나면_첫_차례_15초를_잰다() {
        OldMaidSession session = openingSession();
        assertThat(session.deadline()).contains(T0.plusSeconds(30));

        clock.advance(Duration.ofSeconds(4));
        session.act(1L, discard(s(Rank.FIVE), h(Rank.FIVE)));
        assertThat(session.deadline()).contains(T0.plusSeconds(30));

        clock.advance(Duration.ofSeconds(6));
        session.act(2L, discard(c(Rank.NINE), d(Rank.NINE)));
        assertThat(session.deadline()).contains(T0.plusSeconds(25));
        assertThat(viewOf(session, 1L).stage().name()).isEqualTo("DRAW");
    }

    @Test
    void R38_처음_버리기_마감이_지나면_짝이_남은_모두를_자동_대상으로_남긴다() {
        OldMaidSession session = openingSession();
        clock.advance(Duration.ofSeconds(30));

        session.autoAct(new FixedRandom(0));

        OldMaidView view = viewOf(session, 3L);
        assertThat(view.lastAutoActorIds()).containsExactly(1L, 2L);
        assertThat(view.autoActSeq()).isEqualTo(1L);
        assertThat(view.currentPlayerId()).isEqualTo(1L);
        assertThat(session.deadline()).contains(T0.plusSeconds(45));
    }

    @Test
    void R37_R38_뽑은_카드로_짝이_되면_짝_버리기_15초를_새로_재고_지나면_대신_버린다() {
        OldMaidGame game = OldMaidFixtures.game(A, hands(
                List.of(s(Rank.TWO), s(Rank.THREE)),
                List.of(h(Rank.TWO), JOKER),
                List.of(c(Rank.FIVE))));
        OldMaidSession session = new OldMaidSession(List.of(1L, 2L, 3L), game, clock);
        clock.advance(Duration.ofSeconds(5));

        session.act(1L, draw(0));
        assertThat(session.deadline()).contains(T0.plusSeconds(20));
        assertThat(viewOf(session, 1L).stage().name()).isEqualTo("DISCARD");

        clock.advance(Duration.ofSeconds(15));
        session.autoAct(new FixedRandom(0));

        OldMaidView view = viewOf(session, 3L);
        assertThat(view.lastAutoActorIds()).containsExactly(1L);
        assertThat(view.currentPlayerId()).isEqualTo(2L);
        assertThat(view.events().get(0).type().name()).isEqualTo("PAIR");
        assertThat(view.events().get(0).auto()).isTrue();
        assertThat(session.deadline()).contains(T0.plusSeconds(35));
    }
}
