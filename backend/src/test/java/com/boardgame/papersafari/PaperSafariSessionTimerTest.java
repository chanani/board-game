package com.boardgame.papersafari;

import static com.boardgame.papersafari.Fixtures.ALICE;
import static com.boardgame.papersafari.Fixtures.LOSER_HAND;
import static com.boardgame.papersafari.Fixtures.WINNER_HAND;
import static com.boardgame.papersafari.Fixtures.stack;
import static com.boardgame.papersafari.Fixtures.zeros;
import static com.boardgame.papersafari.GameFixtures.roundWonBy;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameAction;
import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameOutcome;
import com.boardgame.papersafari.view.PaperSafariSessionView;
import com.boardgame.papersafari.view.PaperSafariView;
import com.boardgame.support.FixedRandom;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class PaperSafariSessionTimerTest {

    private static final long A = 1L;
    private static final long B = 2L;
    private static final Instant T0 = Instant.parse("2026-10-06T00:00:00Z");
    private static final Duration LIMIT = Duration.ofSeconds(15);

    private final MutableClock clock = new MutableClock(T0);

    private PaperSafariSession session(List<Card> stacked) {
        return new PaperSafariSession(List.of(A, B),
                new RoundFactory(StackedShuffler.rounds(List.of(stacked)), count -> 0), clock);
    }

    private PaperSafariSession session() {
        return session(stack(List.of(WINNER_HAND, LOSER_HAND), Card.number(7), zeros(10)));
    }

    private PaperSafariView view(PaperSafariSession session, long memberId) {
        return ((PaperSafariSessionView) session.viewFor(memberId)).game();
    }

    @Test
    void 시작하면_마감은_15초_뒤다() {
        PaperSafariSession session = session();

        assertThat(session.deadline()).contains(T0.plus(LIMIT));
    }

    @Test
    void 상태가_바뀌면_마감을_마지막_변화로부터_15초_뒤로_다시_잡는다() {
        PaperSafariSession session = session();
        clock.advance(Duration.ofSeconds(4));

        session.act(A, new GameAction("FLIP", 0, 0));

        assertThat(session.deadline()).contains(T0.plusSeconds(4).plus(LIMIT));
    }

    @Test
    void 실패한_행동은_마감을_바꾸지_않는다() {
        PaperSafariSession session = session();
        clock.advance(Duration.ofSeconds(4));

        try {
            session.act(A, new GameAction("DRAW_DECK", null, null));
        } catch (RuntimeException ignored) {
            // 시작 뒤집기 단계라 거부된다.
        }

        assertThat(session.deadline()).contains(T0.plus(LIMIT));
    }

    @Test
    void 가져왔다_되돌리기를_되풀이해도_차례_마감은_늘어나지_않는다() {
        PaperSafariSession session = session();
        session.autoAct(new FixedRandom(0));
        Instant turnDeadline = session.deadline().orElseThrow();

        for (int cycle = 0; cycle < 3; cycle++) {
            clock.advance(Duration.ofSeconds(2));
            session.act(A, new GameAction("DRAW_DISCARD", null, null));
            clock.advance(Duration.ofSeconds(2));
            session.act(A, new GameAction("CANCEL_DRAW", null, null));
        }

        assertThat(session.deadline()).contains(turnDeadline);
    }

    @Test
    void 차례가_넘어가면_마감을_새로_잡는다() {
        PaperSafariSession session = session();
        session.autoAct(new FixedRandom(0));
        clock.advance(Duration.ofSeconds(3));
        session.act(A, new GameAction("DRAW_DECK", null, null));
        clock.advance(Duration.ofSeconds(3));

        session.act(A, new GameAction("DISCARD", null, null));

        assertThat(session.deadline()).contains(clock.instant().plus(LIMIT));
    }

    @Test
    void 자동_행동도_마감을_다시_잡는다() {
        PaperSafariSession session = session();
        clock.advance(LIMIT);

        session.autoAct(new FixedRandom(0));

        assertThat(session.deadline()).contains(T0.plus(LIMIT).plus(LIMIT));
        assertThat(view(session, A).round().phase()).isEqualTo(TurnPhase.DRAW);
        assertThat(view(session, A).lastAutoActorIds()).containsExactly(A, B);
    }

    @Test
    void 화면에는_기다리는_동안_마감과_서버_시각이_들어간다() {
        PaperSafariSession session = session();
        clock.advance(Duration.ofSeconds(3));

        PaperSafariView view = view(session, A);

        assertThat(view.deadline()).isEqualTo(T0.plus(LIMIT).toEpochMilli());
        assertThat(view.serverNow()).isEqualTo(T0.plusSeconds(3).toEpochMilli());
        assertThat(view.lastAutoActorId()).isNull();
    }

    @Test
    void 게임이_끝나면_마감이_없다() {
        PaperSafariSession session = session(roundWonBy(ALICE));

        List<GameOutcome> outcomes = session.forfeit(B);

        assertThat(outcomes).last().isInstanceOf(GameCompleted.class);
        assertThat(session.deadline()).isEmpty();
        assertThat(view(session, A).deadline()).isNull();
        assertThat(view(session, A).serverNow()).isEqualTo(T0.toEpochMilli());
    }

    @Test
    void 자동_행동으로_게임이_끝나면_결과를_돌려준다() {
        PaperSafariSession session = session();
        session.autoAct(new FixedRandom(0));
        for (int index = 1; index < 5; index++) {
            session.autoAct(new FixedRandom(index));
            session.act(B, new GameAction("DRAW_DECK", null, null));
            session.act(B, new GameAction("DISCARD", null, null));
        }

        List<GameOutcome> outcomes = session.autoAct(new FixedRandom(5));

        assertThat(outcomes).hasSize(2);
        assertThat(session.isFinished()).isTrue();
        assertThat(session.deadline()).isEmpty();
    }
}
