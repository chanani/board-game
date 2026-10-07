package com.boardgame.oldmaid;

import static com.boardgame.oldmaid.OldMaidFixtures.A;
import static com.boardgame.oldmaid.OldMaidFixtures.B;
import static com.boardgame.oldmaid.OldMaidFixtures.JOKER;
import static com.boardgame.oldmaid.OldMaidFixtures.c;
import static com.boardgame.oldmaid.OldMaidFixtures.d;
import static com.boardgame.oldmaid.OldMaidFixtures.game;
import static com.boardgame.oldmaid.OldMaidFixtures.h;
import static com.boardgame.oldmaid.OldMaidFixtures.hands;
import static com.boardgame.oldmaid.OldMaidFixtures.s;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.MatchEntry;
import com.boardgame.game.ResultType;
import com.boardgame.game.RoundCompleted;
import com.boardgame.game.RoundEntry;
import com.boardgame.oldmaid.view.OldMaidEventView;
import com.boardgame.oldmaid.view.OldMaidPeekSignal;
import com.boardgame.oldmaid.view.OldMaidSessionView;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class OldMaidSessionTest {

    private static final Instant T0 = Instant.parse("2026-10-07T00:00:00Z");

    private final MutableClock clock = new MutableClock(T0);

    static GameAction draw(int index) {
        return new GameAction("DRAW", null, null, null, null, null, index);
    }

    static GameAction discard(PlayingCard first, PlayingCard second) {
        return new GameAction("DISCARD", null, null, null, null, null, null,
                List.of(first.id().value(), second.id().value()));
    }

    static GameAction peek(Integer index) {
        return new GameAction("PEEK", null, null, null, null, null, index);
    }

    private OldMaidSession threePlayers() {
        OldMaidGame game = game(A, hands(
                List.of(s(Rank.FIVE)),
                List.of(h(Rank.FIVE), d(Rank.SIX)),
                List.of(JOKER, c(Rank.SIX))));
        return new OldMaidSession(List.of(1L, 2L, 3L), game, clock);
    }

    private static void assertError(Runnable action, ErrorCode code) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(BusinessException.class, error -> assertThat(error.errorCode()).isEqualTo(code));
    }

    @Test
    void R32_끝나면_등수를_라운드_점수와_경기_tokens로_내고_1등만_WIN이다() {
        OldMaidSession session = threePlayers();

        List<GameOutcome> drawn = session.act(1L, draw(0));
        List<GameOutcome> first = session.act(1L, discard(s(Rank.FIVE), h(Rank.FIVE)));
        session.act(2L, draw(1));
        List<GameOutcome> last = session.act(2L, discard(d(Rank.SIX), c(Rank.SIX)));

        assertThat(drawn).isEmpty();
        assertThat(first).isEmpty();
        assertThat(session.isFinished()).isTrue();
        assertThat(last).containsExactly(
                new RoundCompleted(1, List.of(
                        new RoundEntry(1L, ResultType.WIN, 1),
                        new RoundEntry(2L, ResultType.LOSE, 2),
                        new RoundEntry(3L, ResultType.LOSE, 3))),
                new GameCompleted(List.of(
                        new MatchEntry(1L, ResultType.WIN, 1, 0),
                        new MatchEntry(2L, ResultType.LOSE, 2, 1),
                        new MatchEntry(3L, ResultType.LOSE, 3, 2))));
        assertThat(session.deadline()).isEmpty();
        assertError(() -> session.act(3L, draw(0)), ErrorCode.GAME_ALREADY_OVER);
    }

    @Test
    void R32_기권으로_끝나도_라운드와_경기를_기록한다() {
        OldMaidSession session = new OldMaidSession(List.of(1L, 2L),
                game(A, hands(List.of(s(Rank.TWO)), List.of(h(Rank.THREE), JOKER))), clock);

        List<GameOutcome> outcomes = session.forfeit(2L);

        assertThat(outcomes).containsExactly(
                new RoundCompleted(1, List.of(new RoundEntry(1L, ResultType.WIN, 1), new RoundEntry(2L, ResultType.LOSE, 2))),
                new GameCompleted(List.of(new MatchEntry(1L, ResultType.WIN, 1, 0), new MatchEntry(2L, ResultType.LOSE, 2, 1))));
    }

    @Test
    void R28_카드를_가진_사람만_게임_중이다() {
        OldMaidSession session = threePlayers();

        session.act(1L, draw(0));
        assertThat(session.isPlaying(1L)).isTrue();
        session.act(1L, discard(s(Rank.FIVE), h(Rank.FIVE)));

        assertThat(session.isPlaying(1L)).isFalse();
        assertThat(session.isPlaying(2L)).isTrue();
        assertThat(session.isPlaying(99L)).isFalse();
        assertThat(session.roundNumber()).isEqualTo(1);
    }

    @Test
    void 형식이_틀린_행동은_INVALID_INPUT() {
        OldMaidSession session = threePlayers();

        assertError(() -> session.act(1L, new GameAction("FLIP", 0, 0)), ErrorCode.INVALID_INPUT);
        assertError(() -> session.act(1L, new GameAction("DRAW", null, null)), ErrorCode.INVALID_INPUT);
        assertError(() -> session.act(1L, peek(0)), ErrorCode.INVALID_INPUT);
        assertError(() -> session.act(1L, draw(-1)), ErrorCode.OLD_MAID_INVALID_SLOT);
        assertError(() -> session.signal(1L, draw(0)), ErrorCode.INVALID_INPUT);
        assertError(() -> session.act(1L, new GameAction("DISCARD", null, null)), ErrorCode.INVALID_INPUT);
        assertError(() -> session.act(1L, new GameAction("DISCARD", null, null, null, null, null, null, List.of(0))),
                ErrorCode.INVALID_INPUT);
    }

    @Test
    void R20_받아_준_신호는_모두에게_보낼_내용을_돌려준다() {
        OldMaidSession session = threePlayers();

        Optional<Object> sent = session.signal(1L, peek(1));
        Optional<Object> notMine = session.signal(2L, peek(0));
        Optional<Object> negative = session.signal(1L, peek(-1));
        clock.advance(Duration.ofMillis(100));
        Optional<Object> cleared = session.signal(1L, peek(null));

        assertThat(sent).contains(new OldMaidPeekSignal("OLD_MAID", "PEEK", T0.toEpochMilli(), 1L, 1L, 2L, 1, 1L));
        assertThat(notMine).isEmpty();
        assertThat(negative).isEmpty();
        assertThat(cleared).contains(new OldMaidPeekSignal("OLD_MAID", "PEEK", T0.toEpochMilli(), 1L, 1L, 2L, null, 2L));
    }

    @Test
    void 섞기는_세션의_시계로_쿨다운을_잰다() {
        OldMaidSession session = threePlayers();
        session.act(2L, new GameAction("SHUFFLE", null, null));

        assertError(() -> session.act(2L, new GameAction("SHUFFLE", null, null)), ErrorCode.OLD_MAID_SHUFFLE_TOO_FAST);
        clock.advance(Duration.ofSeconds(1));
        assertThat(session.act(2L, new GameAction("SHUFFLE", null, null))).isEmpty();
        List<OldMaidEventView> events = ((OldMaidSessionView) session.viewFor(2L)).game().events();
        assertThat(events.get(events.size() - 1).type()).isEqualTo(OldMaidEventType.SHUFFLE);
    }

    @Test
    void R28_끝낸_사람이_나가도_기권이_아니고_오류도_없다() {
        OldMaidSession session = threePlayers();
        session.act(1L, draw(0));
        session.act(1L, discard(s(Rank.FIVE), h(Rank.FIVE)));
        clock.advance(Duration.ofSeconds(3));

        List<GameOutcome> outcomes = session.forfeit(1L);

        assertThat(outcomes).isEmpty();
        assertThat(session.isFinished()).isFalse();
        assertThat(session.deadline()).contains(T0.plusSeconds(15));
        OldMaidSessionView view = (OldMaidSessionView) session.viewFor(3L);
        assertThat(view.game().currentPlayerId()).isEqualTo(2L);
        assertThat(view.game().players().get(0).forfeited()).isFalse();
        assertThat(view.game().players().get(0).rank()).isEqualTo(1);
    }
}
