package com.boardgame.record.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameType;
import com.boardgame.game.ResultType;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class MemberGameStatTest {

    @Test
    void 판_결과와_라운드_결과를_따로_집계한다() {
        MemberGameStat stat = MemberGameStat.empty(1L, GameType.PAPER_SAFARI);

        stat.recordMatch(ResultType.WIN);
        stat.recordRound(ResultType.WIN, 3);
        stat.recordRound(ResultType.DRAW, 10);
        stat.recordRound(ResultType.LOSE, 20);

        assertThat(stat.memberId()).isEqualTo(1L);
        assertThat(stat.gameType()).isEqualTo(GameType.PAPER_SAFARI);
        assertThat(stat.matches().wins()).isEqualTo(1);
        assertThat(stat.matches().winRate()).isEqualTo(1.0);
        assertThat(stat.rounds().counts().total()).isEqualTo(3);
        assertThat(stat.rounds().scoreSum()).isEqualTo(33);
        assertThat(stat.rounds().averageScore()).isEqualTo(11.0);
        assertThat(stat.rounds().winRate()).isEqualTo(1.0 / 3);
    }

    @Test
    void 라운드가_없으면_평균_점수는_null이다() {
        MemberGameStat stat = MemberGameStat.empty(1L, GameType.PAPER_SAFARI);

        assertThat(stat.rounds().averageScore()).isNull();
        assertThat(stat.rounds().winRate()).isNull();
    }

    @Test
    void 다섯_판_이상이어야_순위표에_오른다() {
        MemberGameStat stat = MemberGameStat.empty(1L, GameType.PAPER_SAFARI);
        IntStream.range(0, 4).forEach(index -> stat.recordMatch(ResultType.LOSE));
        assertThat(stat.isRanked()).isFalse();

        stat.recordMatch(ResultType.DRAW);

        assertThat(stat.isRanked()).isTrue();
    }
}
