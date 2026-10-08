package com.boardgame.room.application;

import com.boardgame.game.bot.BotMind;
import com.boardgame.room.domain.Room;
import com.boardgame.room.domain.RoomCode;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;

// 방마다 컴퓨터 상태. 예약 번호는 모든 방이 함께 쓰는 발급기에서 받아 방이 다시 만들어져도 옛 예약과 겹치지 않는다.
class BotRooms {

    private final Map<RoomCode, BotRoom> rooms = new ConcurrentHashMap<>();
    private final AtomicLong epochs = new AtomicLong();

    // 새 게임이면 마음을 새로 만든다(R20: 이전 게임의 예약은 모두 무효).
    BotRoom refresh(Room room, Supplier<Map<Long, BotMind>> minds) {
        String matchKey = room.currentGame().matchKey();
        BotRoom state = find(room.code())
                .filter(found -> found.isFor(matchKey))
                .orElseGet(() -> new BotRoom(matchKey, minds.get()));
        rooms.put(room.code(), state);
        return state;
    }

    long nextEpoch() {
        return epochs.incrementAndGet();
    }

    Optional<BotRoom> find(RoomCode code) {
        return Optional.ofNullable(rooms.get(code));
    }

    void forget(RoomCode code) {
        rooms.remove(code);
    }
}
