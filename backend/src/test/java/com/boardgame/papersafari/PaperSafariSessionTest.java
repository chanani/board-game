package com.boardgame.papersafari;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static com.boardgame.papersafari.Fixtures.ALICE;
import static com.boardgame.papersafari.Fixtures.FIRST;
import static com.boardgame.papersafari.Fixtures.REST;
import static com.boardgame.papersafari.GameFixtures.roundWonBy;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.MatchEntry;
import com.boardgame.game.ResultType;
import com.boardgame.game.RoundCompleted;
import com.boardgame.game.RoundEntry;
import com.boardgame.papersafari.view.PaperSafariSessionView;
import com.boardgame.papersafari.view.PaperSafariView;
import java.util.List;
import org.junit.jupiter.api.Test;

class PaperSafariSessionTest {

    private static final long A = 1L;
    private static final long B = 2L;

    private PaperSafariSession session(List<List<Card>> rounds) {
        return new PaperSafariSession(List.of(A, B), new RoundFactory(StackedShuffler.rounds(rounds), count -> 0));
    }

    private List<GameOutcome> act(PaperSafariSession session, long memberId, String type) {
        return session.act(memberId, new GameAction(type, null, null));
    }

    private List<GameOutcome> act(PaperSafariSession session, long memberId, String type, Position position) {
        return session.act(memberId, new GameAction(type, position.column(), position.row()));
    }

    private PaperSafariSessionView sessionView(PaperSafariSession session, long memberId) {
        return (PaperSafariSessionView) session.viewFor(memberId);
    }

    private PaperSafariView view(PaperSafariSession session, long memberId) {
        return sessionView(session, memberId).game();
    }

    // finisher가 0으로 5칸을 채워 라운드를 끝낸다. other는 자기 차례에 뽑아서 버린다. 마지막 행동의 결과를 돌려준다.
    private List<GameOutcome> playRound(PaperSafariSession session, long finisher, long other) {
        act(session, A, "FLIP", FIRST);
        act(session, B, "FLIP", FIRST);
        List<GameOutcome> last = List.of();
        for (Position position : REST) {
            passIfTurnOf(session, other);
            act(session, finisher, "DRAW_DECK");
            last = act(session, finisher, "SWAP", position);
        }
        return last;
    }

    private void passIfTurnOf(PaperSafariSession session, long player) {
        if (view(session, player).round().currentPlayerId() != player) {
            return;
        }
        act(session, player, "DRAW_DECK");
        act(session, player, "DISCARD");
    }

    private void readyAll(PaperSafariSession session) {
        act(session, A, "READY");
        act(session, B, "READY");
    }

    @Test
    void 행동_종류에_따라_게임을_진행한다() {
        PaperSafariSession session = session(List.of(roundWonBy(ALICE)));

        List<GameOutcome> outcomes = act(session, A, "FLIP", FIRST);
        act(session, B, "FLIP", FIRST);

        assertThat(outcomes).isEmpty();
        assertThat(view(session, A).round().phase()).isEqualTo(TurnPhase.DRAW);
        assertThat(session.isPlaying(A)).isTrue();
        assertThat(session.isFinished()).isFalse();
    }

    @Test
    void 알_수_없는_행동이나_위치가_빠진_행동은_INVALID_INPUT() {
        PaperSafariSession session = session(List.of(roundWonBy(ALICE)));

        assertError(() -> act(session, A, "JUMP"), ErrorCode.INVALID_INPUT);
        assertError(() -> act(session, A, "FLIP"), ErrorCode.INVALID_INPUT);
        assertError(() -> session.act(A, new GameAction(null, null, null)), ErrorCode.INVALID_INPUT);
    }

    @Test
    void 라운드가_끝나면_라운드_결과를_돌려준다() {
        PaperSafariSession session = session(List.of(roundWonBy(ALICE)));

        List<GameOutcome> outcomes = playRound(session, A, B);

        assertThat(outcomes).containsExactly(new RoundCompleted(1, List.of(
                new RoundEntry(A, ResultType.WIN, 1),
                new RoundEntry(B, ResultType.LOSE, 51))));
    }

    @Test
    void 라운드가_끝나기_전에는_준비할_수_없다() {
        PaperSafariSession session = session(List.of(roundWonBy(ALICE)));

        assertError(() -> act(session, A, "READY"), ErrorCode.INVALID_PHASE);
    }

    @Test
    void 남은_참가자가_모두_준비하면_다음_라운드가_시작된다() {
        PaperSafariSession session = session(List.of(roundWonBy(ALICE), roundWonBy(ALICE)));
        playRound(session, A, B);

        assertThat(act(session, A, "READY")).isEmpty();
        assertThat(sessionView(session, B).readyPlayerIds()).containsExactly(A);
        act(session, B, "READY");

        assertThat(view(session, A).roundNumber()).isEqualTo(2);
        assertThat(view(session, A).round().phase()).isEqualTo(TurnPhase.SETUP_FLIP);
        assertThat(sessionView(session, A).readyPlayerIds()).isEmpty();
    }

    @Test
    void 마지막_라운드가_끝나면_라운드_결과와_게임_결과를_함께_돌려준다() {
        PaperSafariSession session = session(List.of(roundWonBy(ALICE), roundWonBy(ALICE), roundWonBy(ALICE)));
        playRound(session, A, B);
        readyAll(session);
        playRound(session, A, B);
        readyAll(session);

        List<GameOutcome> outcomes = playRound(session, A, B);

        assertThat(outcomes).containsExactly(
                new RoundCompleted(3, List.of(new RoundEntry(A, ResultType.WIN, 1), new RoundEntry(B, ResultType.LOSE, 51))),
                new GameCompleted(List.of(new MatchEntry(A, ResultType.WIN, 3, 0), new MatchEntry(B, ResultType.LOSE, 0, 1))));
        assertThat(session.isFinished()).isTrue();
    }

    @Test
    void 기권으로_한_명만_남으면_게임_결과만_돌려준다() {
        PaperSafariSession session = session(List.of(roundWonBy(ALICE)));

        List<GameOutcome> outcomes = session.forfeit(B);

        assertThat(outcomes).containsExactly(new GameCompleted(List.of(
                new MatchEntry(A, ResultType.WIN, 0, 0),
                new MatchEntry(B, ResultType.LOSE, 0, 1))));
        assertThat(session.isFinished()).isTrue();
        assertThat(session.isPlaying(A)).isFalse();
    }

    @Test
    void 라운드가_끝난_뒤_기권해도_라운드_결과는_다시_보내지_않는다() {
        PaperSafariSession session = session(List.of(roundWonBy(ALICE)));
        playRound(session, A, B);

        List<GameOutcome> outcomes = session.forfeit(B);

        assertThat(outcomes).hasSize(1);
        assertThat(outcomes.get(0)).isEqualTo(new GameCompleted(List.of(
                new MatchEntry(A, ResultType.WIN, 1, 0),
                new MatchEntry(B, ResultType.LOSE, 0, 1))));
    }
}
