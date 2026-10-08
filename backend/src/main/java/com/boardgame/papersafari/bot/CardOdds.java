package com.boardgame.papersafari.bot;

import com.boardgame.papersafari.Card;
import com.boardgame.papersafari.StandardDeck;
import com.boardgame.papersafari.view.CardView;
import java.util.ArrayList;
import java.util.List;

// R28: 모르는 카드 한 장의 평균 점수. 하·중은 54장 덱 전체 평균(상수 252/54), 상은 공개된 카드를 뺀 나머지 평균(R27).
public final class CardOdds {

    public static final double DECK_AVERAGE = averageOf(deckValues());

    private CardOdds() {
    }

    public static double remainingAverage(List<CardView> seen) {
        List<Integer> pool = new ArrayList<>(deckValues());
        seen.forEach(card -> pool.remove(Integer.valueOf(card.value())));
        if (pool.isEmpty()) {
            return DECK_AVERAGE;
        }
        return averageOf(pool);
    }

    private static List<Integer> deckValues() {
        return StandardDeck.cards()
                .stream()
                .map(Card::faceValue)
                .toList();
    }

    private static double averageOf(List<Integer> values) {
        return values.stream()
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0);
    }
}
