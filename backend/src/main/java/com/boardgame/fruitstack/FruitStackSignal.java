package com.boardgame.fruitstack;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameAction;
import java.util.Arrays;
import java.util.OptionalLong;

// 신호 type → 게임 메서드. 모르는 type만 INVALID_INPUT, 나머지 거절은 조용히 빈 값(R24).
public enum FruitStackSignal {
    BOARD {
        @Override
        OptionalLong apply(FruitStackGame game, PlayerId player, GameAction action) {
            return game.relay(player, action.board());
        }
    };

    abstract OptionalLong apply(FruitStackGame game, PlayerId player, GameAction action);

    public static FruitStackSignal of(String type) {
        return Arrays.stream(values())
                .filter(signal -> signal.name().equals(type))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_INPUT));
    }
}
