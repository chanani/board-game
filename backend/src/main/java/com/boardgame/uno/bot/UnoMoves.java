package com.boardgame.uno.bot;

import com.boardgame.game.GameAction;
import com.boardgame.uno.UnoColor;
import com.boardgame.uno.view.UnoCardView;

// 우노 행동 글자(UnoCommand)를 GameAction으로 만든다. 사람이 보내는 것과 같은 모양이다.
final class UnoMoves {

    private UnoMoves() {
    }

    /** color는 와일드일 때만 싣는다(아니면 null). */
    static GameAction play(UnoCardView card, UnoColor color) {
        return new GameAction("PLAY", null, null, card.id(), nameOf(color), null);
    }

    static GameAction draw() {
        return plain("DRAW");
    }

    static GameAction keep() {
        return plain("KEEP");
    }

    static GameAction chooseColor(UnoColor color) {
        return new GameAction("CHOOSE_COLOR", null, null, null, nameOf(color), null);
    }

    static GameAction challenge() {
        return plain("CHALLENGE");
    }

    static GameAction accept() {
        return plain("ACCEPT");
    }

    static GameAction callUno() {
        return plain("CALL_UNO");
    }

    static GameAction catchUno(long target) {
        return new GameAction("CATCH_UNO", null, null, null, null, target);
    }

    private static GameAction plain(String type) {
        return new GameAction(type, null, null);
    }

    private static String nameOf(UnoColor color) {
        if (color == null) {
            return null;
        }
        return color.name();
    }
}
