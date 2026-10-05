package com.boardgame.papersafari;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class CardTest {

    @Test
    void 표준_덱은_54장이다() {
        List<Card> cards = StandardDeck.cards();

        assertThat(cards).hasSize(54);
        assertThat(countOf(cards, CardKind.NUMBER)).isEqualTo(40);
        assertThat(countOf(cards, CardKind.ELEPHANT)).isEqualTo(4);
        assertThat(countOf(cards, CardKind.TARZAN)).isEqualTo(4);
        assertThat(countOf(cards, CardKind.FOX)).isEqualTo(4);
        assertThat(countOf(cards, CardKind.WILD)).isEqualTo(2);
    }

    @Test
    void 숫자_카드는_0부터_9까지_각_4장이다() {
        List<Card> cards = StandardDeck.cards();

        IntStream.rangeClosed(0, 9).forEach(value ->
                assertThat(cards.stream().filter(card -> card.equals(Card.number(value))).count()).isEqualTo(4));
    }

    @Test
    void 특수_카드의_값() {
        assertThat(Card.elephant().faceValue()).isEqualTo(10);
        assertThat(Card.tarzan().faceValue()).isEqualTo(10);
        assertThat(Card.fox().faceValue()).isEqualTo(-2);
        assertThat(Card.fox().score()).isEqualTo(new Score(-2));
    }

    @Test
    void 코끼리와_타잔은_같은_숫자로_본다() {
        assertThat(Card.elephant().matches(Card.tarzan())).isTrue();
        assertThat(Card.number(7).matches(Card.number(7))).isTrue();
        assertThat(Card.number(7).matches(Card.number(8))).isFalse();
    }

    @Test
    void 숫자_카드는_0에서_9_사이만_만들_수_있다() {
        assertThatThrownBy(() -> Card.number(10)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Card.number(-1)).isInstanceOf(IllegalArgumentException.class);
    }

    private long countOf(List<Card> cards, CardKind kind) {
        return cards.stream().filter(card -> card.is(kind)).count();
    }
}
