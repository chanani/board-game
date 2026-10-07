package com.boardgame.oldmaid;

import java.util.List;
import java.util.Optional;

// 손패·버린 짝·무작위 묶음.
public class OldMaidTable {

    private final Hands hands;
    private final DiscardPile discard;
    private final OldMaidDice dice;

    OldMaidTable(Hands hands, DiscardPile discard, OldMaidDice dice) {
        this.hands = hands;
        this.discard = discard;
        this.dice = dice;
    }

    boolean holds(PlayerId player) {
        return hands.sizeOf(player) > 0;
    }

    long holderCount() {
        return hands.holderCount();
    }

    int sizeOf(PlayerId player) {
        return hands.sizeOf(player);
    }

    List<PlayingCard> cardsOf(PlayerId player) {
        return hands.cardsOf(player);
    }

    void discard(List<CardPair> pairs) {
        discard.addAll(pairs);
    }

    int discardCount() {
        return discard.cardCount();
    }

    List<CardPair> recentPairs(int limit) {
        return discard.recent(limit);
    }

    PlayingCard takeFrom(PlayerId player, SlotIndex slot) {
        return hands.of(player).takeAt(slot);
    }

    // R13·D6
    Optional<CardPair> giveDrawn(PlayerId player, PlayingCard card) {
        Optional<CardPair> pair = hands.of(player).receive(card, dice.picker());
        pair.ifPresent(found -> discard.addAll(List.of(found)));
        return pair;
    }

    // R24
    void shuffle(PlayerId player) {
        hands.of(player).shuffle(dice.shuffler());
    }

    List<PlayingCard> takeAll(PlayerId player) {
        return hands.of(player).takeAll();
    }

    // R25·D7: 넘겨받은 카드를 더하고 짝을 버린 뒤 받는 사람 손패를 섞는다.
    List<CardPair> giveForfeited(PlayerId receiver, List<PlayingCard> cards) {
        Hand hand = hands.of(receiver);
        hand.addAll(cards);
        List<CardPair> pairs = hand.discardPairs();
        hand.shuffle(dice.shuffler());
        discard.addAll(pairs);
        return pairs;
    }
}
