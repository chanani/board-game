package com.boardgame.game.turn;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class StageCountdownTest {

    private static final Instant T0 = Instant.parse("2026-10-07T00:00:00Z");
    private static final Duration LIMIT = Duration.ofSeconds(15);

    private final MutableClock clock = new MutableClock(T0);

    @Test
    void 키가_같으면_마감을_다시_재지_않는다() {
        StageCountdown<Integer> countdown = new StageCountdown<>(clock, LIMIT, 1);
        clock.advance(Duration.ofSeconds(5));

        countdown.follow(1);

        assertThat(countdown.deadline()).isEqualTo(T0.plusSeconds(15));
    }

    @Test
    void 키가_바뀌면_그때부터_다시_잰다() {
        StageCountdown<Integer> countdown = new StageCountdown<>(clock, LIMIT, 1);
        clock.advance(Duration.ofSeconds(5));

        countdown.follow(2);

        assertThat(countdown.deadline()).isEqualTo(T0.plusSeconds(20));
        assertThat(countdown.now()).isEqualTo(T0.plusSeconds(5));
    }

    @Test
    void 기다리지_않으면_마감_없이_서버_시각만_준다() {
        StageCountdown<Integer> countdown = new StageCountdown<>(clock, LIMIT, 1);

        StageTiming waiting = countdown.timing(true);
        StageTiming idle = countdown.timing(false);

        assertThat(waiting.deadline()).isEqualTo(T0.plusSeconds(15).toEpochMilli());
        assertThat(idle.deadline()).isNull();
        assertThat(idle.serverNow()).isEqualTo(T0.toEpochMilli());
    }
}
