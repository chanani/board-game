package com.boardgame.papersafari;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ColumnScoreTest {

    @Test
    void 다른_숫자면_두_값을_더한다() {
        assertThat(ColumnScore.of(Card.number(3), Card.number(5))).isEqualTo(new Score(8));
        assertThat(ColumnScore.of(Card.fox(), Card.number(4))).isEqualTo(new Score(2));
        assertThat(ColumnScore.of(Card.elephant(), Card.number(9))).isEqualTo(new Score(19));
    }

    @Test
    void 같은_숫자면_0점이다() {
        assertThat(ColumnScore.of(Card.number(7), Card.number(7))).isEqualTo(Score.ZERO);
        assertThat(ColumnScore.of(Card.elephant(), Card.tarzan())).isEqualTo(Score.ZERO);
    }

    @Test
    void 여우_두_장도_같은_숫자라_0점이다() {
        assertThat(ColumnScore.of(Card.fox(), Card.fox())).isEqualTo(Score.ZERO);
    }

    @Test
    void 와일드가_하나라도_있으면_0점이다() {
        assertThat(ColumnScore.of(Card.wild(), Card.number(9))).isEqualTo(Score.ZERO);
        assertThat(ColumnScore.of(Card.number(9), Card.wild())).isEqualTo(Score.ZERO);
        assertThat(ColumnScore.of(Card.wild(), Card.wild())).isEqualTo(Score.ZERO);
    }
}
