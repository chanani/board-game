package com.boardgame.oldmaid;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameAction;
import java.time.Instant;
import java.util.Arrays;

// 행동 type → 게임 메서드. 모르는 type, DRAW의 index 없음, DISCARD의 cardIds가 서로 다른 두 장이 아니면 INVALID_INPUT.
public enum OldMaidCommand {
    DRAW {
        @Override
        void apply(OldMaidGame game, PlayerId player, GameAction action, Instant now) {
            game.draw(player, slotOf(action));
        }
    },
    DISCARD {
        @Override
        void apply(OldMaidGame game, PlayerId player, GameAction action, Instant now) {
            game.discard(player, PairChoice.of(action.cardIds()));
        }
    },
    SHUFFLE {
        @Override
        void apply(OldMaidGame game, PlayerId player, GameAction action, Instant now) {
            game.shuffle(player, now);
        }
    };

    abstract void apply(OldMaidGame game, PlayerId player, GameAction action, Instant now);

    public static OldMaidCommand of(String type) {
        return Arrays.stream(values())
                .filter(command -> command.name().equals(type))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_INPUT));
    }

    static SlotIndex slotOf(GameAction action) {
        if (action.index() == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        return new SlotIndex(action.index());
    }
}
