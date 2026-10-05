package com.boardgame.record.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.ResultType;
import org.junit.jupiter.api.Test;

class ResultCountsTest {

    @Test
    void 결과를_더하면_새_집계가_된다() {
        ResultCounts counts = ResultCounts.empty()
                .add(ResultType.WIN)
                .add(ResultType.WIN)
                .add(ResultType.DRAW)
                .add(ResultType.LOSE);

        assertThat(counts.wins()).isEqualTo(2);
        assertThat(counts.draws()).isEqualTo(1);
        assertThat(counts.losses()).isEqualTo(1);
        assertThat(counts.total()).isEqualTo(4);
        assertThat(counts.winRate()).isEqualTo(0.5);
    }

    @Test
    void 기록이_없으면_승률은_null이다() {
        assertThat(ResultCounts.empty().winRate()).isNull();
    }

    @Test
    void 더해도_원래_집계는_바뀌지_않는다() {
        ResultCounts empty = ResultCounts.empty();

        empty.add(ResultType.WIN);

        assertThat(empty.total()).isZero();
    }
}
