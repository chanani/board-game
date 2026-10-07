package com.boardgame.oldmaid;

import static com.boardgame.oldmaid.OldMaidFixtures.A;
import static com.boardgame.oldmaid.OldMaidFixtures.B;
import static com.boardgame.oldmaid.OldMaidFixtures.C;
import static com.boardgame.oldmaid.OldMaidFixtures.D;
import static com.boardgame.oldmaid.OldMaidFixtures.JOKER;
import static com.boardgame.oldmaid.OldMaidFixtures.c;
import static com.boardgame.oldmaid.OldMaidFixtures.choice;
import static com.boardgame.oldmaid.OldMaidFixtures.d;
import static com.boardgame.oldmaid.OldMaidFixtures.h;
import static com.boardgame.oldmaid.OldMaidFixtures.hands;
import static com.boardgame.oldmaid.OldMaidFixtures.opening;
import static com.boardgame.oldmaid.OldMaidFixtures.s;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.support.FixedRandom;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

// R36·R38: 처음 버리기 단계. 모두가 동시에 자기 손에서 같은 숫자 두 장을 골라 버린다.
class OldMaidOpeningTest {

    private static final Instant T0 = Instant.parse("2026-10-07T00:00:00Z");

    private static void assertError(Runnable action, ErrorCode code) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(BusinessException.class, error -> assertThat(error.errorCode()).isEqualTo(code));
    }

    // A: 5·5·9, B: 7·7·조커, C: 3·4. 첫 사람 A.
    private OldMaidGame threePlayers() {
        return opening(A, hands(
                List.of(s(Rank.FIVE), h(Rank.NINE), d(Rank.FIVE)),
                List.of(c(Rank.SEVEN), JOKER, s(Rank.SEVEN)),
                List.of(c(Rank.THREE), d(Rank.FOUR))));
    }

    @Test
    void R36_모두가_순서와_상관없이_동시에_자기_짝을_버리고_마지막_짝이_버려지면_첫_차례가_시작된다() {
        OldMaidGame game = threePlayers();
        assertThat(game.canDiscard(A)).isTrue();
        assertThat(game.canDiscard(B)).isTrue();
        assertThat(game.canDiscard(C)).isFalse();
        assertThat(game.openingDone(C)).isTrue();
        assertThat(game.openingDone(B)).isFalse();

        game.discard(B, choice(s(Rank.SEVEN), c(Rank.SEVEN)));

        assertThat(game.isOpening()).isTrue();
        assertThat(game.openingDone(B)).isTrue();
        assertThat(game.canDiscard(B)).isFalse();
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type).containsExactly(OldMaidEventType.PAIR);
        assertThat(game.latestEvents().get(0).actor()).isEqualTo(B);

        game.discard(A, choice(s(Rank.FIVE), d(Rank.FIVE)));

        assertThat(game.isOpening()).isFalse();
        assertThat(game.handOf(A)).containsExactly(h(Rank.NINE));
        assertThat(game.handOf(B)).containsExactly(JOKER);
        assertThat(game.discards()).containsExactly(
                new DiscardedPair(B, new CardPair(s(Rank.SEVEN), c(Rank.SEVEN))),
                new DiscardedPair(A, new CardPair(s(Rank.FIVE), d(Rank.FIVE))));
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type)
                .containsExactly(OldMaidEventType.PAIR, OldMaidEventType.START);
        assertThat(game.drawer()).isEqualTo(A);
        assertThat(game.target()).isEqualTo(B);
        assertThat(game.turnSeq()).isEqualTo(TurnSeq.first());
    }

    @Test
    void R36_같은_숫자가_아니면_OLD_MAID_NOT_A_PAIR_내_카드가_아니면_OLD_MAID_CARD_NOT_IN_HAND이고_그대로다() {
        OldMaidGame game = threePlayers();
        List<OldMaidEvent> before = game.latestEvents();

        assertError(() -> game.discard(A, choice(s(Rank.FIVE), h(Rank.NINE))), ErrorCode.OLD_MAID_NOT_A_PAIR);
        assertError(() -> game.discard(B, choice(JOKER, c(Rank.SEVEN))), ErrorCode.OLD_MAID_NOT_A_PAIR);
        assertError(() -> game.discard(A, choice(s(Rank.SEVEN), c(Rank.SEVEN))), ErrorCode.OLD_MAID_CARD_NOT_IN_HAND);
        assertError(() -> game.discard(new PlayerId(99L), choice(s(Rank.FIVE), d(Rank.FIVE))), ErrorCode.NOT_A_PLAYER);

        assertThat(game.latestEvents()).isEqualTo(before);
        assertThat(game.cardCount(A)).isEqualTo(3);
        assertThat(game.discardCount()).isZero();
    }

    @Test
    void R36_아무_손에도_짝이_없으면_곧바로_첫_차례다() {
        OldMaidGame game = opening(B, hands(
                List.of(s(Rank.FIVE)),
                List.of(h(Rank.NINE), JOKER),
                List.of(c(Rank.THREE))));

        assertThat(game.isOpening()).isFalse();
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type)
                .containsExactly(OldMaidEventType.DEAL, OldMaidEventType.START);
        assertThat(game.drawer()).isEqualTo(B);
        assertThat(game.target()).isEqualTo(C);
    }

    @Test
    void R36_R8_단계가_끝날_때_빈_손은_버린_순서가_아니라_첫_사람부터_시계_방향_순서로_등수를_받는다() {
        OldMaidGame game = opening(B, hands(
                List.of(s(Rank.FIVE)),
                List.of(s(Rank.ACE), h(Rank.ACE)),
                List.of(d(Rank.FIVE), JOKER, c(Rank.SIX)),
                List.of(s(Rank.KING), h(Rank.KING))));

        game.discard(D, choice(s(Rank.KING), h(Rank.KING)));
        assertThat(game.finishRankOf(D)).isEmpty();
        game.discard(B, choice(s(Rank.ACE), h(Rank.ACE)));

        assertThat(game.finishRankOf(B)).contains(new FinishRank(1));
        assertThat(game.finishRankOf(D)).contains(new FinishRank(2));
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type)
                .containsExactly(OldMaidEventType.PAIR, OldMaidEventType.FINISH, OldMaidEventType.FINISH,
                        OldMaidEventType.START);
        assertThat(game.drawer()).isEqualTo(C);
        assertThat(game.target()).isEqualTo(A);
    }

    @Test
    void R36_단계_중에는_뽑기와_신호가_없고_섞기는_카드를_가진_누구나_할_수_있다() {
        OldMaidGame game = threePlayers();

        assertError(() -> game.draw(A, new SlotIndex(0)), ErrorCode.INVALID_PHASE);
        assertThat(game.peek(A, Optional.of(new SlotIndex(0)), T0)).isFalse();
        assertThat(game.canShuffle(A)).isTrue();
        game.shuffle(A, T0);
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type).containsExactly(OldMaidEventType.SHUFFLE);
        assertThat(game.isOpening()).isTrue();
    }

    @Test
    void R38_마감이_지나면_남은_짝을_모두_자동으로_버리고_첫_차례를_시작한다() {
        OldMaidGame game = threePlayers();
        game.discard(B, choice(s(Rank.SEVEN), c(Rank.SEVEN)));

        List<PlayerId> actors = game.autoAct(new FixedRandom(0));

        assertThat(actors).containsExactly(A);
        assertThat(game.handOf(A)).containsExactly(h(Rank.NINE));
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type)
                .containsExactly(OldMaidEventType.PAIR, OldMaidEventType.START);
        assertThat(game.latestEvents()).allMatch(OldMaidEvent::auto);
        assertThat(game.latestEvents().get(0).cards()).containsExactly(s(Rank.FIVE), d(Rank.FIVE));
        assertThat(game.drawer()).isEqualTo(A);
    }

    @Test
    void R38_자동으로_버릴_때_짝이_남은_사람이_여럿이면_첫_사람부터_모두() {
        OldMaidGame game = threePlayers();

        List<PlayerId> actors = game.autoAct(new FixedRandom(0));

        assertThat(actors).containsExactly(A, B);
        assertThat(game.latestEvents()).extracting(OldMaidEvent::actor).containsExactly(A, B, A);
        assertThat(game.discardCount()).isEqualTo(4);
    }

    @Test
    void R25_R36_단계_중_기권하면_손패를_다음_사람에게_넘기고_서버가_짝을_버린다() {
        OldMaidGame game = opening(A, hands(
                List.of(s(Rank.FIVE), h(Rank.FIVE), s(Rank.TWO)),
                List.of(c(Rank.TWO), JOKER, h(Rank.EIGHT), s(Rank.EIGHT)),
                List.of(c(Rank.THREE), d(Rank.FOUR)),
                List.of(s(Rank.THREE))));

        game.forfeit(C);

        // C의 손패는 D가 받아 3 짝이 버려지고 D는 4만 남는다. A·B에는 아직 짝이 있어 단계는 이어진다.
        assertThat(game.hasForfeited(C)).isTrue();
        assertThat(game.handOf(D)).containsExactly(d(Rank.FOUR));
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type)
                .containsExactly(OldMaidEventType.FORFEIT, OldMaidEventType.PAIR);
        assertThat(game.isOpening()).isTrue();

        game.forfeit(B);

        // B의 손패(2·조커·8·8)는 D가 받는다. 8 짝은 받으며 버려지고, A에게만 짝(5)이 남는다.
        assertThat(game.handOf(D)).containsExactly(d(Rank.FOUR), c(Rank.TWO), JOKER);
        assertThat(game.isOpening()).isTrue();
        game.discard(A, choice(s(Rank.FIVE), h(Rank.FIVE)));
        assertThat(game.drawer()).isEqualTo(A);
        assertThat(game.target()).isEqualTo(D);
    }

    @Test
    void R29_R36_둘이서_단계_중_기권하면_남은_사람이_남은_승자로_끝난다() {
        OldMaidGame game = opening(A, hands(
                List.of(s(Rank.FIVE), h(Rank.FIVE), s(Rank.TWO)),
                List.of(c(Rank.TWO), JOKER)));

        game.forfeit(B);

        OldMaidResult result = game.result().orElseThrow();
        assertThat(result.reason()).isEqualTo(OldMaidEndReason.FORFEIT);
        assertThat(result.ranking().of(A).placement()).isEqualTo(Placement.LAST_STANDING);
        assertThat(result.ranking().rankOf(B)).isEqualTo(new FinishRank(2));
    }

    @Test
    void R36_R29_단계_중_기권으로_끝나면_이미_손을_비운_사람도_등수를_받는다() {
        OldMaidGame game = opening(A, hands(
                List.of(s(Rank.FIVE), h(Rank.FIVE)),
                List.of(c(Rank.TWO), JOKER, d(Rank.NINE), c(Rank.NINE)),
                List.of(s(Rank.TWO))));
        game.discard(A, choice(s(Rank.FIVE), h(Rank.FIVE)));

        game.forfeit(C);

        // C의 2는 B가 받아 2 짝과 함께 B 자신의 9 짝도 버려진다(R25). A는 이미 비었으니 1등, B는 조커를 쥔 도둑.
        OldMaidResult result = game.result().orElseThrow();
        assertThat(result.ranking().entries()).containsExactly(
                new RankedPlayer(A, new FinishRank(1), Placement.FINISHED),
                new RankedPlayer(B, new FinishRank(2), Placement.THIEF),
                new RankedPlayer(C, new FinishRank(3), Placement.FORFEITED));
    }
}
