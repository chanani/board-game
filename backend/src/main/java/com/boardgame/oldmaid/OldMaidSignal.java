package com.boardgame.oldmaid;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameAction;
import java.time.Instant;
import java.util.Arrays;
import java.util.Optional;

// 신호 type → 게임 메서드. 모르는 type만 INVALID_INPUT, 나머지 거절은 조용히 false(D15).
public enum OldMaidSignal {
    PEEK {
        @Override
        boolean apply(OldMaidGame game, PlayerId player, GameAction action, Instant now) {
            Integer index = action.index();
            if (index != null && index < 0) {
                return false;
            }
            Optional<SlotIndex> slot = Optional.ofNullable(index)
                    .map(SlotIndex::new);
            return game.peek(player, slot, now);
        }
    };

    abstract boolean apply(OldMaidGame game, PlayerId player, GameAction action, Instant now);

    public static OldMaidSignal of(String type) {
        return Arrays.stream(values())
                .filter(signal -> signal.name().equals(type))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_INPUT));
    }
}
