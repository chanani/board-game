package com.boardgame.fruitstack;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameAction;
import java.util.Arrays;

// 행동 type → 게임 메서드. 모르는 type, score 없음은 INVALID_INPUT(음수는 Score가 INVALID_INPUT).
public enum FruitStackCommand {
    SCORE {
        @Override
        void apply(FruitStackGame game, PlayerId player, Score score) {
            game.report(player, score);
        }
    },
    OUT {
        @Override
        void apply(FruitStackGame game, PlayerId player, Score score) {
            game.out(player, score);
        }
    };

    abstract void apply(FruitStackGame game, PlayerId player, Score score);

    public void apply(FruitStackGame game, PlayerId player, GameAction action) {
        apply(game, player, scoreOf(action));
    }

    public static FruitStackCommand of(String type) {
        return Arrays.stream(values())
                .filter(command -> command.name().equals(type))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_INPUT));
    }

    private static Score scoreOf(GameAction action) {
        Integer score = action.score();
        if (score == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        return new Score(score);
    }
}
