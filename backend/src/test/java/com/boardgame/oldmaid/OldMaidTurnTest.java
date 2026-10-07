package com.boardgame.oldmaid;

import static com.boardgame.oldmaid.OldMaidFixtures.A;
import static com.boardgame.oldmaid.OldMaidFixtures.B;
import static com.boardgame.oldmaid.OldMaidFixtures.C;
import static com.boardgame.oldmaid.OldMaidFixtures.D;
import static com.boardgame.oldmaid.OldMaidFixtures.JOKER;
import static com.boardgame.oldmaid.OldMaidFixtures.c;
import static com.boardgame.oldmaid.OldMaidFixtures.choice;
import static com.boardgame.oldmaid.OldMaidFixtures.d;
import static com.boardgame.oldmaid.OldMaidFixtures.game;
import static com.boardgame.oldmaid.OldMaidFixtures.h;
import static com.boardgame.oldmaid.OldMaidFixtures.hands;
import static com.boardgame.oldmaid.OldMaidFixtures.s;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.List;
import org.junit.jupiter.api.Test;

class OldMaidTurnTest {

    private static void assertError(Runnable action, ErrorCode code) {
        assertThatThrownBy(action::run)
                .isInstanceOfSatisfying(BusinessException.class, error -> assertThat(error.errorCode()).isEqualTo(code));
    }

    private OldMaidGame threePlayers() {
        return game(A, hands(
                List.of(s(Rank.THREE), s(Rank.FOUR)),
                List.of(h(Rank.THREE), JOKER),
                List.of(c(Rank.NINE), d(Rank.TEN))));
    }

    @Test
    void R12_R37_뽑은_카드가_짝이면_버리지_않고_같은_차례에서_짝_버리기_단계가_된다() {
        OldMaidGame game = threePlayers();

        game.draw(A, new SlotIndex(0));

        assertThat(game.handOf(A)).containsExactly(h(Rank.THREE), s(Rank.THREE), s(Rank.FOUR));
        assertThat(game.handOf(B)).containsExactly(JOKER);
        assertThat(game.discardCount()).isZero();
        assertThat(game.stage()).isEqualTo(OldMaidStage.DISCARD);
        assertThat(game.drawer()).isEqualTo(A);
        assertThat(game.target()).isEqualTo(B);
        assertThat(game.turnSeq()).isEqualTo(TurnSeq.first());
        assertThat(game.canDiscard(A)).isTrue();
        assertThat(game.canDiscard(B)).isFalse();
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type).containsExactly(OldMaidEventType.DRAW);
        OldMaidEvent draw = game.latestEvents().get(0);
        assertThat(draw.actor()).isEqualTo(A);
        assertThat(draw.target()).isEqualTo(B);
        assertThat(draw.cards()).isEmpty();
    }

    @Test
    void R37_뽑은_사람이_짝을_버리면_공개하고_차례가_넘어간다() {
        OldMaidGame game = threePlayers();
        game.draw(A, new SlotIndex(0));

        game.discard(A, choice(s(Rank.THREE), h(Rank.THREE)));

        assertThat(game.handOf(A)).containsExactly(s(Rank.FOUR));
        assertThat(game.recentPairs(6)).containsExactly(new CardPair(s(Rank.THREE), h(Rank.THREE)));
        assertThat(game.discards()).containsExactly(new DiscardedPair(A, new CardPair(s(Rank.THREE), h(Rank.THREE))));
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type).containsExactly(OldMaidEventType.PAIR);
        assertThat(game.latestEvents().get(0).cards()).containsExactly(s(Rank.THREE), h(Rank.THREE));
        assertThat(game.stage()).isEqualTo(OldMaidStage.DRAW);
        assertThat(game.drawer()).isEqualTo(B);
        assertThat(game.target()).isEqualTo(C);
        assertThat(game.turnSeq()).isEqualTo(new TurnSeq(2L));
    }

    @Test
    void R13_짝이_없으면_무작위_자리에_끼우고_이벤트에_카드를_싣지_않는다() {
        OldMaidGame game = threePlayers();

        game.draw(A, new SlotIndex(1));

        assertThat(game.handOf(A)).containsExactly(JOKER, s(Rank.THREE), s(Rank.FOUR));
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type).containsExactly(OldMaidEventType.DRAW);
        assertThat(game.latestEvents().get(0).cards()).isEmpty();
    }

    @Test
    void R15_다음_차례는_뽑은_사람_다음_카드_가진_사람이고_상대는_그_다음_사람() {
        OldMaidGame game = threePlayers();

        game.draw(A, new SlotIndex(1));

        assertThat(game.drawer()).isEqualTo(B);
        assertThat(game.target()).isEqualTo(C);
        assertThat(game.turnSeq()).isEqualTo(new TurnSeq(2L));
    }

    @Test
    void R11_끝낸_사람은_건너뛰고_다음_카드_가진_사람에게서_뽑는다() {
        OldMaidGame game = game(A, hands(
                List.of(s(Rank.TWO)),
                List.of(s(Rank.ACE), h(Rank.ACE)),
                List.of(c(Rank.TWO), JOKER),
                List.of(d(Rank.NINE))));

        assertThat(game.finishRankOf(B)).contains(new FinishRank(1));
        assertThat(game.target()).isEqualTo(C);
    }

    @Test
    void R14_뺏긴_상대는_뽑힐_때_뽑은_사람은_짝을_버린_뒤_등수를_받는다() {
        OldMaidGame game = game(A, hands(
                List.of(s(Rank.FIVE)),
                List.of(h(Rank.FIVE)),
                List.of(JOKER, d(Rank.SEVEN)),
                List.of(c(Rank.SEVEN), s(Rank.EIGHT))));

        game.draw(A, new SlotIndex(0));

        assertThat(game.finishRankOf(B)).contains(new FinishRank(1));
        assertThat(game.finishRankOf(A)).isEmpty();
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type)
                .containsExactly(OldMaidEventType.DRAW, OldMaidEventType.FINISH);

        game.discard(A, choice(h(Rank.FIVE), s(Rank.FIVE)));

        assertThat(game.finishRankOf(A)).contains(new FinishRank(2));
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type)
                .containsExactly(OldMaidEventType.PAIR, OldMaidEventType.FINISH);
        assertThat(game.drawer()).isEqualTo(C);
        assertThat(game.target()).isEqualTo(D);
    }

    @Test
    void R16_짝을_버려_카드_가진_사람이_1명이면_끝나고_그_사람이_도둑이다() {
        OldMaidGame game = game(A, hands(List.of(s(Rank.FIVE)), List.of(h(Rank.FIVE), JOKER)));
        game.draw(A, new SlotIndex(0));
        assertThat(game.isFinished()).isFalse();

        game.discard(A, choice(s(Rank.FIVE), h(Rank.FIVE)));

        assertThat(game.isFinished()).isTrue();
        OldMaidResult result = game.result().orElseThrow();
        assertThat(result.reason()).isEqualTo(OldMaidEndReason.NORMAL);
        assertThat(result.winner()).isEqualTo(A);
        assertThat(result.thief()).contains(B);
        assertThat(game.rankOf(B)).contains(new FinishRank(2));
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type)
                .containsExactly(OldMaidEventType.PAIR, OldMaidEventType.FINISH, OldMaidEventType.GAME_END);
        OldMaidEvent end = game.latestEvents().get(game.latestEvents().size() - 1);
        assertThat(end.actor()).isEqualTo(B);
        assertThat(end.count()).isEqualTo(2);
        assertThat(end.reason()).isEqualTo(OldMaidEndReason.NORMAL);
        assertError(() -> game.draw(B, new SlotIndex(0)), ErrorCode.GAME_ALREADY_OVER);
        assertError(() -> game.discard(B, choice(JOKER, h(Rank.FIVE))), ErrorCode.GAME_ALREADY_OVER);
    }

    @Test
    void R16_상대가_비어_뽑은_사람만_카드를_쥐면_그_짝은_서버가_바로_버리고_뽑은_사람이_도둑이다() {
        OldMaidGame game = game(A, hands(List.of(s(Rank.FIVE), JOKER), List.of(h(Rank.FIVE))));

        game.draw(A, new SlotIndex(0));

        assertThat(game.isFinished()).isTrue();
        assertThat(game.handOf(A)).containsExactly(JOKER);
        assertThat(game.result().orElseThrow().thief()).contains(A);
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type)
                .containsExactly(OldMaidEventType.DRAW, OldMaidEventType.FINISH, OldMaidEventType.PAIR,
                        OldMaidEventType.GAME_END);
    }

    @Test
    void 차례가_아니면_NOT_YOUR_TURN이고_상태와_기록이_그대로다() {
        OldMaidGame game = threePlayers();
        List<OldMaidEvent> before = game.latestEvents();

        assertError(() -> game.draw(B, new SlotIndex(0)), ErrorCode.NOT_YOUR_TURN);

        assertThat(game.latestEvents()).isEqualTo(before);
        assertThat(game.cardCount(B)).isEqualTo(2);
    }

    @Test
    void R12_범위_밖_자리는_OLD_MAID_INVALID_SLOT이고_참가자가_아니면_NOT_A_PLAYER() {
        OldMaidGame game = threePlayers();

        assertError(() -> game.draw(A, new SlotIndex(2)), ErrorCode.OLD_MAID_INVALID_SLOT);
        assertError(() -> game.draw(new PlayerId(99L), new SlotIndex(0)), ErrorCode.NOT_A_PLAYER);
        assertThat(game.cardCount(B)).isEqualTo(2);
        assertThat(game.rankOf(A)).isEmpty();
    }
}
