package com.boardgame.uno.bot;

import com.boardgame.game.GameAction;
import com.boardgame.uno.UnoColor;
import com.boardgame.uno.view.UnoCardView;
import java.util.List;
import java.util.Optional;
import java.util.Random;

// R29 하: 규칙만 아는 초보. 무작위로 내고(20%는 그냥 뽑음), 뽑은 카드는 반만 내고, 색은 무작위,
// 우노는 반만 외치고, 남을 잡지 않는다.
final class EasyUno extends UnoStyle {

    private static final int PERCENT = 100;
    private static final int DRAW_ANYWAY = 20;
    private static final int PLAY_DRAWN = 50;
    private static final int CALL = 50;

    @Override
    int callPercent() {
        return CALL;
    }

    @Override
    Optional<CatchHabit> catchHabit() {
        return Optional.empty();
    }

    @Override
    GameAction play(UnoSight sight, Random random) {
        List<UnoCardView> playable = sight.playable();
        if (playable.isEmpty() || random.nextInt(PERCENT) < DRAW_ANYWAY) {
            return UnoMoves.draw();
        }
        return playCard(sight, playable.get(random.nextInt(playable.size())), random);
    }

    @Override
    GameAction drawn(UnoSight sight, UnoCardView card, Random random) {
        if (random.nextInt(PERCENT) < PLAY_DRAWN) {
            return playCard(sight, card, random);
        }
        return UnoMoves.keep();
    }

    @Override
    UnoColor color(UnoSight sight, UnoCardView played, Random random) {
        UnoColor[] colors = UnoColor.values();
        return colors[random.nextInt(colors.length)];
    }
}
