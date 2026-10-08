package com.boardgame.uno;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

// 한 사람의 손패. 받은 순서대로 둔다(정렬은 화면이 한다).
public class Hand {

    private final List<UnoCard> cards;

    public Hand(List<UnoCard> dealt) {
        this.cards = new ArrayList<>(dealt);
    }

    public boolean has(CardId id) {
        return cards.stream().anyMatch(card -> card.hasId(id));
    }

    public UnoCard find(CardId id) {
        return cards.stream()
                .filter(card -> card.hasId(id))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.UNO_CARD_NOT_IN_HAND));
    }

    public UnoCard take(CardId id) {
        UnoCard card = find(id);
        cards.remove(card);
        return card;
    }

    public void add(List<UnoCard> more) {
        cards.addAll(more);
    }

    public int size() {
        return cards.size();
    }

    public boolean isEmpty() {
        return cards.isEmpty();
    }

    // R40: 가장 많은 색, 같으면 선언 순서(빨강 > 노랑 > 초록 > 파랑), 색 카드가 없으면 빨강.
    public UnoColor mostHeldColor() {
        return Arrays.stream(UnoColor.values())
                .reduce((best, color) -> countOf(color) > countOf(best) ? color : best)
                .orElseThrow();
    }

    private long countOf(UnoColor color) {
        return cards.stream()
                .filter(card -> card.isColor(color))
                .count();
    }

    public UnoPoints points() {
        return cards.stream()
                .map(UnoCard::points)
                .reduce(UnoPoints.ZERO, UnoPoints::plus);
    }

    public List<CardId> playable(UnoCard top, UnoColor current) {
        return cards.stream()
                .filter(card -> card.matches(top, current))
                .map(UnoCard::id)
                .toList();
    }

    public List<UnoCard> cards() {
        return List.copyOf(cards);
    }
}
