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
    void R12_R13_뽑은_카드가_짝이면_곧바로_버리고_공개한다() {
        OldMaidGame game = threePlayers();

        game.draw(A, new SlotIndex(0));

        assertThat(game.handOf(A)).containsExactly(s(Rank.FOUR));
        assertThat(game.handOf(B)).containsExactly(JOKER);
        assertThat(game.recentPairs(6)).containsExactly(new CardPair(s(Rank.THREE), h(Rank.THREE)));
        assertThat(game.discards()).containsExactly(new DiscardedPair(A, new CardPair(s(Rank.THREE), h(Rank.THREE))));
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type)
                .containsExactly(OldMaidEventType.DRAW, OldMaidEventType.PAIR);
        OldMaidEvent draw = game.latestEvents().get(0);
        assertThat(draw.actor()).isEqualTo(A);
        assertThat(draw.target()).isEqualTo(B);
        assertThat(draw.cards()).isEmpty();
        assertThat(game.latestEvents().get(1).cards()).containsExactly(s(Rank.THREE), h(Rank.THREE));
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
    void R14_함께_비면_뺏긴_상대가_먼저_등수를_받는다() {
        OldMaidGame game = game(A, hands(
                List.of(s(Rank.FIVE)),
                List.of(h(Rank.FIVE)),
                List.of(JOKER, d(Rank.SEVEN)),
                List.of(c(Rank.SEVEN), s(Rank.EIGHT))));

        game.draw(A, new SlotIndex(0));

        assertThat(game.finishRankOf(B)).contains(new FinishRank(1));
        assertThat(game.finishRankOf(A)).contains(new FinishRank(2));
        assertThat(game.latestEvents()).extracting(OldMaidEvent::type)
                .containsExactly(OldMaidEventType.DRAW, OldMaidEventType.PAIR, OldMaidEventType.FINISH,
                        OldMaidEventType.FINISH);
        assertThat(game.latestEvents()).filteredOn(event -> event.type() == OldMaidEventType.FINISH)
                .extracting(OldMaidEvent::actor).containsExactly(B, A);
        assertThat(game.drawer()).isEqualTo(C);
        assertThat(game.target()).isEqualTo(D);
    }

    @Test
    void R16_카드_가진_사람이_1명이면_끝나고_그_사람이_도둑이다() {
        OldMaidGame game = game(A, hands(List.of(s(Rank.FIVE)), List.of(h(Rank.FIVE), JOKER)));

        game.draw(A, new SlotIndex(0));

        assertThat(game.isFinished()).isTrue();
        OldMaidResult result = game.result().orElseThrow();
        assertThat(result.reason()).isEqualTo(OldMaidEndReason.NORMAL);
        assertThat(result.winner()).isEqualTo(A);
        assertThat(result.thief()).contains(B);
        assertThat(game.rankOf(B)).contains(new FinishRank(2));
        OldMaidEvent end = game.latestEvents().get(game.latestEvents().size() - 1);
        assertThat(end.type()).isEqualTo(OldMaidEventType.GAME_END);
        assertThat(end.actor()).isEqualTo(B);
        assertThat(end.count()).isEqualTo(2);
        assertThat(end.reason()).isEqualTo(OldMaidEndReason.NORMAL);
        assertError(() -> game.draw(B, new SlotIndex(0)), ErrorCode.GAME_ALREADY_OVER);
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
