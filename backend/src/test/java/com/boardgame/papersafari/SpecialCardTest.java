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
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;

class SpecialCardTest {

    private static final List<PlayerId> TWO = List.of(ALICE, BOB);
    private static final List<PlayerId> THREE = List.of(ALICE, BOB, CAROL);

    private PaperSafariRound started(List<PlayerId> players, Card discardTop, List<Card> deck) {
        List<List<Card>> hands = new ArrayList<>();
        hands.add(WINNER_HAND);
        hands.addAll(Collections.nCopies(players.size() - 1, LOSER_HAND));
        PaperSafariRound round = round(players, stack(hands, discardTop, deck));
        flipFirst(round, players);
        return round;
    }

    private List<Card> zerosThen(int count, Card last) {
        List<Card> deck = new ArrayList<>(zeros(count));
        deck.add(last);
        return deck;
    }

    @Test
    void 덱에서_뽑은_코끼리로_교체하면_뒷면_카드_한_장을_엿본다() {
        PaperSafariRound round = started(TWO, Card.number(7), List.of(Card.elephant()));

        round.drawFromDeck(ALICE);
        round.swapAt(ALICE, new Position(1, 0));

        assertThat(round.phase()).isEqualTo(TurnPhase.PEEK);
        assertThat(round.currentPlayer()).isEqualTo(ALICE);

        round.peekAt(ALICE, new Position(2, 0));

        assertThat(round.knows(ALICE, new Position(2, 0))).isTrue();
        assertThat(round.currentPlayer()).isEqualTo(BOB);
        assertThat(round.phase()).isEqualTo(TurnPhase.DRAW);
    }

    @Test
    void 엿보기는_뒷면_카드만_가능하다() {
        PaperSafariRound round = started(TWO, Card.number(7), List.of(Card.elephant()));
        round.drawFromDeck(ALICE);
        round.swapAt(ALICE, new Position(1, 0));

        assertError(() -> round.peekAt(ALICE, FIRST), ErrorCode.NOT_FACE_DOWN);
        assertError(() -> round.peekAt(ALICE, new Position(1, 0)), ErrorCode.NOT_FACE_DOWN);
        assertThat(round.phase()).isEqualTo(TurnPhase.PEEK);
    }

    @Test
    void 엿보기_단계에서는_다른_행동을_할_수_없다() {
        PaperSafariRound round = started(TWO, Card.number(7), List.of(Card.elephant()));
        round.drawFromDeck(ALICE);
        round.swapAt(ALICE, new Position(1, 0));

        assertError(() -> round.drawFromDeck(ALICE), ErrorCode.INVALID_PHASE);
        assertError(() -> round.peekAt(BOB, new Position(1, 0)), ErrorCode.NOT_YOUR_TURN);
    }

    @Test
    void 버린_더미에서_가져온_코끼리는_효과가_없다() {
        PaperSafariRound round = started(TWO, Card.elephant(), zeros(1));

        round.drawFromDiscard(ALICE);
        round.swapAt(ALICE, new Position(1, 0));

        assertThat(round.phase()).isEqualTo(TurnPhase.DRAW);
        assertThat(round.currentPlayer()).isEqualTo(BOB);
    }

    @Test
    void 코끼리를_버리면_효과가_없다() {
        PaperSafariRound round = started(TWO, Card.number(7), List.of(Card.elephant()));

        round.drawFromDeck(ALICE);
        round.discardDrawn(ALICE);

        assertThat(round.phase()).isEqualTo(TurnPhase.DRAW);
        assertThat(round.currentPlayer()).isEqualTo(BOB);
    }

    @Test
    void 코끼리로_마지막_뒷면_칸을_채우면_엿보기_없이_라운드가_끝난다() {
        PaperSafariRound round = started(TWO, Card.number(7), zerosThen(8, Card.elephant()));
        for (int index = 0; index < 4; index++) {
            round.drawFromDeck(ALICE);
            round.swapAt(ALICE, REST.get(index));
            round.drawFromDeck(BOB);
            round.discardDrawn(BOB);
        }

        round.drawFromDeck(ALICE);
        round.swapAt(ALICE, REST.get(4));

        assertThat(round.isOver()).isTrue();
    }

    @Test
    void 덱에서_뽑은_타잔은_빠진_카드를_왼쪽_사람의_같은_칸으로_보낸다() {
        PaperSafariRound round = started(THREE, Card.number(7), List.of(Card.tarzan()));
        Position position = new Position(1, 1);

        round.drawFromDeck(ALICE);
        round.swapAt(ALICE, position);

        assertThat(round.boardOf(ALICE).cardAt(position)).isEqualTo(Card.tarzan());
        assertThat(round.boardOf(BOB).cardAt(position)).isEqualTo(Card.number(5));
        assertThat(round.boardOf(BOB).isFaceDown(position)).isFalse();
        assertThat(round.discardTop()).contains(Card.number(8));
        assertThat(round.boardOf(CAROL).isFaceDown(position)).isTrue();
        assertThat(round.currentPlayer()).isEqualTo(BOB);
    }

    @Test
    void 덱에서_뽑은_타잔은_버릴_수_없다() {
        PaperSafariRound round = started(TWO, Card.number(7), List.of(Card.tarzan()));
        round.drawFromDeck(ALICE);

        assertError(() -> round.discardDrawn(ALICE), ErrorCode.MUST_SWAP_TARZAN);
    }

    @Test
    void 버린_더미에서_가져온_타잔은_일반_카드처럼_교체된다() {
        PaperSafariRound round = started(TWO, Card.tarzan(), zeros(1));
        Position position = new Position(0, 1);

        round.drawFromDiscard(ALICE);
        round.swapAt(ALICE, position);

        assertThat(round.boardOf(ALICE).cardAt(position)).isEqualTo(Card.tarzan());
        assertThat(round.boardOf(BOB).isFaceDown(position)).isTrue();
        assertThat(round.discardTop()).contains(Card.number(4));
    }

    @Test
    void 마지막_좌석의_왼쪽은_첫_좌석이다() {
        PaperSafariRound round = started(TWO, Card.number(7), List.of(Card.number(0), Card.tarzan()));
        Position position = new Position(2, 0);
        round.drawFromDeck(ALICE);
        round.discardDrawn(ALICE);

        round.drawFromDeck(BOB);
        round.swapAt(BOB, position);

        assertThat(round.boardOf(ALICE).cardAt(position)).isEqualTo(Card.number(9));
        assertThat(round.discardTop()).contains(Card.number(3));
    }

    @Test
    void 타잔으로_왼쪽_사람의_카드가_모두_공개되면_즉시_라운드가_끝난다() {
        PaperSafariRound round = started(TWO, Card.number(7), zerosThen(8, Card.tarzan()));
        for (int index = 0; index < 4; index++) {
            round.drawFromDeck(ALICE);
            round.discardDrawn(ALICE);
            round.drawFromDeck(BOB);
            round.swapAt(BOB, REST.get(index));
        }

        round.drawFromDeck(ALICE);
        round.swapAt(ALICE, new Position(2, 1));

        assertThat(round.isOver()).isTrue();
        assertThat(round.boardOf(BOB).cardAt(new Position(2, 1))).isEqualTo(Card.number(6));
    }

    @Test
    void 타잔으로_밀려난_카드에_대한_엿보기_정보는_사라진다() {
        PaperSafariRound round = started(TWO, Card.number(7),
                List.of(Card.number(0), Card.elephant(), Card.tarzan()));
        Position peeked = new Position(2, 0);
        round.drawFromDeck(ALICE);
        round.discardDrawn(ALICE);
        round.drawFromDeck(BOB);
        round.swapAt(BOB, new Position(1, 0));
        round.peekAt(BOB, peeked);
        assertThat(round.knows(BOB, peeked)).isTrue();

        round.drawFromDeck(ALICE);
        round.swapAt(ALICE, peeked);

        assertThat(round.knows(BOB, peeked)).isFalse();
        assertThat(round.boardOf(BOB).cardAt(peeked)).isEqualTo(Card.number(3));
    }
}
