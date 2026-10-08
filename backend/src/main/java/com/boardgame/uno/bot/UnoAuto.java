package com.boardgame.uno.bot;

import com.boardgame.game.GameAction;
import java.util.Optional;

// R21: 판단이 실패했을 때의 대체 행동. 시간 초과 자동 행동(R40 autoAct)과 같은 결정이다.
// 내 차례가 아니면 빈 값. PLAY → 뽑기, DRAWN → 갖기, CHOOSE_COLOR → 가장 많이 가진 색, CHALLENGE → 받기.
final class UnoAuto {

    private UnoAuto() {
    }

    static Optional<GameAction> fallback(UnoSight sight) {
        if (!sight.myTurn() || sight.stage() == null) {
            return Optional.empty();
        }
        return Optional.of(switch (sight.stage()) {
            case PLAY -> UnoMoves.draw();
            case DRAWN -> UnoMoves.keep();
            case CHOOSE_COLOR -> UnoMoves.chooseColor(sight.mostHeldColor());
            case CHALLENGE -> UnoMoves.accept();
        });
    }
}
