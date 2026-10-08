package com.boardgame.uno.bot;

import com.boardgame.game.GameAction;
import com.boardgame.uno.UnoColor;
import com.boardgame.uno.view.UnoCardView;
import java.util.Optional;
import java.util.Random;

// 난이도마다 다른 판단(R29~R31). 차례 행동의 뼈대(외치기 → 단계별 결정)는 모두 같다.
abstract class UnoStyle {

    private static final int PERCENT = 100;

    /** 두 장일 때 "우노!"를 외칠 확률(%). */
    abstract int callPercent();

    /** 남이 안 외친 것을 봤을 때의 잡기 버릇. 빈 값 = 잡지 않는다. */
    abstract Optional<CatchHabit> catchHabit();

    abstract GameAction play(UnoSight sight, Random random);

    abstract GameAction drawn(UnoSight sight, UnoCardView card, Random random);

    abstract UnoColor color(UnoSight sight, UnoCardView played, Random random);

    abstract boolean challenges(UnoSight sight, Random random);

    /** 상태가 바뀔 때마다 자기 화면을 본다(기억이 필요한 난이도만 쓴다). */
    void observe(UnoSight sight) {
    }

    final GameAction turn(UnoSight sight, Random random) {
        if (calls(sight, random)) {
            return UnoMoves.callUno();
        }
        return switch (sight.stage()) {
            case PLAY -> play(sight, random);
            case DRAWN -> drawn(sight, sight.drawn().orElseThrow(), random);
            case CHOOSE_COLOR -> UnoMoves.chooseColor(color(sight, sight.game().discardTop(), random));
            case CHALLENGE -> answer(sight, random);
        };
    }

    // 낼 카드가 있어 두 장 → 한 장이 될 수 있을 때만 외친다.
    private boolean calls(UnoSight sight, Random random) {
        if (!sight.canCall() || !sight.myTurn() || sight.playable().isEmpty()) {
            return false;
        }
        return random.nextInt(PERCENT) < callPercent();
    }

    private GameAction answer(UnoSight sight, Random random) {
        if (challenges(sight, random)) {
            return UnoMoves.challenge();
        }
        return UnoMoves.accept();
    }

    /** 와일드일 때만 color()로 색을 고른다. */
    protected GameAction playCard(UnoSight sight, UnoCardView card, Random random) {
        if (card.kind().isWild()) {
            return UnoMoves.play(card, color(sight, card, random));
        }
        return UnoMoves.play(card, null);
    }
}
