package com.boardgame.uno;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static com.boardgame.uno.UnoFixtures.num;
import static com.boardgame.uno.UnoFixtures.skip;
import static com.boardgame.uno.UnoFixtures.wild;
import static com.boardgame.uno.UnoFixtures.wildFour;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import java.util.List;
import org.junit.jupiter.api.Test;

class HandTest {

    @Test
    void R11_현재_색_카드를_갖고_있는지_안다_와일드는_색_카드가_아니다() {
        Hand hand = new Hand(List.of(wild(0), num(UnoColor.RED, 5)));

        assertThat(hand.holdsColor(UnoColor.RED)).isTrue();
        assertThat(hand.holdsColor(UnoColor.GREEN)).isFalse();
        assertThat(new Hand(List.of(wild(0), wildFour(0))).holdsColor(UnoColor.RED)).isFalse();
    }

    @Test
    void R40_가장_많은_색을_고르고_같으면_빨강_노랑_초록_파랑_순이다() {
        assertThat(new Hand(List.of(num(UnoColor.GREEN, 1), num(UnoColor.GREEN, 2), num(UnoColor.BLUE, 3))).mostHeldColor()).isEqualTo(UnoColor.GREEN);
        assertThat(new Hand(List.of(num(UnoColor.YELLOW, 1), num(UnoColor.BLUE, 2))).mostHeldColor()).isEqualTo(UnoColor.YELLOW);
        assertThat(new Hand(List.of(num(UnoColor.BLUE, 1), num(UnoColor.RED, 2))).mostHeldColor()).isEqualTo(UnoColor.RED);
    }

    @Test
    void R40_색_카드가_없으면_빨강이다() {
        assertThat(new Hand(List.of(wild(0), wildFour(0))).mostHeldColor()).isEqualTo(UnoColor.RED);
    }

    @Test
    void R3_손패_점수를_더한다() {
        Hand hand = new Hand(List.of(num(UnoColor.RED, 7), skip(UnoColor.BLUE), wild(0)));

        assertThat(hand.points()).isEqualTo(new UnoPoints(77));
    }

    @Test
    void 손에_없는_카드를_꺼내면_UNO_CARD_NOT_IN_HAND() {
        Hand hand = new Hand(List.of(num(UnoColor.RED, 7)));

        assertError(() -> hand.take(new CardId(99)), ErrorCode.UNO_CARD_NOT_IN_HAND);
    }
}
