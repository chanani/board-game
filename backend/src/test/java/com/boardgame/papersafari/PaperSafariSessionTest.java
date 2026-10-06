package com.boardgame.papersafari;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static com.boardgame.papersafari.Fixtures.ALICE;
import static com.boardgame.papersafari.Fixtures.FIRST;
import static com.boardgame.papersafari.Fixtures.LOSER_HAND;
import static com.boardgame.papersafari.Fixtures.REST;
import static com.boardgame.papersafari.Fixtures.WINNER_HAND;
import static com.boardgame.papersafari.Fixtures.stack;
import static com.boardgame.papersafari.Fixtures.zeros;
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
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

class PaperSafariSessionTest {

    private static final long A = 1L;
    private static final long B = 2L;
    private static final long C = 3L;

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

    private PaperSafariSession threePlayerSession(List<List<Card>> rounds) {
        return new PaperSafariSession(List.of(A, B, C),
                new RoundFactory(StackedShuffler.rounds(rounds), count -> 0));
    }

    private List<Card> threePlayerRound() {
        return stack(List.of(WINNER_HAND, LOSER_HAND, LOSER_HAND), Card.number(7), zeros(15));
    }

    // finisher가 0으로 5칸을 채워 라운드를 끝낸다. 다른 참가자는 자기 차례에 뽑아서 버린다. 마지막 행동의 결과를 돌려준다.
    private List<GameOutcome> playRound(PaperSafariSession session, long finisher, long... others) {
        flipAll(session, finisher, others);
        List<GameOutcome> last = List.of();
        for (Position position : REST) {
            passUntilTurnOf(session, finisher);
            act(session, finisher, "DRAW_DECK");
            last = act(session, finisher, "SWAP", position);
        }
        return last;
    }

    private void flipAll(PaperSafariSession session, long finisher, long... others) {
        act(session, finisher, "FLIP", FIRST);
        for (long other : others) {
            act(session, other, "FLIP", FIRST);
        }
    }

    private void passUntilTurnOf(PaperSafariSession session, long finisher) {
        long current = view(session, A).round().currentPlayerId();
        while (current != finisher) {
            act(session, current, "DRAW_DECK");
            act(session, current, "DISCARD");
            current = view(session, A).round().currentPlayerId();
        }
    }

    @Test
    void 만들자마자_라운드_번호는_1이다() {
        PaperSafariSession session = session(List.of(roundWonBy(ALICE)));

        assertThat(session.roundNumber()).isEqualTo(1);
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
    void 준비_행동은_더_이상_받지_않는다() {
        PaperSafariSession session = session(List.of(roundWonBy(ALICE)));

        assertError(() -> act(session, A, "READY"), ErrorCode.INVALID_INPUT);
        playRound(session, A, B);
        assertError(() -> act(session, A, "READY"), ErrorCode.INVALID_INPUT);
    }

    @Test
    void 버린_더미에서_가져온_카드를_되돌리는_행동을_처리한다() {
        PaperSafariSession session = session(List.of(roundWonBy(ALICE)));
        flipAll(session, A, B);
        act(session, A, "DRAW_DISCARD");

        List<GameOutcome> outcomes = act(session, A, "CANCEL_DRAW");

        assertThat(outcomes).isEmpty();
        assertThat(view(session, A).round().phase()).isEqualTo(TurnPhase.DRAW);
        assertThat(view(session, A).round().currentPlayerId()).isEqualTo(A);
        assertThat(view(session, A).round().held()).isNull();
    }

    @Test
    void 라운드가_끝나면_라운드_결과와_게임_결과를_함께_돌려주고_게임이_끝난다() {
        PaperSafariSession session = session(List.of(roundWonBy(ALICE)));

        List<GameOutcome> outcomes = playRound(session, A, B);

        assertThat(outcomes).containsExactly(
                new RoundCompleted(1, List.of(new RoundEntry(A, ResultType.WIN, 1), new RoundEntry(B, ResultType.LOSE, 51))),
                new GameCompleted(List.of(new MatchEntry(A, ResultType.WIN, 0, 0), new MatchEntry(B, ResultType.LOSE, 0, 1))));
        assertThat(session.isFinished()).isTrue();
        assertThat(session.isPlaying(A)).isFalse();
        assertThat(view(session, B).status()).isEqualTo(GameStatus.GAME_OVER);
        assertThat(view(session, B).winnerId()).isEqualTo(A);
    }

    @Test
    void 최저점이_같으면_전원_무승부로_게임_결과를_돌려준다() {
        PaperSafariSession session = session(List.of(GameFixtures.tiedRound()));

        List<GameOutcome> outcomes = playRound(session, A, B);

        assertThat(outcomes).containsExactly(
                new RoundCompleted(1, List.of(new RoundEntry(A, ResultType.DRAW, 1), new RoundEntry(B, ResultType.DRAW, 1))),
                new GameCompleted(List.of(new MatchEntry(A, ResultType.DRAW, 0, 0), new MatchEntry(B, ResultType.DRAW, 0, 1))));
        assertThat(session.isFinished()).isTrue();
        assertThat(view(session, A).winnerId()).isNull();
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
    void 게임이_끝난_뒤에는_기권할_수_없다() {
        PaperSafariSession session = session(List.of(roundWonBy(ALICE)));
        playRound(session, A, B);

        assertError(() -> session.forfeit(B), ErrorCode.GAME_ALREADY_OVER);
    }

    @Test
    void 세_명_중_한_명이_라운드_중_기권하면_결과_없이_계속된다() {
        PaperSafariSession session = threePlayerSession(List.of(threePlayerRound()));
        flipAll(session, A, B, C);

        List<GameOutcome> outcomes = session.forfeit(C);

        assertThat(outcomes).isEmpty();
        assertThat(session.isPlaying(A)).isTrue();
        assertThat(session.isPlaying(C)).isFalse();
        assertThat(session.isFinished()).isFalse();
    }

    @Test
    void 기권자가_있는_게임이_끝나면_기권자는_패배로_기록된다() {
        PaperSafariSession session = threePlayerSession(List.of(threePlayerRound()));
        session.forfeit(C);

        List<GameOutcome> outcomes = playRound(session, A, B);

        assertThat(outcomes).containsExactly(
                new RoundCompleted(1, List.of(new RoundEntry(A, ResultType.WIN, 1), new RoundEntry(B, ResultType.LOSE, 51))),
                new GameCompleted(List.of(
                        new MatchEntry(A, ResultType.WIN, 0, 0),
                        new MatchEntry(B, ResultType.LOSE, 0, 1),
                        new MatchEntry(C, ResultType.LOSE, 0, 2))));
    }

    @Test
    void 기권자가_있는_게임이_무승부로_끝나면_기권자는_패배이고_남은_사람은_무승부다() {
        PaperSafariSession session = threePlayerSession(List.of(
                stack(List.of(WINNER_HAND, Fixtures.numbers(1, 0, 0, 0, 0, 0), LOSER_HAND), Card.number(7), zeros(15))));
        session.forfeit(C);

        List<GameOutcome> outcomes = playRound(session, A, B);

        assertThat(outcomes).containsExactly(
                new RoundCompleted(1, List.of(new RoundEntry(A, ResultType.DRAW, 1), new RoundEntry(B, ResultType.DRAW, 1))),
                new GameCompleted(List.of(
                        new MatchEntry(A, ResultType.DRAW, 0, 0),
                        new MatchEntry(B, ResultType.DRAW, 0, 1),
                        new MatchEntry(C, ResultType.LOSE, 0, 2))));
        assertThat(view(session, A).winnerId()).isNull();
    }

    @Test
    void 화면_정보에는_토큰과_준비_목록이_없다() throws Exception {
        PaperSafariSession session = session(List.of(roundWonBy(ALICE)));
        playRound(session, A, B);

        JsonNode json = new ObjectMapper().valueToTree(session.viewFor(A));

        assertThat(json.has("readyPlayerIds")).isFalse();
        assertThat(json.get("game").has("tokens")).isFalse();
        assertThat(json.get("game").get("status").asText()).isEqualTo("GAME_OVER");
        assertThat(json.get("game").get("roundNumber").asInt()).isEqualTo(1);
        assertThat(json.get("game").get("winnerId").asLong()).isEqualTo(A);
    }

    @Test
    void 화면에_게임_종류_구분자가_붙는다() {
        PaperSafariSession session = session(List.of(roundWonBy(ALICE)));

        JsonNode json = new ObjectMapper().valueToTree(session.viewFor(A));

        assertThat(json.get("gameType").asText()).isEqualTo("PAPER_SAFARI");
        assertThat(json.get("game").get("status").asText()).isEqualTo("IN_ROUND");
    }
}
