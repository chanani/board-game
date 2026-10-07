package com.boardgame.oldmaid;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

// R23: 사람마다 마지막으로 섞은 시각. 1초가 지나야 다시 섞는다.
public class ShuffleCooldowns {

    static final Duration COOLDOWN = Duration.ofSeconds(1);

    private final Map<PlayerId, Instant> lastShuffle = new HashMap<>();

    void use(PlayerId player, Instant now) {
        Instant last = lastShuffle.get(player);
        if (last != null && now.isBefore(last.plus(COOLDOWN))) {
            throw new BusinessException(ErrorCode.OLD_MAID_SHUFFLE_TOO_FAST);
        }
        lastShuffle.put(player, now);
    }
}
