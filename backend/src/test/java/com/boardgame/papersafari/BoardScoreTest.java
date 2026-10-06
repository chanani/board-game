package com.boardgame.papersafari;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class BoardScoreTest {

    private static final Card W = Card.wild();

    private static BoardScore scoreOf(Card... cards) {
        Board board = Board.deal(List.of(cards));
        board.revealAll();
        return BoardScore.of(board);
    }

    private static List<Score> scores(int... values) {
        return java.util.Arrays.stream(values).mapToObj(Score::new).toList();
    }

    @Test
    void 윗줄_여우_와일드_와일드는_모두_여우로_친다() {
        BoardScore score = scoreOf(Card.fox(), W, W, Card.number(5), Card.number(6), Card.number(7));

        assertThat(score.columns()).isEqualTo(scores(3, 4, 5));
        assertThat(score.total()).isEqualTo(new Score(12));
    }

    @Test
    void 와일드는_양옆_중_더_낮은_값을_고른다() {
        BoardScore score = scoreOf(Card.number(5), W, Card.number(9), Card.number(1), Card.number(1), Card.number(1));

        assertThat(score.columns()).isEqualTo(scores(6, 6, 10));
    }

    @Test
    void 가장자리_와일드는_하나뿐인_이웃을_복사한다() {
        BoardScore score = scoreOf(W, Card.number(4), Card.number(4), Card.number(1), Card.number(1), Card.number(1));

        assertThat(score.columns()).isEqualTo(scores(5, 5, 5));
        BoardScore right = scoreOf(Card.number(8), Card.number(8), W, Card.number(1), Card.number(1), Card.number(1));
        assertThat(right.columns()).isEqualTo(scores(9, 9, 9));
    }

    @Test
    void 한_줄이_모두_와일드면_0이다() {
        BoardScore score = scoreOf(W, W, W, Card.number(3), Card.number(4), Card.number(5));

        assertThat(score.columns()).isEqualTo(scores(3, 4, 5));
    }

    @Test
    void 여우_두_장은_0이다() {
        BoardScore score = scoreOf(Card.fox(), Card.number(1), Card.number(2), Card.fox(), Card.number(3), Card.number(4));

        assertThat(score.columns().get(0)).isEqualTo(Score.ZERO);
    }

    @Test
    void 코끼리와_타잔은_0이다() {
        BoardScore score = scoreOf(Card.elephant(), Card.number(1), Card.number(2), Card.tarzan(), Card.number(3), Card.number(4));

        assertThat(score.columns().get(0)).isEqualTo(Score.ZERO);
    }

    @Test
    void 와일드가_없으면_이전과_같다() {
        BoardScore score = scoreOf(Card.number(3), Card.number(7), Card.number(2), Card.number(5), Card.number(7), Card.fox());

        assertThat(score.columns()).isEqualTo(scores(8, 0, 0));
        assertThat(score.total()).isEqualTo(new Score(8));
    }

    @Test
    void 복사한_값이_같은_열의_짝과_맞으면_그_열은_0이다() {
        BoardScore score = scoreOf(Card.number(9), W, Card.number(2), Card.number(1), Card.number(9), Card.number(3));

        assertThat(score.columns()).isEqualTo(scores(10, 0, 5));
    }

    @Test
    void 와일드_연쇄는_이웃_와일드가_정한_값을_따른다() {
        BoardScore score = scoreOf(W, W, Card.number(0), Card.number(7), Card.number(7), Card.number(7));

        assertThat(score.columns()).isEqualTo(scores(7, 7, 7));
    }
}
