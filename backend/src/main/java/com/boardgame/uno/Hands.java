package com.boardgame.uno;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class Hands {

    private final Map<PlayerId, Hand> hands;

    public Hands(Map<PlayerId, Hand> hands) {
        this.hands = new LinkedHashMap<>(hands);
    }

    public Hand of(PlayerId player) {
        Hand hand = hands.get(player);
        if (hand == null) {
            throw new BusinessException(ErrorCode.NOT_A_PLAYER);
        }
        return hand;
    }

    public List<UnoCard> cardsOf(PlayerId player) {
        Hand hand = hands.get(player);
        if (hand == null) {
            return List.of();
        }
        return hand.cards();
    }

    public Hand remove(PlayerId player) {
        return hands.remove(player);
    }

    // R31: 이긴 사람을 뺀 남은 참가자 손패 점수의 합.
    public UnoPoints pointsExcept(PlayerId winner) {
        return hands.entrySet()
                .stream()
                .filter(entry -> !entry.getKey().equals(winner))
                .map(entry -> entry.getValue().points())
                .reduce(UnoPoints.ZERO, UnoPoints::plus);
    }
}
