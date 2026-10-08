package com.boardgame.room.application;

import com.boardgame.game.bot.BotMind;
import com.boardgame.room.domain.Room;
import java.util.Map;
import java.util.Optional;

// 방 하나의 컴퓨터 상태: 이 게임(matchKey)의 컴퓨터별 마음과 마지막 상태 번호.
class BotRoom {

    private final String matchKey;
    private final Map<Long, BotMind> minds;
    private long epoch;

    BotRoom(String matchKey, Map<Long, BotMind> minds) {
        this.matchKey = matchKey;
        this.minds = Map.copyOf(minds);
    }

    boolean isFor(String key) {
        return matchKey.equals(key);
    }

    void advance(long next) {
        epoch = next;
    }

    long epoch() {
        return epoch;
    }

    boolean isAt(long value) {
        return epoch == value;
    }

    Optional<BotMind> mindOf(long botId) {
        return Optional.ofNullable(minds.get(botId));
    }

    // R16: 컴퓨터마다 자기 자리 화면만 본다.
    void observe(Room room) {
        minds.forEach((botId, mind) -> room.viewFor(botId).ifPresent(mind::observe));
    }
}
