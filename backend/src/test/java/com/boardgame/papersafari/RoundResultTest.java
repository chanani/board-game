package com.boardgame.papersafari;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.papersafari.view.PlayerResultView;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class RoundResultTest {

    private final PlayerId a = new PlayerId(1L);
    private final PlayerId b = new PlayerId(2L);
    private final PlayerId c = new PlayerId(3L);
    private final PlayerId d = new PlayerId(4L);
    private final List<PlayerId> order = List.of(a, b, c, d);

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
    void 최저점을_나눈_사람끼리만_무승부이고_나머지는_패배다() {
        RoundResult result = RoundResult.of(scores(5, 5, 10));

        assertThat(result.winner()).isEmpty();
        assertThat(result.isDraw()).isTrue();
        assertThat(result.outcomeOf(a)).isEqualTo(RoundOutcome.DRAW);
        assertThat(result.outcomeOf(b)).isEqualTo(RoundOutcome.DRAW);
        assertThat(result.outcomeOf(c)).isEqualTo(RoundOutcome.LOSE);
    }

    @Test
    void 두_명이_같은_점수면_둘_다_무승부다() {
        RoundResult result = RoundResult.of(scores(7, 7));

        assertThat(result.winner()).isEmpty();
        assertThat(result.outcomeOf(a)).isEqualTo(RoundOutcome.DRAW);
        assertThat(result.outcomeOf(b)).isEqualTo(RoundOutcome.DRAW);
    }

    @Test
    void 네_명_중_두_명이_최저점을_나누면_그_둘만_무승부다() {
        RoundResult result = RoundResult.of(scores(12, 3, 20, 3));

        assertThat(result.winner()).isEmpty();
        assertThat(result.outcomeOf(a)).isEqualTo(RoundOutcome.LOSE);
        assertThat(result.outcomeOf(b)).isEqualTo(RoundOutcome.DRAW);
        assertThat(result.outcomeOf(c)).isEqualTo(RoundOutcome.LOSE);
        assertThat(result.outcomeOf(d)).isEqualTo(RoundOutcome.DRAW);
        assertThat(result.toView().players())
                .extracting(PlayerResultView::outcome)
                .containsExactly(RoundOutcome.LOSE, RoundOutcome.DRAW, RoundOutcome.LOSE, RoundOutcome.DRAW);
    }

    @Test
    void 음수_점수도_비교된다() {
        RoundResult result = RoundResult.of(scores(-2, 0, 1));

        assertThat(result.winner()).contains(a);
    }

    @Test
    void 결과의_참가자_목록을_순서대로_돌려준다() {
        RoundResult result = RoundResult.of(scores(5, 12, 8));

        assertThat(result.players()).containsExactly(a, b, c);
    }

    private Map<PlayerId, Score> scores(int... values) {
        Map<PlayerId, Score> scores = new LinkedHashMap<>();
        IntStream.range(0, values.length).forEach(index -> scores.put(order.get(index), new Score(values[index])));
        return scores;
    }
}
