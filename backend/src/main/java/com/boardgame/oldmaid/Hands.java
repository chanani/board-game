package com.boardgame.oldmaid;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

public class Hands {

    private final Map<PlayerId, Hand> hands;

    public Hands(Map<PlayerId, Hand> hands) {
        this.hands = new LinkedHashMap<>(hands);
    }

    // R5: order의 첫 사람부터 한 장씩 돌려 덱을 모두 나눈다.
    public static Hands dealt(List<PlayerId> order, List<PlayingCard> deck) {
        Map<PlayerId, List<PlayingCard>> piles = new LinkedHashMap<>();
        order.forEach(player -> piles.put(player, new ArrayList<>()));
        IntStream.range(0, deck.size())
                .forEach(index -> dealOne(piles, receiverAt(order, index), deck.get(index)));
        Map<PlayerId, Hand> hands = new LinkedHashMap<>();
        piles.forEach((player, cards) -> hands.put(player, new Hand(cards)));
        return new Hands(hands);
    }

    private static PlayerId receiverAt(List<PlayerId> order, int index) {
        return order.get(index % order.size());
    }

    private static void dealOne(Map<PlayerId, List<PlayingCard>> piles, PlayerId receiver, PlayingCard card) {
        List<PlayingCard> pile = piles.get(receiver);
        pile.add(card);
    }

    public Hand of(PlayerId player) {
        Hand hand = hands.get(player);
        if (hand == null) {
            throw new BusinessException(ErrorCode.NOT_A_PLAYER);
        }
        return hand;
    }

    public int sizeOf(PlayerId player) {
        Hand hand = hands.get(player);
        if (hand == null) {
            return 0;
        }
        return hand.size();
    }

    public List<PlayingCard> cardsOf(PlayerId player) {
        Hand hand = hands.get(player);
        if (hand == null) {
            return List.of();
        }
        return hand.cards();
    }

    public long holderCount() {
        return hands.values()
                .stream()
                .filter(hand -> !hand.isEmpty())
                .count();
    }
}
