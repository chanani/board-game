package com.boardgame.room.application;

import java.time.Duration;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Component;

/**
 * 게임 시작 3-2-1 카운트다운. 방장이 시작을 누른 뒤 정해진 시간이 지나면 게임을 만든다.
 * 길이가 0이면 기다리지 않고 바로 시작한다(스프링 컨텍스트 테스트). 예약 작업은 RoomService 잠금 안에서
 * 방이 아직 그 시각에 시작하기로 되어 있는지 확인하므로, 취소된 카운트다운의 작업은 따로 지우지 않아도 된다.
 */
@Component
public class StartCountdown {

    public static final String DURATION_PROPERTY = "app.start-countdown.duration";
    private static final Logger log = LoggerFactory.getLogger(StartCountdown.class);

    private final TaskScheduler scheduler;
    private final Duration duration;

    @Autowired
    public StartCountdown(@Qualifier(TurnTimerConfig.SCHEDULER) TaskScheduler scheduler,
                          @Value("${" + DURATION_PROPERTY + ":3s}") Duration duration) {
        this.scheduler = scheduler;
        this.duration = duration;
    }

    /** 기다리지 않고 바로 시작한다. */
    public static StartCountdown immediate() {
        return new StartCountdown(null, Duration.ZERO);
    }

    public Instant startsAt(Instant now) {
        return now.plus(duration);
    }

    public boolean isImmediate() {
        return !duration.isPositive();
    }

    public void schedule(Instant startsAt, Runnable kickOff) {
        scheduler.schedule(() -> fire(kickOff), startsAt);
    }

    // 예약 스레드에서 예외가 나면 조용히 사라지므로 기록을 남긴다.
    private void fire(Runnable kickOff) {
        try {
            kickOff.run();
        } catch (RuntimeException exception) {
            log.warn("게임 시작 카운트다운 처리 실패", exception);
        }
    }
}
