package com.boardgame.room.application;

import com.boardgame.room.domain.RoomCode;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;

// 방마다 걸려 있는 예약 작업 하나와, 판번호 발급기.
class ArmedTimers {

    private final Map<RoomCode, ArmedTimer> timers = new ConcurrentHashMap<>();
    private final AtomicLong versions = new AtomicLong();

    TimerVersion nextVersion() {
        return new TimerVersion(versions.incrementAndGet());
    }

    void replace(RoomCode code, ArmedTimer timer) {
        Optional.ofNullable(timers.put(code, timer)).ifPresent(ArmedTimer::cancel);
    }

    void cancel(RoomCode code) {
        Optional.ofNullable(timers.remove(code)).ifPresent(ArmedTimer::cancel);
    }

    boolean isCurrent(RoomCode code, TimerVersion version) {
        return Optional.ofNullable(timers.get(code))
                .filter(timer -> timer.is(version))
                .isPresent();
    }

    boolean contains(RoomCode code) {
        return timers.containsKey(code);
    }
}
