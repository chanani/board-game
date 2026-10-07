package com.boardgame.oldmaid;

import static com.boardgame.oldmaid.OldMaidFixtures.JOKER;
import static com.boardgame.oldmaid.OldMaidFixtures.KEEP_ORDER;
import static com.boardgame.oldmaid.OldMaidFixtures.c;
import static com.boardgame.oldmaid.OldMaidFixtures.d;
import static com.boardgame.oldmaid.OldMaidFixtures.h;
import static com.boardgame.oldmaid.OldMaidFixtures.s;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class HandTest {

    @Test
    void R6_같은_랭크_두_장은_짝으로_버리고_세_장이면_앞의_두_장을_버린다() {
        Hand hand = new Hand(List.of(s(Rank.FIVE), h(Rank.TWO), d(Rank.FIVE), JOKER, c(Rank.FIVE)));

        List<CardPair> pairs = hand.discardPairs();

        assertThat(pairs).containsExactly(new CardPair(s(Rank.FIVE), d(Rank.FIVE)));
        assertThat(hand.cards()).containsExactly(h(Rank.TWO), JOKER, c(Rank.FIVE));
    }

    @Test
    void R6_네_장이면_두_짝을_모두_버린다() {
        Hand hand = new Hand(List.of(s(Rank.NINE), h(Rank.NINE), d(Rank.NINE), c(Rank.NINE), JOKER));

        List<CardPair> pairs = hand.discardPairs();

        assertThat(pairs).containsExactly(new CardPair(s(Rank.NINE), h(Rank.NINE)), new CardPair(d(Rank.NINE), c(Rank.NINE)));
        assertThat(hand.cards()).containsExactly(JOKER);
    }

    @Test
    void R13_받은_카드가_짝이면_두_장을_내보내고_아니면_고른_자리에_끼운다() {
        Hand hand = new Hand(List.of(s(Rank.ACE), h(Rank.KING), d(Rank.TWO)));

        Optional<CardPair> pair = hand.receive(c(Rank.KING), bound -> 0);
        Optional<CardPair> none = hand.receive(JOKER, bound -> bound - 1);

        assertThat(pair).contains(new CardPair(h(Rank.KING), c(Rank.KING)));
        assertThat(none).isEmpty();
        assertThat(hand.cards()).containsExactly(s(Rank.ACE), d(Rank.TWO), JOKER);
    }

    @Test
    void R13_끼울_자리는_0부터_장수까지에서_고른다() {
        Hand hand = new Hand(List.of(s(Rank.ACE), h(Rank.KING)));
        int[] seen = new int[1];

        hand.receive(JOKER, bound -> {
            seen[0] = bound;
            return 1;
        });

        assertThat(seen[0]).isEqualTo(3);
        assertThat(hand.cards()).containsExactly(s(Rank.ACE), JOKER, h(Rank.KING));
    }

    @Test
    void R12_자리로_꺼내고_범위_밖이거나_음수면_OLD_MAID_INVALID_SLOT() {
        Hand hand = new Hand(List.of(s(Rank.ACE), JOKER));

        assertThat(hand.takeAt(new SlotIndex(1))).isEqualTo(JOKER);
        assertThatThrownBy(() -> hand.takeAt(new SlotIndex(1)))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.errorCode()).isEqualTo(ErrorCode.OLD_MAID_INVALID_SLOT));
        assertThatThrownBy(() -> new SlotIndex(-1))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.errorCode()).isEqualTo(ErrorCode.OLD_MAID_INVALID_SLOT));
    }

    @Test
    void 섞기와_모두_꺼내기와_더하기() {
        Hand hand = new Hand(List.of(s(Rank.ACE), JOKER, h(Rank.TWO)));

        hand.shuffle(cards -> List.of(cards.get(2), cards.get(0), cards.get(1)));
        assertThat(hand.cards()).containsExactly(h(Rank.TWO), s(Rank.ACE), JOKER);

        List<PlayingCard> taken = hand.takeAll();
        assertThat(taken).hasSize(3);
        assertThat(hand.isEmpty()).isTrue();

        hand.addAll(taken);
        hand.shuffle(KEEP_ORDER);
        assertThat(hand.size()).isEqualTo(3);
    }
}
