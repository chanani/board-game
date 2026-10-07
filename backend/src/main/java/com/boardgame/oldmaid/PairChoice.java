package com.boardgame.oldmaid;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.List;
import java.util.Objects;

// R36·R37: 짝으로 버리려고 고른 서로 다른 카드 두 장.
public record PairChoice(CardId first, CardId second) {

    private static final int SIZE = 2;

    // DISCARD의 cardIds: 서로 다른 두 장이 아니면 INVALID_INPUT, 없는 카드 번호면 내 손에 없는 카드다.
    public static PairChoice of(List<Integer> ids) {
        if (ids == null || ids.size() != SIZE || ids.stream().anyMatch(Objects::isNull)
                || ids.get(0).equals(ids.get(1))) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        return new PairChoice(cardId(ids.get(0)), cardId(ids.get(1)));
    }

    private static CardId cardId(int value) {
        if (value < 0 || value >= CardId.COUNT) {
            throw new BusinessException(ErrorCode.OLD_MAID_CARD_NOT_IN_HAND);
        }
        return new CardId(value);
    }
}
