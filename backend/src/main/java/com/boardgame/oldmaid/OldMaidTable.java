package com.boardgame.oldmaid;

import java.util.List;

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

    boolean hasPair(PlayerId player) {
        return hands.hasPair(player);
    }

    boolean anyPair() {
        return hands.anyPair();
    }

    // R36·R37: 사람이 고른 두 장을 버린 더미로.
    CardPair discardChosen(PlayerId owner, PairChoice choice) {
        CardPair pair = hands.of(owner).takePair(choice);
        discard.addAll(owner, List.of(pair));
        return pair;
    }

    // R38: 시간이 지나 그 사람 손의 짝을 모두 버린다(R6과 같은 방식: 손패 순서로 앞에서부터).
    List<CardPair> discardAllPairs(PlayerId owner) {
        List<CardPair> pairs = hands.of(owner).discardPairs();
        discard.addAll(owner, pairs);
        return pairs;
    }

    int discardCount() {
        return discard.cardCount();
    }

    List<CardPair> recentPairs(int limit) {
        return discard.recent(limit);
    }

    List<DiscardedPair> discards() {
        return discard.all();
    }

    PlayingCard takeFrom(PlayerId player, SlotIndex slot) {
        return hands.of(player).takeAt(slot);
    }

    // R13·D6: 뽑은 카드를 무작위 자리에 끼우고, 그 카드로 짝이 되었는지 돌려준다(버리는 것은 R37).
    boolean giveDrawn(PlayerId player, PlayingCard card) {
        Hand hand = hands.of(player);
        hand.insert(card, dice.picker());
        return hand.hasPair();
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
        discard.addAll(receiver, pairs);
        return pairs;
    }
}
