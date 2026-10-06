package com.boardgame.common.security;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class ReplacedSessionsTest {

    private static final Instant START = Instant.parse("2026-10-06T00:00:00Z");

    private final MutableClock clock = new MutableClock(START);
    private final ReplacedSessions replacedSessions = new ReplacedSessions(clock);

    @Test
    void 기록한_세션은_30분_동안_교체된_세션으로_본다() {
        replacedSessions.record("A", START);

        assertThat(replacedSessions.contains("A", START.plus(Duration.ofMinutes(29)))).isTrue();
        assertThat(replacedSessions.contains("B", START)).isFalse();
    }

    @Test
    void 삼십분이_지나면_교체된_세션으로_보지_않는다() {
        replacedSessions.record("A", START);

        assertThat(replacedSessions.contains("A", START.plus(Duration.ofMinutes(31)))).isFalse();
    }

    @Test
    void 시계_기준으로도_기록하고_확인한다() {
        replacedSessions.record("A");
        clock.advance(Duration.ofMinutes(10));
        assertThat(replacedSessions.contains("A")).isTrue();

        clock.advance(Duration.ofMinutes(21));
        assertThat(replacedSessions.contains("A")).isFalse();
    }

    @Test
    void 세션_ID가_없으면_교체된_세션이_아니다() {
        assertThat(replacedSessions.contains(null)).isFalse();
    }

    @Test
    void 천_개를_넘으면_가장_오래된_것부터_지운다() {
        for (int index = 0; index <= 1000; index++) {
            replacedSessions.record("S" + index, START.plusMillis(index));
        }

        assertThat(replacedSessions.contains("S0", START.plusSeconds(2))).isFalse();
        assertThat(replacedSessions.contains("S1", START.plusSeconds(2))).isTrue();
        assertThat(replacedSessions.contains("S1000", START.plusSeconds(2))).isTrue();
    }
}
