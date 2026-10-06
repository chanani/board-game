package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameAction;
import java.util.Arrays;

enum PaperSafariCommand {
    FLIP {
        @Override
        void apply(PaperSafariGame game, PlayerId player, GameAction action) {
            game.flipInitial(player, positionOf(action));
        }
    },
    DRAW_DECK {
        @Override
        void apply(PaperSafariGame game, PlayerId player, GameAction action) {
            game.drawFromDeck(player);
        }
    },
    DRAW_DISCARD {
        @Override
        void apply(PaperSafariGame game, PlayerId player, GameAction action) {
            game.drawFromDiscard(player);
        }
    },
    CANCEL_DRAW {
        @Override
        void apply(PaperSafariGame game, PlayerId player, GameAction action) {
            game.cancelDraw(player);
        }
    },
    SWAP {
        @Override
        void apply(PaperSafariGame game, PlayerId player, GameAction action) {
            game.swapAt(player, positionOf(action));
        }
    },
    DISCARD {
        @Override
        void apply(PaperSafariGame game, PlayerId player, GameAction action) {
            game.discardDrawn(player);
        }
    },
    PEEK {
        @Override
        void apply(PaperSafariGame game, PlayerId player, GameAction action) {
            game.peekAt(player, positionOf(action));
        }
    };

    abstract void apply(PaperSafariGame game, PlayerId player, GameAction action);

    static PaperSafariCommand of(String type) {
        return Arrays.stream(values())
                .filter(command -> command.name().equals(type))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_INPUT));
    }

    private static Position positionOf(GameAction action) {
        if (action.column() == null || action.row() == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        return new Position(action.column(), action.row());
    }
}
