package com.boardgame.oldmaid;

import static com.boardgame.oldmaid.OldMaidFixtures.A;
import static com.boardgame.oldmaid.OldMaidFixtures.B;
import static com.boardgame.oldmaid.OldMaidFixtures.C;
import static com.boardgame.oldmaid.OldMaidFixtures.D;
import static com.boardgame.oldmaid.OldMaidFixtures.JOKER;
import static com.boardgame.oldmaid.OldMaidFixtures.c;
import static com.boardgame.oldmaid.OldMaidFixtures.d;
import static com.boardgame.oldmaid.OldMaidFixtures.game;
import static com.boardgame.oldmaid.OldMaidFixtures.h;
import static com.boardgame.oldmaid.OldMaidFixtures.hands;
import static com.boardgame.oldmaid.OldMaidFixtures.opening;
import static com.boardgame.oldmaid.OldMaidFixtures.s;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameAction;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

// R39: "자동으로 버리기"(DISCARD_ALL). 지금 버릴 수 있는 내 짝을 한 번의 행동으로 모두 버린다.
class OldMaidDiscardAllTest {

    private static final Instant T0 = Instant.parse("2026-10-07T00:00:00Z");
    private static final GameAction DISCARD_ALL = new GameAction("DISCARD_ALL", null, null);

    private static void assertError(Runnable action, ErrorCode code) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(BusinessException.class, error -> assertThat(error.errorCode()).isEqualTo(code));
    }

    // A: 5·9·5·7·7(짝 둘), B: 3·3·조커, C: 4·8(짝 없음). 첫 사람 A.
    private OldMaidGame openingGame() {
        return opening(A, hands(
                List.of(s(Rank.FIVE), h(Rank.NINE), d(Rank.FIVE), c(Rank.SEVEN), s(Rank.SEVEN)),
                List.of(s(Rank.THREE), h(Rank.THREE), JOKER),
                List.of(c(Rank.FOUR), d(Rank.EIGHT))));
    }

    // A: 3·4, B: 3·조커, C: 9·10, D: 4. A가 B의 0번(하트 3)을 뽑아 맨 앞에 끼우면 짝 버리기 단계.
    private OldMaidGame drawnPair() {
        OldMaidGame game = game(A, hands(
                List.of(s(Rank.THREE), s(Rank.FOUR)),
                List.of(h(Rank.THREE), JOKER),
                List.of(c(Rank.NINE), d(Rank.TEN)),
                List.of(c(Rank.FOUR))));
        game.draw(A, new SlotIndex(0));
        return game;
    }

    @Test
    void R39_처음_버리기_단계에는_내_손의_짝을_손패_순서로_모두_버리고_남은_기다린다() {
        OldMaidGame game = openingGame();

        game.discardAll(A);

        assertThat(game.handOf(A)).containsExactly(h(Rank.NINE));
        assertThat(game.discards()).containsExactly(
                new DiscardedPair(A, new CardPair(s(Rank.FIVE), d(Rank.FIVE))),
                new DiscardedPair(A, new CardPair(c(Rank.SEVEN), s(Rank.SEVEN))));
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type)
                .containsExactly(OldMaidEventType.PAIR, OldMaidEventType.PAIR);
        assertThat(game.latestEvents()).allSatisfy(event -> {
            assertThat(event.actor()).isEqualTo(A);
            assertThat(event.auto()).isFalse();
        });
        assertThat(game.isOpening()).isTrue();
        assertThat(game.canDiscard(A)).isFalse();
        assertThat(game.openingDone(A)).isTrue();
        assertThat(game.handOf(B)).hasSize(3);
    }

    @Test
    void R39_처음_버리기_단계의_마지막_짝이면_단계를_끝내고_첫_차례를_시작한다() {
        OldMaidGame game = openingGame();
        game.discardAll(A);

        game.discardAll(B);

        assertThat(game.isOpening()).isFalse();
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type)
                .containsExactly(OldMaidEventType.PAIR, OldMaidEventType.START);
        assertThat(game.drawer()).isEqualTo(A);
        assertThat(game.turnSeq()).isEqualTo(TurnSeq.first());
    }

    @Test
    void R39_처음_버리기_단계에_버릴_짝이_없으면_INVALID_PHASE이고_그대로다() {
        OldMaidGame game = openingGame();
        game.discardAll(A);
        List<OldMaidEvent> before = game.latestEvents();

        assertError(() -> game.discardAll(A), ErrorCode.INVALID_PHASE);
        assertError(() -> game.discardAll(C), ErrorCode.INVALID_PHASE);
        assertError(() -> game.discardAll(new PlayerId(99L)), ErrorCode.NOT_A_PLAYER);

        assertThat(game.latestEvents()).isEqualTo(before);
        assertThat(game.handOf(C)).hasSize(2);
        assertThat(game.isOpening()).isTrue();
    }

    @Test
    void R39_짝_버리기_단계에는_뽑은_사람만_뽑은_짝을_버리고_차례가_넘어간다() {
        OldMaidGame game = drawnPair();

        assertError(() -> game.discardAll(B), ErrorCode.NOT_YOUR_TURN);
        game.discardAll(A);

        assertThat(game.handOf(A)).containsExactly(s(Rank.FOUR));
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type).containsExactly(OldMaidEventType.PAIR);
        assertThat(game.latestEvents().get(0).cards()).containsExactly(h(Rank.THREE), s(Rank.THREE));
        assertThat(game.stage()).isEqualTo(OldMaidStage.DRAW);
        assertThat(game.drawer()).isEqualTo(B);
        assertThat(game.turnSeq()).isEqualTo(new TurnSeq(2L));
    }

    @Test
    void R39_뽑기_단계에는_뽑는_사람은_INVALID_PHASE_남은_NOT_YOUR_TURN() {
        OldMaidGame game = drawnPair();
        game.discardAll(A);

        assertError(() -> game.discardAll(B), ErrorCode.INVALID_PHASE);
        assertError(() -> game.discardAll(A), ErrorCode.NOT_YOUR_TURN);
        assertThat(game.stage()).isEqualTo(OldMaidStage.DRAW);
    }

    @Test
    void R39_짝을_버려_손이_비면_끝내고_카드_가진_사람이_하나면_게임이_끝난다() {
        OldMaidGame game = game(A, hands(List.of(s(Rank.FIVE)), List.of(h(Rank.FIVE), JOKER)));
        game.draw(A, new SlotIndex(0));

        game.discardAll(A);

        assertThat(game.isFinished()).isTrue();
        assertThat(game.rankOf(A)).contains(new FinishRank(1));
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type)
                .containsExactly(OldMaidEventType.PAIR, OldMaidEventType.FINISH, OldMaidEventType.GAME_END);
        assertError(() -> game.discardAll(B), ErrorCode.GAME_ALREADY_OVER);
    }

    @Test
    void R39_세션의_DISCARD_ALL은_사람의_행동이라_마감을_단계가_바뀔_때만_다시_잰다() {
        MutableClock clock = new MutableClock(T0);
        OldMaidSession session = new OldMaidSession(List.of(1L, 2L, 3L), openingGame(), clock);
        clock.advance(Duration.ofSeconds(10));

        session.act(1L, DISCARD_ALL);

        assertThat(session.deadline()).contains(T0.plus(OldMaidTimer.OPENING_LIMIT));
        session.act(2L, DISCARD_ALL);
        assertThat(session.deadline()).contains(clock.instant().plus(OldMaidTimer.LIMIT));
    }
}
