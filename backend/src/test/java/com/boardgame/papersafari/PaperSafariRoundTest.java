package com.boardgame.papersafari;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static com.boardgame.papersafari.Fixtures.ALICE;
import static com.boardgame.papersafari.Fixtures.BOB;
import static com.boardgame.papersafari.Fixtures.CAROL;
import static com.boardgame.papersafari.Fixtures.FIRST;
import static com.boardgame.papersafari.Fixtures.LOSER_HAND;
import static com.boardgame.papersafari.Fixtures.REST;
import static com.boardgame.papersafari.Fixtures.WINNER_HAND;
import static com.boardgame.papersafari.Fixtures.flipFirst;
import static com.boardgame.papersafari.Fixtures.round;
import static com.boardgame.papersafari.Fixtures.stack;
import static com.boardgame.papersafari.Fixtures.zeros;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import java.util.List;
import org.junit.jupiter.api.Test;

class PaperSafariRoundTest {

    private static final List<PlayerId> TWO = List.of(ALICE, BOB);
    private static final List<PlayerId> THREE = List.of(ALICE, BOB, CAROL);

    private PaperSafariRound newRound(List<Card> deck) {
        return round(TWO, stack(List.of(WINNER_HAND, LOSER_HAND), Card.number(7), deck));
    }

    private PaperSafariRound startedRound(List<Card> deck) {
        PaperSafariRound round = newRound(deck);
        flipFirst(round, TWO);
        return round;
    }

    private void aliceRevealsAll(PaperSafariRound round) {
        for (Position position : REST) {
            round.drawFromDeck(ALICE);
            round.swapAt(ALICE, position);
            if (round.isOver()) {
                return;
            }
            round.drawFromDeck(BOB);
            round.discardDrawn(BOB);
        }
    }

    @Test
    void 시작하면_각자_6장을_뒷면으로_받고_버린_더미_한_장을_공개한다() {
        PaperSafariRound round = newRound(zeros(3));

        Board alice = round.boardOf(ALICE);
        assertThat(alice.cardAt(new Position(0, 0))).isEqualTo(Card.number(1));
        assertThat(alice.cardAt(new Position(0, 1))).isEqualTo(Card.number(4));
        assertThat(alice.hasFaceUp()).isFalse();
        assertThat(round.boardOf(BOB).cardAt(new Position(0, 0))).isEqualTo(Card.number(9));
        assertThat(round.discardTop()).contains(Card.number(7));
        assertThat(round.deckSize()).isEqualTo(3);
        assertThat(round.phase()).isEqualTo(TurnPhase.SETUP_FLIP);
    }

    @Test
    void 모두_한_장씩_뒤집으면_시작_플레이어부터_진행한다() {
        PaperSafariRound round = newRound(zeros(3));

        round.flipInitial(ALICE, FIRST);
        assertThat(round.phase()).isEqualTo(TurnPhase.SETUP_FLIP);
        round.flipInitial(BOB, new Position(2, 1));

        assertThat(round.phase()).isEqualTo(TurnPhase.DRAW);
        assertThat(round.currentPlayer()).isEqualTo(ALICE);
        assertThat(round.boardOf(BOB).isFaceDown(new Position(2, 1))).isFalse();
    }

    @Test
    void 준비_단계에서_두_장을_뒤집을_수_없다() {
        PaperSafariRound round = newRound(zeros(3));
        round.flipInitial(ALICE, FIRST);

        assertError(() -> round.flipInitial(ALICE, new Position(1, 0)), ErrorCode.ALREADY_FLIPPED);
    }

    @Test
    void 준비_단계에서는_카드를_뽑을_수_없다() {
        PaperSafariRound round = newRound(zeros(3));

        assertError(() -> round.drawFromDeck(ALICE), ErrorCode.INVALID_PHASE);
    }

    @Test
    void 참가자가_아니면_뒤집을_수_없다() {
        PaperSafariRound round = newRound(zeros(3));

        assertError(() -> round.flipInitial(CAROL, FIRST), ErrorCode.NOT_A_PLAYER);
    }

    @Test
    void 자기_차례가_아니면_뽑을_수_없다() {
        PaperSafariRound round = startedRound(zeros(1));

        assertError(() -> round.drawFromDeck(BOB), ErrorCode.NOT_YOUR_TURN);
        assertError(() -> round.drawFromDeck(CAROL), ErrorCode.NOT_YOUR_TURN);
    }

    @Test
    void 뽑기_전에는_교체할_수_없다() {
        PaperSafariRound round = startedRound(zeros(1));

        assertError(() -> round.swapAt(ALICE, FIRST), ErrorCode.INVALID_PHASE);
    }

    @Test
    void 덱에서_뽑아_교체하면_새_카드는_앞면이_되고_원래_카드는_버린_더미로_간다() {
        PaperSafariRound round = startedRound(zeros(1));

        round.drawFromDeck(ALICE);
        round.swapAt(ALICE, new Position(1, 1));

        Board alice = round.boardOf(ALICE);
        assertThat(alice.cardAt(new Position(1, 1))).isEqualTo(Card.number(0));
        assertThat(alice.isFaceDown(new Position(1, 1))).isFalse();
        assertThat(round.discardTop()).contains(Card.number(5));
        assertThat(round.currentPlayer()).isEqualTo(BOB);
        assertThat(round.phase()).isEqualTo(TurnPhase.DRAW);
    }

    @Test
    void 덱에서_뽑은_카드는_그대로_버릴_수_있다() {
        PaperSafariRound round = startedRound(zeros(1));

        round.drawFromDeck(ALICE);
        round.discardDrawn(ALICE);

        assertThat(round.discardTop()).contains(Card.number(0));
        assertThat(round.boardOf(ALICE).isFaceDown(new Position(1, 1))).isTrue();
        assertThat(round.currentPlayer()).isEqualTo(BOB);
    }

    @Test
    void 버린_더미에서_가져온_카드는_버릴_수_없고_상태도_그대로다() {
        PaperSafariRound round = startedRound(zeros(1));

        round.drawFromDiscard(ALICE);

        assertError(() -> round.discardDrawn(ALICE), ErrorCode.MUST_SWAP_DISCARD_CARD);
        assertThat(round.phase()).isEqualTo(TurnPhase.PLACE);
        assertThat(round.currentPlayer()).isEqualTo(ALICE);
    }

    @Test
    void 버린_더미에서_가져와_교체할_수_있다() {
        PaperSafariRound round = startedRound(zeros(1));

        round.drawFromDiscard(ALICE);
        round.swapAt(ALICE, new Position(2, 0));

        assertThat(round.boardOf(ALICE).cardAt(new Position(2, 0))).isEqualTo(Card.number(7));
        assertThat(round.discardTop()).contains(Card.number(3));
    }

    @Test
    void 누군가_6장을_모두_공개하면_즉시_라운드가_끝나고_모든_카드가_공개된다() {
        PaperSafariRound round = startedRound(zeros(9));

        aliceRevealsAll(round);

        assertThat(round.isOver()).isTrue();
        assertThat(round.phase()).isEqualTo(TurnPhase.ROUND_OVER);
        assertThat(round.boardOf(BOB).allFaceUp()).isTrue();
        RoundResult result = round.result();
        assertThat(result.scoreOf(ALICE)).isEqualTo(new Score(1));
        assertThat(result.scoreOf(BOB)).isEqualTo(new Score(51));
        assertThat(result.winner()).contains(ALICE);
    }

    @Test
    void 라운드가_끝나면_어떤_행동도_할_수_없다() {
        PaperSafariRound round = startedRound(zeros(9));
        aliceRevealsAll(round);

        assertError(() -> round.drawFromDeck(BOB), ErrorCode.INVALID_PHASE);
        assertError(() -> round.flipInitial(BOB, FIRST), ErrorCode.INVALID_PHASE);
    }

    @Test
    void 라운드가_끝나기_전에는_결과를_볼_수_없다() {
        PaperSafariRound round = startedRound(zeros(1));

        assertError(round::result, ErrorCode.ROUND_NOT_OVER);
    }

    @Test
    void 차례인_플레이어가_나가면_들고_있던_카드는_버려지고_다음_사람_차례가_된다() {
        PaperSafariRound round = round(THREE,
                stack(List.of(WINNER_HAND, LOSER_HAND, LOSER_HAND), Card.number(7), zeros(1)));
        flipFirst(round, THREE);
        round.drawFromDeck(ALICE);

        round.leave(ALICE);

        assertThat(round.discardTop()).contains(Card.number(0));
        assertThat(round.currentPlayer()).isEqualTo(BOB);
        assertThat(round.phase()).isEqualTo(TurnPhase.DRAW);
        assertError(() -> round.boardOf(ALICE), ErrorCode.NOT_A_PLAYER);
    }

    @Test
    void 준비_단계에서_안_뒤집은_사람이_나가면_나머지로_진행을_시작한다() {
        PaperSafariRound round = round(THREE,
                stack(List.of(WINNER_HAND, LOSER_HAND, LOSER_HAND), Card.number(7), zeros(1)));
        round.flipInitial(ALICE, FIRST);
        round.flipInitial(BOB, FIRST);

        round.leave(CAROL);

        assertThat(round.phase()).isEqualTo(TurnPhase.DRAW);
        assertThat(round.currentPlayer()).isEqualTo(ALICE);
    }
}
