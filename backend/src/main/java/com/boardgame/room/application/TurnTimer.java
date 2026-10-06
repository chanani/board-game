package com.boardgame.room.application;

import com.boardgame.room.domain.RoomCode;
import java.time.Instant;
import java.util.function.Consumer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Component;

/**
 * 방마다 행동 마감에 예약 작업 하나를 건다. 다시 걸면 이전 작업은 취소되고 판번호가 바뀐다.
 * 예약 작업은 받은 판번호를 들고 RoomService 잠금 안으로 들어가 {@link #isCurrent}로 최신인지 확인한다.
 * 그래서 취소 직전에 이미 출발한 작업도 사람의 행동과 겹쳐 적용되지 않는다.
 */
@Component
public class TurnTimer {

    private static final Logger log = LoggerFactory.getLogger(TurnTimer.class);

    private final TaskScheduler scheduler;
    private final ArmedTimers armed;

    public TurnTimer(@Qualifier(TurnTimerConfig.SCHEDULER) TaskScheduler scheduler) {
        this.scheduler = scheduler;
        this.armed = new ArmedTimers();
    }

    public void arm(RoomCode code, Instant deadline, Consumer<TimerVersion> onTimeout) {
        TimerVersion version = armed.nextVersion();
        Runnable task = () -> fire(code, version, onTimeout);
        armed.replace(code, new ArmedTimer(version, scheduler.schedule(task, deadline)));
    }

    public void cancel(RoomCode code) {
        armed.cancel(code);
    }

    public boolean isCurrent(RoomCode code, TimerVersion version) {
        return armed.isCurrent(code, version);
    }

    public boolean isArmed(RoomCode code) {
        return armed.contains(code);
    }

    // 예약 스레드에서 예외가 나면 조용히 사라지므로 기록을 남긴다.
    private void fire(RoomCode code, TimerVersion version, Consumer<TimerVersion> onTimeout) {
        try {
            onTimeout.accept(version);
        } catch (RuntimeException exception) {
            log.warn("시간 초과 자동 행동 실패: room={}", code.value(), exception);
        }
    }
}
