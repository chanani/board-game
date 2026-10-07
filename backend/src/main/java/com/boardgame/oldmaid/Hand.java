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

    // R13·D6: 짝이 있으면 두 장을 내보내고, 없으면 picker가 고른 자리(0..장수)에 끼운다.
    public Optional<CardPair> receive(PlayingCard card, SlotPicker picker) {
        Optional<PlayingCard> partner = partnerOf(card);
        if (partner.isPresent()) {
            return Optional.of(remove(new CardPair(partner.get(), card)));
        }
        cards.add(picker.pick(cards.size() + 1), card);
        return Optional.empty();
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

    // 받은 카드는 아직 손에 없으므로 remove가 아무것도 지우지 않아도 된다.
    private CardPair remove(CardPair pair) {
        cards.remove(pair.first());
        cards.remove(pair.second());
        return pair;
    }
}
