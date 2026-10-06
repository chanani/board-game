package com.boardgame.uno;

import static com.boardgame.uno.UnoColor.BLUE;
import static com.boardgame.uno.UnoColor.GREEN;
import static com.boardgame.uno.UnoColor.RED;
import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class CardFaceTest {

    private static final CardFace RED_7 = CardFace.number(RED, 7);
    private static final CardFace WILD = CardFace.wild(CardKind.WILD);
    private static final CardFace FOUR = CardFace.wild(CardKind.WILD_DRAW_FOUR);

    @Test
    void R3_숫자는_숫자만큼_기능은_20점_와일드는_50점() {
        assertThat(RED_7.points()).isEqualTo(7);
        assertThat(CardFace.number(BLUE, 0).points()).isZero();
        assertThat(CardFace.action(CardKind.SKIP, RED).points()).isEqualTo(20);
        assertThat(CardFace.action(CardKind.REVERSE, RED).points()).isEqualTo(20);
        assertThat(CardFace.action(CardKind.DRAW_TWO, RED).points()).isEqualTo(20);
        assertThat(WILD.points()).isEqualTo(50);
        assertThat(FOUR.points()).isEqualTo(50);
    }

    @Test
    void R8_현재_색과_같은_색이면_낼_수_있다() {
        assertThat(CardFace.number(RED, 3).matches(RED_7, RED)).isTrue();
    }

    @Test
    void R8_숫자가_같으면_다른_색도_낼_수_있다() {
        assertThat(CardFace.number(BLUE, 7).matches(RED_7, RED)).isTrue();
    }

    @Test
    void R8_같은_기능이면_색이_달라도_낼_수_있다() {
        assertThat(CardFace.action(CardKind.SKIP, BLUE).matches(CardFace.action(CardKind.SKIP, RED), RED)).isTrue();
        assertThat(CardFace.action(CardKind.SKIP, BLUE).matches(CardFace.action(CardKind.REVERSE, RED), RED)).isFalse();
        assertThat(CardFace.number(BLUE, 2).matches(CardFace.action(CardKind.DRAW_TWO, RED), RED)).isFalse();
    }

    @Test
    void R8_색도_숫자도_기능도_다르면_낼_수_없다() {
        assertThat(CardFace.number(BLUE, 3).matches(RED_7, RED)).isFalse();
    }

    @Test
    void R8_와일드는_언제나_낼_수_있다() {
        assertThat(WILD.matches(RED_7, RED)).isTrue();
        assertThat(FOUR.matches(RED_7, RED)).isTrue();
    }

    @Test
    void R8_맨_위가_와일드면_선언된_색만_본다() {
        assertThat(CardFace.number(GREEN, 2).matches(WILD, GREEN)).isTrue();
        assertThat(CardFace.number(RED, 2).matches(WILD, GREEN)).isFalse();
        assertThat(CardFace.action(CardKind.SKIP, BLUE).matches(FOUR, BLUE)).isTrue();
        assertThat(CardFace.action(CardKind.SKIP, RED).matches(FOUR, BLUE)).isFalse();
    }

    @Test
    void R8_숫자_6과_9는_다른_숫자다() {
        CardFace green6 = CardFace.number(GREEN, 6);

        assertThat(CardFace.number(BLUE, 9).matches(green6, GREEN)).isFalse();
        assertThat(CardFace.number(BLUE, 6).matches(green6, GREEN)).isTrue();
    }
}
