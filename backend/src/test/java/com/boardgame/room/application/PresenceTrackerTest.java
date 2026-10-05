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
        tracker.connected(1L, "s1");
        assertThat(tracker.isConnected(1L)).isTrue();

        tracker.disconnected(1L, "s1", T0);

        assertThat(tracker.isConnected(1L)).isFalse();
        assertThat(tracker.offlineFor(1L, T0.plusSeconds(61))).isEqualTo(Duration.ofSeconds(61));
    }

    @Test
    void 탭_두_개_중_하나만_끊기면_여전히_연결_중이다() {
        tracker.connected(1L, "s1");
        tracker.connected(1L, "s2");

        tracker.disconnected(1L, "s1", T0);

        assertThat(tracker.isConnected(1L)).isTrue();
        assertThat(tracker.offlineFor(1L, T0.plusSeconds(100))).isEqualTo(Duration.ZERO);
    }

    @Test
    void 다시_연결하면_끊긴_기록이_지워진다() {
        tracker.connected(1L, "s1");
        tracker.disconnected(1L, "s1", T0);

        tracker.connected(1L, "s2");

        assertThat(tracker.isConnected(1L)).isTrue();
        assertThat(tracker.offlineFor(1L, T0.plusSeconds(100))).isEqualTo(Duration.ZERO);
    }

    @Test
    void 같은_세션의_끊김이_중복되어도_다른_탭은_연결_중이다() {
        tracker.connected(1L, "s1");
        tracker.connected(1L, "s2");

        tracker.disconnected(1L, "s1", T0);
        tracker.disconnected(1L, "s1", T0.plusSeconds(5));

        assertThat(tracker.isConnected(1L)).isTrue();
    }

    @Test
    void 연결한_적_없는_세션의_끊김은_무시된다() {
        tracker.disconnected(1L, "s1", T0);

        assertThat(tracker.offlineFor(1L, T0.plusSeconds(100))).isEqualTo(Duration.ZERO);
        assertThat(tracker.isOfflineAtLeast(1L, T0.plusSeconds(100), Duration.ofSeconds(60))).isFalse();
    }

    @Test
    void 정확히_유예_시간이_지나야_기권_가능_상태가_된다() {
        tracker.connected(1L, "s1");
        tracker.disconnected(1L, "s1", T0);

        assertThat(tracker.isOfflineAtLeast(1L, T0.plusSeconds(59), Duration.ofSeconds(60))).isFalse();
        assertThat(tracker.isOfflineAtLeast(1L, T0.plusSeconds(60), Duration.ofSeconds(60))).isTrue();
    }
}
