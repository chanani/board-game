package com.boardgame.uno.bot;

import com.boardgame.game.GameAction;
import com.boardgame.uno.CardKind;
import com.boardgame.uno.UnoColor;
import com.boardgame.uno.view.UnoCardView;
import com.boardgame.uno.view.UnoChallengeView;
import java.util.Comparator;
import java.util.Optional;
import java.util.Random;

// R30 중: 숫자 → 기능(건너뛰기·방향 바꾸기·+2) → 와일드 → +4 순으로, 같은 무리에서는 내가 가장 많이 가진 색.
// 뽑은 카드는 낸다. 색은 가장 많이 가진 색. 낸 사람이 5장 이상이면 30%로 도전. 우노 90%. 잡기 30%·1~3초.
final class MediumUno extends UnoStyle {

    private static final int PERCENT = 100;
    private static final int CALL = 90;
    private static final int CHALLENGE = 30;
    private static final int CHALLENGE_MIN_CARDS = 5;
    private static final CatchHabit CATCH = new CatchHabit(30, 1000, 3000);

    @Override
    int callPercent() {
        return CALL;
    }

    @Override
    Optional<CatchHabit> catchHabit() {
        return Optional.of(CATCH);
    }

    @Override
    GameAction play(UnoSight sight, Random random) {
        Comparator<UnoCardView> order = Comparator.comparingInt(MediumUno::group);
        Comparator<UnoCardView> byColor = Comparator.comparingInt(card -> held(sight, card));
        return sight.playable()
                .stream()
                .min(order.thenComparing(byColor.reversed()))
                .map(card -> playCard(sight, card, random))
                .orElseGet(UnoMoves::draw);
    }

    private static int group(UnoCardView card) {
        return switch (card.kind()) {
            case NUMBER -> 0;
            case SKIP, REVERSE, DRAW_TWO -> 1;
            case WILD -> 2;
            case WILD_DRAW_FOUR -> 3;
        };
    }

    private static int held(UnoSight sight, UnoCardView card) {
        if (card.kind() == CardKind.WILD || card.kind() == CardKind.WILD_DRAW_FOUR) {
            return 0;
        }
        return sight.countOfColorExcept(card.color(), card) + 1;
    }

    @Override
    GameAction drawn(UnoSight sight, UnoCardView card, Random random) {
        return playCard(sight, card, random);
    }

    @Override
    UnoColor color(UnoSight sight, UnoCardView played, Random random) {
        return sight.mostHeldColorExcept(played);
    }

    @Override
    boolean challenges(UnoSight sight, Random random) {
        int count = sight.challenge()
                .map(UnoChallengeView::byId)
                .map(sight::cardCountOf)
                .orElse(0);
        if (count < CHALLENGE_MIN_CARDS) {
            return false;
        }
        return random.nextInt(PERCENT) < CHALLENGE;
    }
}
