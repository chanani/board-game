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
    void R13_뽑은_카드는_짝이_되어도_고른_자리에_끼우고_짝이_생겼는지_알려준다() {
        Hand hand = new Hand(List.of(s(Rank.ACE), h(Rank.KING), d(Rank.TWO)));
        assertThat(hand.hasPair()).isFalse();

        hand.insert(JOKER, bound -> bound - 1);
        assertThat(hand.hasPair()).isFalse();
        hand.insert(c(Rank.KING), bound -> 0);

        assertThat(hand.cards()).containsExactly(c(Rank.KING), s(Rank.ACE), h(Rank.KING), d(Rank.TWO), JOKER);
        assertThat(hand.hasPair()).isTrue();
    }

    @Test
    void R13_끼울_자리는_0부터_장수까지에서_고른다() {
        Hand hand = new Hand(List.of(s(Rank.ACE), h(Rank.KING)));
        int[] seen = new int[1];

        hand.insert(JOKER, bound -> {
            seen[0] = bound;
            return 1;
        });

        assertThat(seen[0]).isEqualTo(3);
        assertThat(hand.cards()).containsExactly(s(Rank.ACE), JOKER, h(Rank.KING));
    }

    @Test
    void R36_고른_두_장이_같은_숫자면_짝으로_꺼낸다() {
        Hand hand = new Hand(List.of(s(Rank.FIVE), h(Rank.TWO), d(Rank.FIVE), c(Rank.FIVE)));

        CardPair pair = hand.takePair(new PairChoice(c(Rank.FIVE).id(), s(Rank.FIVE).id()));

        assertThat(pair).isEqualTo(new CardPair(c(Rank.FIVE), s(Rank.FIVE)));
        assertThat(hand.cards()).containsExactly(h(Rank.TWO), d(Rank.FIVE));
    }

    @Test
    void R36_같은_숫자가_아니거나_조커면_OLD_MAID_NOT_A_PAIR이고_내_손에_없으면_OLD_MAID_CARD_NOT_IN_HAND() {
        Hand hand = new Hand(List.of(s(Rank.FIVE), h(Rank.TWO), JOKER));

        assertThatThrownBy(() -> hand.takePair(new PairChoice(s(Rank.FIVE).id(), h(Rank.TWO).id())))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.errorCode()).isEqualTo(ErrorCode.OLD_MAID_NOT_A_PAIR));
        assertThatThrownBy(() -> hand.takePair(new PairChoice(JOKER.id(), h(Rank.TWO).id())))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.errorCode()).isEqualTo(ErrorCode.OLD_MAID_NOT_A_PAIR));
        assertThatThrownBy(() -> hand.takePair(new PairChoice(s(Rank.FIVE).id(), d(Rank.FIVE).id())))
                .isInstanceOfSatisfying(BusinessException.class,
                        error -> assertThat(error.errorCode()).isEqualTo(ErrorCode.OLD_MAID_CARD_NOT_IN_HAND));
        assertThat(hand.cards()).containsExactly(s(Rank.FIVE), h(Rank.TWO), JOKER);
    }

    @Test
    void R7_짝을_다_버렸다면_카드가_남는지_손패를_바꾸지_않고_셈한다() {
        Hand empties = new Hand(List.of(s(Rank.FIVE), h(Rank.FIVE), d(Rank.NINE), c(Rank.NINE)));
        Hand keeps = new Hand(List.of(s(Rank.FIVE), h(Rank.FIVE), d(Rank.FIVE)));

        assertThat(empties.keepsCardsAfterPairs()).isFalse();
        assertThat(keeps.keepsCardsAfterPairs()).isTrue();
        assertThat(empties.size()).isEqualTo(4);
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
