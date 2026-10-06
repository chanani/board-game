package com.boardgame.papersafari;

import java.util.List;
import java.util.stream.IntStream;

/** 한 줄(3칸)에서 와일드마다 왼쪽/오른쪽 이웃 복사 방향을 정한 하나의 해석. */
record WildResolution(List<Card> cards, int rightMask) {

    private static final int WIDTH = Position.COLUMNS;
    private static final List<CardValue> NO_SOURCE = java.util.Collections.nCopies(WIDTH, CardValue.ZERO);

    static List<List<CardValue>> candidates(List<Card> cards) {
        List<List<CardValue>> resolved = IntStream.range(0, 1 << WIDTH)
                .mapToObj(mask -> new WildResolution(cards, mask))
                .filter(WildResolution::hasSourceForEveryWild)
                .filter(WildResolution::everyWildReachesCard)
                .map(WildResolution::values)
                .distinct()
                .toList();
        return resolved.isEmpty() ? List.of(NO_SOURCE) : resolved;
    }

    private boolean everyWildReachesCard() {
        return IntStream.range(0, WIDTH).allMatch(index -> reachesCard(index, 0));
    }

    private boolean reachesCard(int index, int depth) {
        if (!isWild(index)) {
            return true;
        }
        return depth < WIDTH && reachesCard(index + step(index), depth + 1);
    }

    List<CardValue> values() {
        return IntStream.range(0, WIDTH).mapToObj(index -> valueAt(index, 0)).toList();
    }

    private boolean hasSourceForEveryWild() {
        return IntStream.range(0, WIDTH).allMatch(this::hasSource);
    }

    private boolean hasSource(int index) {
        return !isWild(index) || isInside(index + step(index));
    }

    private CardValue valueAt(int index, int depth) {
        if (!isWild(index)) {
            return cards.get(index).value();
        }
        if (depth >= WIDTH) {
            return CardValue.ZERO;
        }
        return valueAt(index + step(index), depth + 1);
    }

    private boolean isWild(int index) {
        return cards.get(index).is(CardKind.WILD);
    }

    private int step(int index) {
        return (rightMask >> index & 1) == 1 ? 1 : -1;
    }

    private boolean isInside(int index) {
        return index >= 0 && index < WIDTH;
    }
}
