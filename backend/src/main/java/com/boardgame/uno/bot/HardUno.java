package com.boardgame.uno.bot;

import com.boardgame.game.GameAction;
import com.boardgame.uno.CardKind;
import com.boardgame.uno.UnoColor;
import com.boardgame.uno.view.UnoCardView;
import com.boardgame.uno.view.UnoChallengeView;
import java.util.List;
import java.util.Optional;
import java.util.Random;

// R31 상: 중에 더해
// - 다음 사람이 2장 이하면 +2 → +4(허세 허용) → 건너뛰기 → 방향 바꾸기 먼저.
// - 손이 4장 이상이면 정당한 +4 먼저(3장 이하면 와일드를 아낀다).
// - 그 밖에는 내고 나서 그 색이 가장 많이 남는 비와일드(같은 색이 이어지게), 없으면 와일드, 그다음 정당한 +4.
// - 허세 +4는 다음 사람이 2장 이하일 때만(뽑은 허세 +4도 그때만 내고 아니면 갖는다).
// - 도전은 직전 색 기준 어림이 50%를 넘을 때만. 우노 100%. 잡기 100%·0.8~1.5초.
final class HardUno extends UnoStyle {

    private static final int CALL = 100;
    private static final int ATTACK_WHEN_NEXT_AT_MOST = 2;
    private static final int SAVE_WILDS_AT_MOST = 3;
    private static final double CHALLENGE_ABOVE = 0.5;
    private static final double MISSED_CHANCE = 0.15;
    private static final double NOT_COLOR_PER_CARD = 0.75;
    private static final List<CardKind> ATTACKS =
            List.of(CardKind.DRAW_TWO, CardKind.WILD_DRAW_FOUR, CardKind.SKIP, CardKind.REVERSE);
    private static final CatchHabit CATCH = new CatchHabit(100, 800, 1500);

    private final UnoMemory memory;

    HardUno(UnoMemory memory) {
        this.memory = memory;
    }

    @Override
    int callPercent() {
        return CALL;
    }

    @Override
    Optional<CatchHabit> catchHabit() {
        return Optional.of(CATCH);
    }

    @Override
    void observe(UnoSight sight) {
        memory.observe(sight);
    }

    @Override
    GameAction play(UnoSight sight, Random random) {
        List<UnoCardView> playable = sight.playable();
        return attack(sight, playable)
                .or(() -> earlyFour(sight, playable))
                .or(() -> keepsColor(sight, playable))
                .or(() -> firstOf(playable, CardKind.WILD))
                .or(() -> legalFour(sight, playable))
                .map(card -> playCard(sight, card, random))
                .orElseGet(UnoMoves::draw);
    }

    private Optional<UnoCardView> attack(UnoSight sight, List<UnoCardView> playable) {
        if (sight.nextPlayerCards() > ATTACK_WHEN_NEXT_AT_MOST) {
            return Optional.empty();
        }
        return ATTACKS.stream()
                .map(kind -> firstOf(playable, kind))
                .flatMap(Optional::stream)
                .findFirst();
    }

    private Optional<UnoCardView> earlyFour(UnoSight sight, List<UnoCardView> playable) {
        if (sight.hand().size() <= SAVE_WILDS_AT_MOST) {
            return Optional.empty();
        }
        return legalFour(sight, playable);
    }

    private Optional<UnoCardView> legalFour(UnoSight sight, List<UnoCardView> playable) {
        if (sight.riskyFour()) {
            return Optional.empty();
        }
        return firstOf(playable, CardKind.WILD_DRAW_FOUR);
    }

    // 내고 나서 그 색이 가장 많이 남는 카드. 동점은 손패 앞쪽.
    private Optional<UnoCardView> keepsColor(UnoSight sight, List<UnoCardView> playable) {
        return playable.stream()
                .filter(card -> !card.kind().isWild())
                .reduce((best, card) -> moreLeft(sight, card, best));
    }

    private UnoCardView moreLeft(UnoSight sight, UnoCardView card, UnoCardView best) {
        if (sight.countOfColorExcept(card.color(), card) > sight.countOfColorExcept(best.color(), best)) {
            return card;
        }
        return best;
    }

    private static Optional<UnoCardView> firstOf(List<UnoCardView> cards, CardKind kind) {
        return cards.stream()
                .filter(card -> card.kind() == kind)
                .findFirst();
    }

    @Override
    GameAction drawn(UnoSight sight, UnoCardView card, Random random) {
        if (isBluff(sight, card) && sight.nextPlayerCards() > ATTACK_WHEN_NEXT_AT_MOST) {
            return UnoMoves.keep();
        }
        return playCard(sight, card, random);
    }

    private boolean isBluff(UnoSight sight, UnoCardView card) {
        return card.kind() == CardKind.WILD_DRAW_FOUR && sight.riskyFour();
    }

    @Override
    UnoColor color(UnoSight sight, UnoCardView played, Random random) {
        return sight.mostHeldColorExcept(played);
    }

    @Override
    boolean challenges(UnoSight sight, Random random) {
        return sight.challenge()
                .map(challenge -> guiltyChance(sight, challenge))
                .filter(chance -> chance > CHALLENGE_ABOVE)
                .isPresent();
    }

    // 직전 색 기준: 직전 색이 없으면 0, 그 사람이 그 색을 내지 못하고 뽑은 기록이 있으면 0.15,
    // 아니면 남은 카드 중 한 장이라도 그 색일 어림 1 − 0.75^장수.
    double guiltyChance(UnoSight sight, UnoChallengeView challenge) {
        UnoColor previous = challenge.previousColor();
        if (previous == null) {
            return 0;
        }
        if (memory.missed(challenge.byId(), previous)) {
            return MISSED_CHANCE;
        }
        return 1 - Math.pow(NOT_COLOR_PER_CARD, sight.cardCountOf(challenge.byId()));
    }
}
