package com.boardgame.uno;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameAction;
import java.util.Arrays;

// 행동 type → 게임 메서드. 모르는 type이나 필수 칸이 없으면 INVALID_INPUT.
public enum UnoCommand {
    PLAY {
        @Override
        void apply(UnoGame game, PlayerId player, GameAction action) {
            game.play(player, cardIdOf(action), new ChosenColor(action.color()));
        }
    },
    DRAW {
        @Override
        void apply(UnoGame game, PlayerId player, GameAction action) {
            game.draw(player);
        }
    },
    KEEP {
        @Override
        void apply(UnoGame game, PlayerId player, GameAction action) {
            game.keep(player);
        }
    },
    CHOOSE_COLOR {
        @Override
        void apply(UnoGame game, PlayerId player, GameAction action) {
            game.chooseColor(player, new ChosenColor(action.color()));
        }
    },
    CALL_UNO {
        @Override
        void apply(UnoGame game, PlayerId player, GameAction action) {
            game.callUno(player);
        }
    },
    CATCH_UNO {
        @Override
        void apply(UnoGame game, PlayerId player, GameAction action) {
            game.catchUno(player, targetOf(action));
        }
    };

    abstract void apply(UnoGame game, PlayerId player, GameAction action);

    public static UnoCommand of(String type) {
        return Arrays.stream(values())
                .filter(command -> command.name().equals(type))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_INPUT));
    }

    static CardId cardIdOf(GameAction action) {
        if (action.cardId() == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        return new CardId(action.cardId());
    }

    static PlayerId targetOf(GameAction action) {
        if (action.targetId() == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        return new PlayerId(action.targetId());
    }
}
