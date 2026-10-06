package com.boardgame.uno;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class StandardUnoDeckTest {

    private final List<UnoCard> deck = StandardUnoDeck.cards();

    private long count(CardFace face) {
        return deck.stream().filter(card -> card.face().equals(face)).count();
    }

    @Test
    void R1_덱은_108장이고_색마다_25장_와일드_8장이다() {
        assertThat(deck).hasSize(108);
        for (UnoColor color : UnoColor.values()) {
            assertThat(deck.stream().filter(card -> card.isColor(color)).count()).isEqualTo(25);
            assertThat(count(CardFace.number(color, 0))).isEqualTo(1);
            IntStream.rangeClosed(1, 9).forEach(n -> assertThat(count(CardFace.number(color, n))).isEqualTo(2));
            assertThat(count(CardFace.action(CardKind.SKIP, color))).isEqualTo(2);
            assertThat(count(CardFace.action(CardKind.REVERSE, color))).isEqualTo(2);
            assertThat(count(CardFace.action(CardKind.DRAW_TWO, color))).isEqualTo(2);
        }
        assertThat(count(CardFace.wild(CardKind.WILD))).isEqualTo(4);
        assertThat(count(CardFace.wild(CardKind.WILD_DRAW_FOUR))).isEqualTo(4);
    }

    @Test
    void R2_카드_번호는_0부터_107까지_정해진_순서다() {
        assertThat(deck).extracting(card -> card.id().value()).containsExactlyElementsOf(IntStream.range(0, 108).boxed().toList());
        assertThat(deck.get(0).face()).isEqualTo(CardFace.number(UnoColor.RED, 0));
        assertThat(deck.get(1).face()).isEqualTo(CardFace.number(UnoColor.RED, 1));
        assertThat(deck.get(2).face()).isEqualTo(CardFace.number(UnoColor.RED, 1));
        assertThat(deck.get(14).face()).isEqualTo(CardFace.number(UnoColor.RED, 7));
        assertThat(deck.get(19).face()).isEqualTo(CardFace.action(CardKind.SKIP, UnoColor.RED));
        assertThat(deck.get(24).face()).isEqualTo(CardFace.action(CardKind.DRAW_TWO, UnoColor.RED));
        assertThat(deck.get(25).face()).isEqualTo(CardFace.number(UnoColor.YELLOW, 0));
        assertThat(deck.get(93).face()).isEqualTo(CardFace.number(UnoColor.BLUE, 9));
        assertThat(deck.get(99).face()).isEqualTo(CardFace.action(CardKind.DRAW_TWO, UnoColor.BLUE));
        assertThat(deck.subList(100, 104)).allMatch(card -> card.kind() == CardKind.WILD);
        assertThat(deck.subList(104, 108)).allMatch(card -> card.kind() == CardKind.WILD_DRAW_FOUR);
    }
}
