package com.boardgame.uno;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static com.boardgame.uno.UnoColor.BLUE;
import static com.boardgame.uno.UnoColor.GREEN;
import static com.boardgame.uno.UnoColor.RED;
import static com.boardgame.uno.UnoFixtures.drawTwo;
import static com.boardgame.uno.UnoFixtures.filler;
import static com.boardgame.uno.UnoFixtures.num;
import static com.boardgame.uno.UnoFixtures.wild;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.MatchEntry;
import com.boardgame.game.ResultType;
import com.boardgame.game.RoundCompleted;
import com.boardgame.game.RoundEntry;
import com.boardgame.support.MutableClock;
import com.boardgame.uno.view.UnoSessionView;
import com.boardgame.uno.view.UnoView;
import java.time.Instant;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

class UnoSessionTest {

    private static final long A = 1L;
    private static final long B = 2L;
    private static final long C = 3L;
    private static final List<List<UnoCard>> HANDS = List.of(
            List.of(num(RED, 1), num(RED, 2)), List.of(num(BLUE, 9), wild(0)), List.of(num(GREEN, 3), drawTwo(BLUE)));

    private final MutableClock clock = new MutableClock(Instant.parse("2026-10-07T00:00:00Z"));

    private UnoSession session(List<Long> memberIds, List<List<UnoCard>> hands) {
        return new UnoSession(memberIds, UnoFixtures.factory(hands, num(RED, 5), filler(20), 0), clock);
    }

    private UnoSession threePlayers() {
        return session(List.of(A, B, C), HANDS);
    }

    private static GameAction play(UnoCard card) {
        return new GameAction("PLAY", null, null, card.id().value(), null, null);
    }

    private static GameAction action(String type) {
        return new GameAction(type, null, null);
    }

    private static UnoView view(UnoSession session, long memberId) {
        UnoSessionView view = (UnoSessionView) session.viewFor(memberId);
        return view.game();
    }

    @Test
    void 행동_type이_없거나_모르면_INVALID_INPUT() {
        UnoSession session = threePlayers();

        assertError(() -> session.act(A, new GameAction(null, null, null)), ErrorCode.INVALID_INPUT);
        assertError(() -> session.act(A, action("FLIP")), ErrorCode.INVALID_INPUT);
    }

    @Test
    void PLAY에_cardId가_없거나_CATCH_UNO에_targetId가_없으면_INVALID_INPUT() {
        UnoSession session = threePlayers();

        assertError(() -> session.act(A, action("PLAY")), ErrorCode.INVALID_INPUT);
        assertError(() -> session.act(B, action("CATCH_UNO")), ErrorCode.INVALID_INPUT);
    }

    @Test
    void GameAction으로_와일드를_색과_함께_낸다() {
        UnoSession session = session(List.of(A, B), List.of(List.of(wild(0), num(RED, 1)), List.of(num(GREEN, 1), num(GREEN, 2))));

        session.act(A, new GameAction("PLAY", null, null, wild(0).id().value(), "GREEN", null));

        assertThat(view(session, A).currentColor()).isEqualTo(GREEN);
        assertThat(view(session, A).currentPlayerId()).isEqualTo(B);
    }

    @Test
    void R32_손패를_비워_끝나면_라운드와_게임_결과를_한_번만_낸다() {
        UnoSession session = threePlayers();
        assertThat(session.act(A, play(num(RED, 1)))).isEmpty();
        assertThat(session.act(B, action("DRAW"))).isEmpty();
        assertThat(session.act(C, action("DRAW"))).isEmpty();
        assertThat(session.act(C, action("KEEP"))).isEmpty();

        List<GameOutcome> outcomes = session.act(A, play(num(RED, 2)));

        assertThat(outcomes).containsExactly(
                new RoundCompleted(1, List.of(
                        new RoundEntry(A, ResultType.WIN, 83), new RoundEntry(B, ResultType.LOSE, 0), new RoundEntry(C, ResultType.LOSE, 0))),
                new GameCompleted(List.of(
                        new MatchEntry(A, ResultType.WIN, 0, 0), new MatchEntry(B, ResultType.LOSE, 0, 1), new MatchEntry(C, ResultType.LOSE, 0, 2))));
        assertThat(session.isFinished()).isTrue();
        assertError(() -> session.act(B, action("DRAW")), ErrorCode.GAME_ALREADY_OVER);
    }

    @Test
    void R32_기권자는_라운드에서_빠지고_게임_결과에는_LOSE로_남는다() {
        UnoSession session = threePlayers();
        assertThat(session.forfeit(C)).isEmpty();
        session.act(A, play(num(RED, 1)));
        session.act(B, action("DRAW"));

        List<GameOutcome> outcomes = session.act(A, play(num(RED, 2)));

        assertThat(outcomes).containsExactly(
                new RoundCompleted(1, List.of(new RoundEntry(A, ResultType.WIN, 59), new RoundEntry(B, ResultType.LOSE, 0))),
                new GameCompleted(List.of(
                        new MatchEntry(A, ResultType.WIN, 0, 0), new MatchEntry(B, ResultType.LOSE, 0, 1), new MatchEntry(C, ResultType.LOSE, 0, 2))));
    }

    @Test
    void R33_기권으로_끝나면_GameCompleted만_낸다() {
        UnoSession session = session(List.of(A, B), List.of(List.of(num(RED, 1)), List.of(num(GREEN, 1))));

        List<GameOutcome> outcomes = session.forfeit(B);

        assertThat(outcomes).containsExactly(new GameCompleted(List.of(
                new MatchEntry(A, ResultType.WIN, 0, 0), new MatchEntry(B, ResultType.LOSE, 0, 1))));
    }

    @Test
    void isPlaying은_남은_참가자이고_게임_중일_때만_참이다() {
        UnoSession session = threePlayers();

        assertThat(session.isPlaying(A)).isTrue();
        assertThat(session.isPlaying(99L)).isFalse();
        session.forfeit(C);
        assertThat(session.isPlaying(C)).isFalse();
        session.forfeit(B);
        assertThat(session.isFinished()).isTrue();
        assertThat(session.isPlaying(A)).isFalse();
        assertThat(session.roundNumber()).isEqualTo(1);
    }

    @Test
    void 시간_초과면_대신_행동하고_autoActSeq가_오르며_사람이_행동하면_대상이_비워진다() {
        UnoSession session = threePlayers();

        session.autoAct(new Random());

        assertThat(view(session, B).lastAutoActorIds()).containsExactly(A);
        assertThat(view(session, B).autoActSeq()).isEqualTo(1L);
        session.act(B, action("DRAW"));
        assertThat(view(session, B).lastAutoActorIds()).isEmpty();
        assertThat(view(session, B).autoActSeq()).isEqualTo(1L);
    }
}
