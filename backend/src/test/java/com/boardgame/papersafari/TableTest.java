package com.boardgame.papersafari;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class TableTest {

    private Table tableOf(Card... cards) {
        return Table.setUp(StackedShuffler.of(List.of(cards)));
    }

    @Test
    void 셔플된_순서의_맨_앞부터_뽑는다() {
        Table table = tableOf(Card.number(1), Card.number(2), Card.number(3));

        assertThat(table.drawFromDeck()).isEqualTo(Card.number(1));
        assertThat(table.deckSize()).isEqualTo(2);
    }

    @Test
    void 패는_6장씩_나눠준다() {
        Table table = tableOf(Card.number(1), Card.number(2), Card.number(3),
                Card.number(4), Card.number(5), Card.number(6), Card.number(7));

        assertThat(table.dealHand()).containsExactly(Card.number(1), Card.number(2), Card.number(3),
                Card.number(4), Card.number(5), Card.number(6));
        assertThat(table.deckSize()).isEqualTo(1);
    }

    @Test
    void 버린_더미를_열면_덱_맨_위_카드가_공개된다() {
        Table table = tableOf(Card.number(1), Card.number(2));

        table.openDiscard();

        assertThat(table.discardTop()).contains(Card.number(1));
        assertThat(table.deckSize()).isEqualTo(1);
    }

    @Test
    void 버린_더미에서_가져오면_맨_위가_빠지고_비면_가져올_수_없다() {
        Table table = tableOf(Card.number(1));
        table.openDiscard();

        assertThat(table.drawFromDiscard()).isEqualTo(Card.number(1));
        assertThat(table.discardTop()).isEmpty();
        assertError(table::drawFromDiscard, ErrorCode.EMPTY_DISCARD_PILE);
    }

    @Test
    void 덱이_비면_버린_더미의_맨_위만_남기고_섞어서_다시_쓴다() {
        Table table = tableOf(Card.number(1), Card.number(2));
        table.openDiscard();
        table.discard(Card.number(3));
        table.discard(Card.number(4));
        assertThat(table.drawFromDeck()).isEqualTo(Card.number(2));

        Card recycled = table.drawFromDeck();

        assertThat(recycled).isEqualTo(Card.number(3));
        assertThat(table.discardTop()).contains(Card.number(4));
        assertThat(table.deckSize()).isEqualTo(1);
    }

    @Test
    void 덱이_비고_버린_더미에_한_장뿐이면_더_뽑을_수_없다() {
        Table table = tableOf(Card.number(1));
        table.openDiscard();

        assertError(table::drawFromDeck, ErrorCode.DECK_EXHAUSTED);
    }

    @Test
    void 무작위_셔플은_같은_카드_구성을_유지하고_원본을_바꾸지_않는다() {
        List<Card> original = StandardDeck.cards();
        List<Card> snapshot = new ArrayList<>(original);

        List<Card> shuffled = new RandomCardShuffler().shuffle(original);

        assertThat(shuffled).containsExactlyInAnyOrderElementsOf(snapshot);
        assertThat(original).containsExactlyElementsOf(snapshot);
    }
}
