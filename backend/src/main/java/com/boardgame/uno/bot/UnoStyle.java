package com.boardgame.uno.bot;

import com.boardgame.game.GameAction;
import com.boardgame.game.bot.ThinkTime;
import com.boardgame.uno.UnoColor;
import com.boardgame.uno.view.UnoCardView;
import java.time.Duration;
import java.util.Optional;
import java.util.Random;

// 난이도마다 다른 판단(R29~R31). 차례 행동의 뼈대(단계별 결정)와 우노 외치기 빠르기는 모두 같다.
abstract class UnoStyle {

    private static final int PERCENT = 100;
    private static final int CALL_MIN_MILLIS = 300;
    private static final int CALL_MAX_MILLIS = 700;

    /** 한 장이 되어 내 잡기 창이 열렸을 때 "우노!"를 외칠(잊지 않을) 확률(%). */
    abstract int callPercent();

    /** 남이 안 외친 것을 봤을 때의 잡기 버릇. 빈 값 = 잡지 않는다. */
    abstract Optional<CatchHabit> catchHabit();

    abstract GameAction play(UnoSight sight, Random random);

    abstract GameAction drawn(UnoSight sight, UnoCardView card, Random random);

    abstract UnoColor color(UnoSight sight, UnoCardView played, Random random);

    final GameAction turn(UnoSight sight, Random random) {
        return switch (sight.stage()) {
            case PLAY -> play(sight, random);
            case DRAWN -> drawn(sight, sight.drawn().orElseThrow(), random);
            case CHOOSE_COLOR -> UnoMoves.chooseColor(color(sight, sight.game().discardTop(), random));
        };
    }

    /** 내 잡기 창에서 외칠지(창마다 한 번 정한다). 외치면 잡히기 전에 0.3~0.7초 만에 외친다. 빈 값 = 잊고 외치지 않는다. */
    final Optional<Duration> call(Random random) {
        if (random.nextInt(PERCENT) >= callPercent()) {
            return Optional.empty();
        }
        return Optional.of(ThinkTime.between(random, CALL_MIN_MILLIS, CALL_MAX_MILLIS));
    }

    /** 와일드일 때만 color()로 색을 고른다. */
    protected GameAction playCard(UnoSight sight, UnoCardView card, Random random) {
        if (card.kind().isWild()) {
            return UnoMoves.play(card, color(sight, card, random));
        }
        return UnoMoves.play(card, null);
    }
}
