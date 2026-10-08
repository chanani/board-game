package com.boardgame.room.application;

import com.boardgame.game.PendingKind;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

// 컴퓨터마다 살아 있는 결정 하나. 결정이 그대로면 예약도 그대로 두어 생각 시간이 다시 시작되지 않는다.
class BotIntents {

    private final Map<Long, BotIntent> intents = new HashMap<>();

    boolean holds(long botId, PendingKind kind, Object view) {
        return Optional.ofNullable(intents.get(botId))
                .filter(intent -> intent.stillHolds(kind, view))
                .isPresent();
    }

    void hold(long botId, BotIntent intent) {
        intents.put(botId, intent);
    }

    // 더 이상 행동을 기다리지 않는 컴퓨터의 결정은 버린다(R20: 그 예약은 아무것도 하지 않는다).
    void retainOnly(Set<Long> pendingBots) {
        intents.keySet()
                .retainAll(pendingBots);
    }

    boolean isLive(long botId, long epoch) {
        return Optional.ofNullable(intents.get(botId))
                .filter(intent -> intent.epoch() == epoch)
                .isPresent();
    }

    // 행동 걸음을 실행하면 그 결정은 다 썼다. 다음 상태 변화에서 새로 정한다.
    void consume(long botId, long epoch) {
        if (!isLive(botId, epoch)) {
            return;
        }
        intents.remove(botId);
    }
}
