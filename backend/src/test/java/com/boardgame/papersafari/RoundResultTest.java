package com.boardgame.papersafari;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class RoundResultTest {

    private final PlayerId a = new PlayerId(1L);
    private final PlayerId b = new PlayerId(2L);
    private final PlayerId c = new PlayerId(3L);

    @Test
    void 최저점_단독이면_그_사람이_라운드_승자다() {
        RoundResult result = RoundResult.of(scores(5, 12, 8));

        assertThat(result.winner()).contains(a);
        assertThat(result.isDraw()).isFalse();
        assertThat(result.outcomeOf(a)).isEqualTo(RoundOutcome.WIN);
        assertThat(result.outcomeOf(b)).isEqualTo(RoundOutcome.LOSE);
        assertThat(result.scoreOf(c)).isEqualTo(new Score(8));
    }

    @Test
    void 최저점이_같으면_무승부이고_동점자는_무_나머지는_패다() {
        RoundResult result = RoundResult.of(scores(4, 4, 9));

        assertThat(result.winner()).isEmpty();
        assertThat(result.isDraw()).isTrue();
        assertThat(result.outcomeOf(a)).isEqualTo(RoundOutcome.DRAW);
        assertThat(result.outcomeOf(b)).isEqualTo(RoundOutcome.DRAW);
        assertThat(result.outcomeOf(c)).isEqualTo(RoundOutcome.LOSE);
    }

    @Test
    void 음수_점수도_비교된다() {
        RoundResult result = RoundResult.of(scores(-2, 0, 1));

        assertThat(result.winner()).contains(a);
    }

    private Map<PlayerId, Score> scores(int first, int second, int third) {
        Map<PlayerId, Score> scores = new LinkedHashMap<>();
        scores.put(a, new Score(first));
        scores.put(b, new Score(second));
        scores.put(c, new Score(third));
        return scores;
    }
}
