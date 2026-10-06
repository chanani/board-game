package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.room.domain.RoomCode;
import com.boardgame.support.FakeTaskScheduler;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class TurnTimerTest {

    private static final RoomCode CODE = new RoomCode("ABCDEF");
    private static final Instant AT = Instant.parse("2026-10-06T00:00:15Z");

    private final FakeTaskScheduler scheduler = new FakeTaskScheduler();
    private final TurnTimer timer = new TurnTimer(scheduler);
    private final List<TimerVersion> fired = new ArrayList<>();

    @Test
    void 다시_걸면_이전_작업은_취소되고_이전_판번호는_최신이_아니다() {
        timer.arm(CODE, AT, fired::add);
        timer.arm(CODE, AT.plusSeconds(5), fired::add);

        scheduler.tasks().get(0).run();
        scheduler.tasks().get(1).run();

        assertThat(scheduler.tasks().get(0).isCancelled()).isTrue();
        assertThat(scheduler.latest().startTime()).isEqualTo(AT.plusSeconds(5));
        assertThat(timer.isCurrent(CODE, fired.get(0))).isFalse();
        assertThat(timer.isCurrent(CODE, fired.get(1))).isTrue();
    }

    @Test
    void 취소하면_어떤_판번호도_최신이_아니다() {
        timer.arm(CODE, AT, fired::add);
        scheduler.latest().run();

        timer.cancel(CODE);

        assertThat(scheduler.latest().isCancelled()).isTrue();
        assertThat(timer.isArmed(CODE)).isFalse();
        assertThat(timer.isCurrent(CODE, fired.get(0))).isFalse();
    }

    @Test
    void 예약_작업의_예외는_예약_스레드로_새지_않는다() {
        timer.arm(CODE, AT, version -> {
            throw new IllegalStateException("boom");
        });

        scheduler.latest().run();

        assertThat(timer.isArmed(CODE)).isTrue();
    }
}
