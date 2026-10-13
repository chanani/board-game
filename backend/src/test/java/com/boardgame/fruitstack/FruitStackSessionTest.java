package com.boardgame.fruitstack;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import com.boardgame.fruitstack.view.FruitStackBoardSignal;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.MatchEntry;
import com.boardgame.game.ResultType;
import com.boardgame.game.RoundCompleted;
import com.boardgame.game.RoundEntry;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

class FruitStackSessionTest {

    private static final Instant T0 = Instant.parse("2026-10-13T00:00:00Z");
    private static final long A = 11;
    private static final long B = 22;
    private static final long C = 33;

    private final MutableClock clock = new MutableClock(T0);

    private FruitStackSession session(Long... ids) {
        return new FruitStackSession(List.of(ids), new Seed(12345), clock);
    }

    private static GameAction score(int value) {
        return new GameAction("SCORE", null, null, null, null, null, null, null, value, null);
    }

    private static GameAction out(int value) {
        return new GameAction("OUT", null, null, null, null, null, null, null, value, null);
    }

    private static GameAction board(String text) {
        return new GameAction("BOARD", null, null, null, null, null, null, null, null, text);
    }

    @Test
    void 게임_중의_행동은_빈_결과를_낸다() {
        FruitStackSession session = session(A, B);

        assertThat(session.act(A, score(10))).isEmpty();
        assertThat(session.isFinished()).isFalse();
        assertThat(session.isPlaying(A)).isTrue();
        assertThat(session.roundNumber()).isEqualTo(1);
        assertThat(session.pendingActors()).isEmpty();
    }

    @Test
    void 형식이_어긋난_행동은_INVALID_INPUT이다() {
        FruitStackSession session = session(A, B);

        assertError(() -> session.act(A, new GameAction("DRAW", null, null)), ErrorCode.INVALID_INPUT);
        assertError(() -> session.act(A, new GameAction("SCORE", null, null)), ErrorCode.INVALID_INPUT);
        assertError(() -> session.act(A, score(-1)), ErrorCode.INVALID_INPUT);
        assertError(() -> session.act(99, score(1)), ErrorCode.NOT_A_PLAYER);
        assertError(() -> session.act(A, score(111)), ErrorCode.FRUIT_STACK_SCORE_REJECTED);
    }

    @Test
    void R30_모두_탈락해_끝나면_라운드와_경기_결과를_딱_한_번_낸다() {
        FruitStackSession session = session(A, B, C);
        session.act(A, out(30));
        session.act(B, out(30));

        List<GameOutcome> outcomes = session.act(C, out(10));

        assertThat(outcomes).containsExactly(
                new RoundCompleted(1, List.of(new RoundEntry(A, ResultType.DRAW, 30),
                        new RoundEntry(B, ResultType.DRAW, 30), new RoundEntry(C, ResultType.LOSE, 10))),
                new GameCompleted(List.of(new MatchEntry(A, ResultType.DRAW, 0, 0),
                        new MatchEntry(B, ResultType.DRAW, 0, 1), new MatchEntry(C, ResultType.LOSE, 0, 2))));
        assertThat(session.isFinished()).isTrue();
        assertThat(session.isPlaying(C)).isFalse();
        assertThat(session.forfeit(A)).isEmpty();
        assertThat(session.autoAct(new Random())).isEmpty();
        assertError(() -> session.act(A, score(40)), ErrorCode.GAME_ALREADY_OVER);
    }

    @Test
    void R26_R30_승부가_정해져_끝나면_라운드에는_겨루는_사람만_등수_순으로_들어간다() {
        FruitStackSession session = session(A, B, C);
        session.act(C, score(50));
        session.forfeit(A);
        assertThat(session.isFinished()).isFalse();

        List<GameOutcome> outcomes = session.act(B, out(20));

        assertThat(outcomes).containsExactly(
                new RoundCompleted(1, List.of(new RoundEntry(C, ResultType.WIN, 50), new RoundEntry(B, ResultType.LOSE, 20))),
                new GameCompleted(List.of(new MatchEntry(A, ResultType.LOSE, 0, 0),
                        new MatchEntry(B, ResultType.LOSE, 0, 1), new MatchEntry(C, ResultType.WIN, 0, 2))));
    }

    @Test
    void R30_상대가_모두_나가_끝나면_경기_결과만_낸다() {
        FruitStackSession session = session(A, B);
        session.act(A, score(40));

        List<GameOutcome> outcomes = session.forfeit(A);

        assertThat(outcomes).containsExactly(new GameCompleted(
                List.of(new MatchEntry(A, ResultType.LOSE, 0, 0), new MatchEntry(B, ResultType.WIN, 0, 1))));
    }

    @Test
    void R29_탈락한_사람의_기권은_빈_결과이고_게임은_이어진다() {
        FruitStackSession session = session(A, B, C);
        session.act(A, out(10));

        assertThat(session.isPlaying(A)).isFalse();
        assertThat(session.forfeit(A)).isEmpty();
        assertThat(session.isFinished()).isFalse();
    }

    @Test
    void R24_판_신호는_받아_주면_중계할_내용을_주고_아니면_빈_값이다() {
        FruitStackSession session = session(A, B);

        Object relayed = session.signal(A, board("WAAAAGAPqA")).orElseThrow();

        assertThat(relayed).isEqualTo(FruitStackBoardSignal.of(T0.toEpochMilli(), A, 1, "WAAAAGAPqA"));
        assertThat(session.signal(A, board("WAAAAGAPqA"))).isEmpty();
        assertThat(session.signal(A, board("bad"))).isEmpty();
        clock.advance(Duration.ofMillis(200));
        assertThat(session.signal(A, board("WAAAA"))).contains(FruitStackBoardSignal.of(T0.toEpochMilli(), A, 2, "WAAAA"));
        assertError(() -> session.signal(A, new GameAction("PEEK", null, null)), ErrorCode.INVALID_INPUT);
    }
}
