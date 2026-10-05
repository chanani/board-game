package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class PresenceTrackerTest {

    private static final Instant T0 = Instant.parse("2026-10-05T10:00:00Z");
    private final PresenceTracker tracker = new PresenceTracker();

    @Test
    void 연결한_적_없으면_연결_안_됨이지만_끊긴_시간은_0이다() {
        assertThat(tracker.isConnected(1L)).isFalse();
        assertThat(tracker.offlineFor(1L, T0)).isEqualTo(Duration.ZERO);
    }

    @Test
    void 끊긴_뒤_지난_시간을_계산한다() {
        tracker.connected(1L);
        assertThat(tracker.isConnected(1L)).isTrue();

        tracker.disconnected(1L, T0);

        assertThat(tracker.isConnected(1L)).isFalse();
        assertThat(tracker.offlineFor(1L, T0.plusSeconds(61))).isEqualTo(Duration.ofSeconds(61));
    }

    @Test
    void 탭_두_개_중_하나만_끊기면_여전히_연결_중이다() {
        tracker.connected(1L);
        tracker.connected(1L);

        tracker.disconnected(1L, T0);

        assertThat(tracker.isConnected(1L)).isTrue();
        assertThat(tracker.offlineFor(1L, T0.plusSeconds(100))).isEqualTo(Duration.ZERO);
    }

    @Test
    void 다시_연결하면_끊긴_기록이_지워진다() {
        tracker.connected(1L);
        tracker.disconnected(1L, T0);

        tracker.connected(1L);

        assertThat(tracker.isConnected(1L)).isTrue();
        assertThat(tracker.offlineFor(1L, T0.plusSeconds(100))).isEqualTo(Duration.ZERO);
    }
}
