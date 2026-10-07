package com.boardgame.oldmaid;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

// R36·R37: 짝으로 버리려고 고른 서로 다른 카드 두 장.
public record PairChoice(CardId first, CardId second) {

    private static final int SIZE = 2;

    // DISCARD의 cardIds: 서로 다른 두 장이 아니면 INVALID_INPUT, 없는 카드 번호면 내 손에 없는 카드다.
    public static PairChoice of(List<Integer> ids) {
        if (!isTwoDistinct(ids)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        CardId first = cardId(ids.get(0));
        CardId second = cardId(ids.get(1));
        return new PairChoice(first, second);
    }

    private static boolean isTwoDistinct(List<Integer> ids) {
        return hasTwo(ids) && !hasNull(ids) && !isSame(ids);
    }

    private static boolean hasTwo(List<Integer> ids) {
        return ids != null && ids.size() == SIZE;
    }

    // List.of의 contains(null)은 NullPointerException을 던지므로 하나씩 본다.
    private static boolean hasNull(List<Integer> ids) {
        Stream<Integer> values = ids.stream();
        return values.anyMatch(Objects::isNull);
    }

    private static boolean isSame(List<Integer> ids) {
        Integer first = ids.get(0);
        Integer second = ids.get(1);
        return first.equals(second);
    }

    private static CardId cardId(int value) {
        if (value < 0 || value >= CardId.COUNT) {
            throw new BusinessException(ErrorCode.OLD_MAID_CARD_NOT_IN_HAND);
        }
        return new CardId(value);
    }
}
