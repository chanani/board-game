package com.boardgame.oldmaid;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

final class OldMaidFixtures {

    static final PlayerId A = new PlayerId(1L);
    static final PlayerId B = new PlayerId(2L);
    static final PlayerId C = new PlayerId(3L);
    static final PlayerId D = new PlayerId(4L);
    static final PlayingCard JOKER = PlayingCard.joker();
    /** 섞어도 순서를 바꾸지 않는다. */
    static final OldMaidShuffler KEEP_ORDER = List::copyOf;

    private OldMaidFixtures() {
    }

    static PlayingCard s(Rank rank) {
        return PlayingCard.of(Suit.SPADES, rank);
    }

    static PlayingCard h(Rank rank) {
        return PlayingCard.of(Suit.HEARTS, rank);
    }

    static PlayingCard d(Rank rank) {
        return PlayingCard.of(Suit.DIAMONDS, rank);
    }

    static PlayingCard c(Rank rank) {
        return PlayingCard.of(Suit.CLUBS, rank);
    }

    static OldMaidDice dice(SlotPicker picker) {
        return new OldMaidDice(KEEP_ORDER, picker);
    }

    /** 섞기는 순서 그대로, 받은 카드는 늘 맨 앞(0번)에 끼운다. */
    static OldMaidDice fixedDice() {
        return dice(bound -> 0);
    }

    static Map<PlayerId, List<PlayingCard>> hands(List<PlayingCard> a, List<PlayingCard> b) {
        Map<PlayerId, List<PlayingCard>> hands = new LinkedHashMap<>();
        hands.put(A, a);
        hands.put(B, b);
        return hands;
    }

    static Map<PlayerId, List<PlayingCard>> hands(List<PlayingCard> a, List<PlayingCard> b, List<PlayingCard> c) {
        Map<PlayerId, List<PlayingCard>> hands = hands(a, b);
        hands.put(C, c);
        return hands;
    }

    static Map<PlayerId, List<PlayingCard>> hands(List<PlayingCard> a, List<PlayingCard> b, List<PlayingCard> c,
                                                  List<PlayingCard> d) {
        Map<PlayerId, List<PlayingCard>> hands = hands(a, b, c);
        hands.put(D, d);
        return hands;
    }

    static OldMaidGame game(PlayerId first, Map<PlayerId, List<PlayingCard>> hands) {
        return game(first, hands, fixedDice());
    }

    /** 자리 순서 = hands의 키 순서. 손패의 짝은 Deal.of가 버린다(R6). */
    static OldMaidGame game(PlayerId first, Map<PlayerId, List<PlayingCard>> hands, OldMaidDice dice) {
        List<PlayerId> players = List.copyOf(hands.keySet());
        Map<PlayerId, Hand> made = new LinkedHashMap<>();
        hands.forEach((player, cards) -> made.put(player, new Hand(cards)));
        Seats seats = new Seats(players);
        Deal deal = Deal.of(first, seats.inOrderFrom(first), new Hands(made));
        return OldMaidGame.begin(players, deal, dice);
    }
}
