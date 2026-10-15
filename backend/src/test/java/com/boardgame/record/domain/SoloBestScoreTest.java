package com.boardgame.record.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameType;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class SoloBestScoreTest {

    private static final Instant T1 = Instant.parse("2026-10-15T01:00:00Z");
    private static final Instant T2 = Instant.parse("2026-10-15T02:00:00Z");

    @Test
    void S6_처음_기록은_그_점수이고_더_높은_점수만_최고_점수를_바꾼다() {
        SoloBestScore best = SoloBestScore.first(7L, GameType.FRUIT_STACK, 120, T1);

        assertThat(best.offer(80, T2)).isFalse();
        assertThat(best.offer(120, T2)).isFalse();
        assertThat(best.score()).isEqualTo(120);
        assertThat(best.achievedAt()).isEqualTo(T1);

        assertThat(best.offer(121, T2)).isTrue();
        assertThat(best.score()).isEqualTo(121);
        assertThat(best.achievedAt()).isEqualTo(T2);
        assertThat(best.memberId()).isEqualTo(7L);
        assertThat(best.gameType()).isEqualTo(GameType.FRUIT_STACK);
    }
}
