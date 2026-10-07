package com.boardgame.oldmaid;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

// 한 사람의 손패. 순서가 곧 남이 고르는 자리 번호다(D13).
public class Hand {

    private final List<PlayingCard> cards;

    public Hand(List<PlayingCard> cards) {
        this.cards = new ArrayList<>(cards);
    }

    public int size() {
        return cards.size();
    }

    public boolean isEmpty() {
        return cards.isEmpty();
    }

    public List<PlayingCard> cards() {
        return List.copyOf(cards);
    }

    // R6: 손패 순서로 앞에서부터 같은 랭크 두 장씩 버린다. 3장이면 세 번째가 남는다.
    public List<CardPair> discardPairs() {
        List<CardPair> pairs = new ArrayList<>();
        Optional<CardPair> pair = firstPair();
        while (pair.isPresent()) {
            pairs.add(remove(pair.get()));
            pair = firstPair();
        }
        return pairs;
    }

    // R12
    public PlayingCard takeAt(SlotIndex slot) {
        if (slot.value() >= cards.size()) {
            throw new BusinessException(ErrorCode.OLD_MAID_INVALID_SLOT);
        }
        return cards.remove(slot.value());
    }

    // R13·D6: 뽑은 카드는 짝이 되든 안 되든 picker가 고른 자리(0..장수)에 끼운다. 짝은 사람이 버린다(R37).
    public void insert(PlayingCard card, SlotPicker picker) {
        cards.add(picker.pick(cards.size() + 1), card);
    }

    // R3: 손에 같은 숫자 두 장이 있는지.
    public boolean hasPair() {
        return firstPair().isPresent();
    }

    // R7: 짝을 모두 버렸다면 카드가 남는지(손패는 그대로 둔다).
    public boolean keepsCardsAfterPairs() {
        Hand copy = new Hand(cards);
        copy.discardPairs();
        return !copy.isEmpty();
    }

    // R36·R37: 사람이 고른 두 장을 짝으로 버린다. 내 손에 없으면 OLD_MAID_CARD_NOT_IN_HAND, 같은 숫자가 아니면 OLD_MAID_NOT_A_PAIR.
    public CardPair takePair(PairChoice choice) {
        PlayingCard first = find(choice.first());
        PlayingCard second = find(choice.second());
        if (!first.pairsWith(second)) {
            throw new BusinessException(ErrorCode.OLD_MAID_NOT_A_PAIR);
        }
        return remove(new CardPair(first, second));
    }

    private PlayingCard find(CardId id) {
        return cards.stream()
                .filter(card -> card.id().equals(id))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.OLD_MAID_CARD_NOT_IN_HAND));
    }

    public List<PlayingCard> takeAll() {
        List<PlayingCard> all = List.copyOf(cards);
        cards.clear();
        return all;
    }

    public void addAll(List<PlayingCard> more) {
        cards.addAll(more);
    }

    public void shuffle(OldMaidShuffler shuffler) {
        List<PlayingCard> next = shuffler.shuffle(List.copyOf(cards));
        cards.clear();
        cards.addAll(next);
    }

    private Optional<CardPair> firstPair() {
        return cards.stream()
                .flatMap(card -> partnerOf(card).map(partner -> new CardPair(card, partner)).stream())
                .findFirst();
    }

    private Optional<PlayingCard> partnerOf(PlayingCard card) {
        return cards.stream()
                .filter(card::pairsWith)
                .findFirst();
    }

    private CardPair remove(CardPair pair) {
        cards.remove(pair.first());
        cards.remove(pair.second());
        return pair;
    }
}
