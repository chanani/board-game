package com.boardgame.room.application;

import com.boardgame.game.PendingKind;
import com.boardgame.game.bot.BotMind;
import com.boardgame.room.domain.Room;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

// 방 하나의 컴퓨터 상태: 이 게임(matchKey)의 컴퓨터별 마음과 살아 있는 결정.
class BotRoom {

    private static final Logger log = LoggerFactory.getLogger(BotRoom.class);

    private final String matchKey;
    private final Map<Long, BotMind> minds;
    private final BotIntents intents = new BotIntents();

    BotRoom(String matchKey, Map<Long, BotMind> minds) {
        this.matchKey = matchKey;
        this.minds = Map.copyOf(minds);
    }

    boolean isFor(String key) {
        return matchKey.equals(key);
    }

    Optional<BotMind> mindOf(long botId) {
        return Optional.ofNullable(minds.get(botId));
    }

    boolean holds(long botId, PendingKind kind, Object view) {
        return intents.holds(botId, kind, view);
    }

    void hold(long botId, BotIntent intent) {
        intents.hold(botId, intent);
    }

    void retainOnly(Set<Long> pendingBots) {
        intents.retainOnly(pendingBots);
    }

    boolean isLive(long botId, long epoch) {
        return intents.isLive(botId, epoch);
    }

    void consume(long botId, long epoch) {
        intents.consume(botId, epoch);
    }

    // R16: 컴퓨터마다 자기 자리 화면만 본다. 한 컴퓨터의 실패가 다른 컴퓨터나 사람의 요청을 막지 않는다.
    void observe(Room room) {
        minds.forEach((botId, mind) -> observeSafely(room, botId, mind));
    }

    private static void observeSafely(Room room, long botId, BotMind mind) {
        try {
            room.viewFor(botId)
                    .ifPresent(mind::observe);
        } catch (RuntimeException exception) {
            log.warn("컴퓨터 관찰 실패: room={}, bot={}", room.codeValue(), botId, exception);
        }
    }
}
