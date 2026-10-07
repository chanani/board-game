package com.boardgame.oldmaid;

import static com.boardgame.oldmaid.OldMaidFixtures.JOKER;
import static com.boardgame.oldmaid.OldMaidFixtures.c;
import static com.boardgame.oldmaid.OldMaidFixtures.d;
import static com.boardgame.oldmaid.OldMaidFixtures.h;
import static com.boardgame.oldmaid.OldMaidFixtures.s;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class StandardOldMaidDeckTest {

    private final List<PlayingCard> deck = StandardOldMaidDeck.cards();

    @Test
    void R1_덱은_53장이고_무늬마다_13장과_조커_1장이다() {
        assertThat(deck).hasSize(53);
        for (Suit suit : Suit.values()) {
            assertThat(deck.stream().filter(card -> card.suit() == suit).count()).isEqualTo(13);
        }
        assertThat(deck.stream().filter(PlayingCard::isJoker).count()).isEqualTo(1);
    }

    @Test
    void R2_카드_번호는_무늬_순서_곱하기_13_더하기_랭크_순서이고_조커는_52다() {
        assertThat(deck).extracting(card -> card.id().value()).containsExactlyElementsOf(IntStream.range(0, 53).boxed().toList());
        assertThat(deck.get(0)).isEqualTo(s(Rank.ACE));
        assertThat(deck.get(22)).isEqualTo(h(Rank.TEN));
        assertThat(deck.get(38)).isEqualTo(d(Rank.KING));
        assertThat(deck.get(51)).isEqualTo(c(Rank.KING));
        assertThat(deck.get(52)).isEqualTo(JOKER);
        assertThat(JOKER.suit()).isNull();
    }

    @Test
    void R3_랭크가_같으면_무늬와_색에_상관없이_짝이고_조커는_짝이_없다() {
        assertThat(s(Rank.SEVEN).pairsWith(h(Rank.SEVEN))).isTrue();
        assertThat(d(Rank.QUEEN).pairsWith(c(Rank.QUEEN))).isTrue();
        assertThat(s(Rank.SEVEN).pairsWith(s(Rank.EIGHT))).isFalse();
        assertThat(s(Rank.SEVEN).pairsWith(s(Rank.SEVEN))).isFalse();
        assertThat(JOKER.pairsWith(s(Rank.SEVEN))).isFalse();
        assertThat(s(Rank.SEVEN).pairsWith(JOKER)).isFalse();
    }
}
