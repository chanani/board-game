package com.boardgame.uno.bot;

import static com.boardgame.uno.bot.UnoViews.action;
import static com.boardgame.uno.bot.UnoViews.four;
import static com.boardgame.uno.bot.UnoViews.number;
import static com.boardgame.uno.bot.UnoViews.view;
import static com.boardgame.uno.bot.UnoViews.wild;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameAction;
import com.boardgame.support.FixedRandom;
import com.boardgame.uno.CardKind;
import com.boardgame.uno.Direction;
import com.boardgame.uno.UnoColor;
import com.boardgame.uno.view.UnoCardView;
import java.time.Duration;
import org.junit.jupiter.api.Test;

class HardUnoTest {

    private final HardUno hard = new HardUno();

    @Test
    void R31_다음_사람이_2장_이하면_공격_카드를_먼저() {
        UnoCardView drawTwo = action(UnoColor.RED, CardKind.DRAW_TWO);
        UnoCardView skip = action(UnoColor.RED, CardKind.SKIP);
        UnoViews table = view().playable(number(UnoColor.RED, 3), skip, drawTwo, number(UnoColor.RED, 4));

        assertThat(hard.turn(table.left(2).sight(), new FixedRandom(0)).cardId()).isEqualTo(drawTwo.id());
        assertThat(hard.turn(table.left(7).sight(), new FixedRandom(0)).cardId()).isNotEqualTo(drawTwo.id());
    }

    @Test
    void R31_다음_사람은_차례_방향으로_센다() {
        UnoCardView skip = action(UnoColor.RED, CardKind.SKIP);
        UnoViews table = view().playable(number(UnoColor.RED, 3), skip).left(7).right(1);

        assertThat(hard.turn(table.sight(), new FixedRandom(0)).cardId()).isNotEqualTo(skip.id());
        assertThat(hard.turn(table.direction(Direction.COUNTER_CLOCKWISE).sight(), new FixedRandom(0)).cardId())
                .isEqualTo(skip.id());
    }

    @Test
    void R31_다음_사람이_2장_이하면_4도_공격으로_낸다() {
        UnoCardView redThree = number(UnoColor.RED, 3);
        UnoCardView attack = four();
        UnoViews table = view().playable(redThree, attack).held(number(UnoColor.BLUE, 1));

        assertThat(hard.turn(table.left(2).sight(), new FixedRandom(0)).cardId()).isEqualTo(attack.id());
        assertThat(hard.turn(table.left(5).sight(), new FixedRandom(0)).cardId()).isEqualTo(redThree.id());
    }

    @Test
    void R31_뽑은_카드는_낸다() {
        UnoViews table = view().held(number(UnoColor.RED, 1), number(UnoColor.BLUE, 2)).drawn(four());

        assertThat(hard.turn(table.left(5).sight(), new FixedRandom(0)).type()).isEqualTo("PLAY");
    }

    @Test
    void R31_4는_손이_4장_이상이면_먼저_3장이면_아낀다() {
        UnoCardView early4 = four();
        UnoCardView yellow = number(UnoColor.YELLOW, 5);
        UnoSight four = view().color(UnoColor.RED)
                .playable(early4)
                .playable(action(UnoColor.YELLOW, CardKind.SKIP))
                .held(yellow, number(UnoColor.BLUE, 1))
                .sight();
        UnoSight three = view().color(UnoColor.RED)
                .playable(four())
                .playable(yellow)
                .held(number(UnoColor.BLUE, 1))
                .sight();

        GameAction early = hard.turn(four, new FixedRandom(0));
        GameAction saved = hard.turn(three, new FixedRandom(0));

        assertThat(early.cardId()).isEqualTo(early4.id());
        assertThat(early.color()).isEqualTo("YELLOW");
        assertThat(saved.cardId()).isEqualTo(yellow.id());
    }

    @Test
    void R31_같은_색이_이어지는_카드를_고른다() {
        UnoCardView redFive = number(UnoColor.RED, 5);
        UnoCardView blueFive = number(UnoColor.BLUE, 5);
        UnoSight sight = view().color(UnoColor.RED)
                .playable(redFive, blueFive, wild())
                .held(number(UnoColor.BLUE, 1), number(UnoColor.BLUE, 7), number(UnoColor.GREEN, 2))
                .sight();

        assertThat(hard.turn(sight, new FixedRandom(0)).cardId()).isEqualTo(blueFive.id());
    }

    @Test
    void R31_와일드는_다른_카드가_없을_때_4는_그다음() {
        UnoCardView wildCard = wild();
        UnoSight sight = view().playable(four(), wildCard).held(number(UnoColor.BLUE, 1)).sight();

        assertThat(hard.turn(sight, new FixedRandom(0)).cardId()).isEqualTo(wildCard.id());
    }

    @Test
    void R31_우노를_항상_0_3초에서_0_7초_만에_외친다() {
        assertThat(hard.call(new FixedRandom(99))).contains(Duration.ofMillis(399));
        assertThat(hard.call(new FixedRandom(400))).contains(Duration.ofMillis(700));
    }

    @Test
    void R31_잡기는_반드시_0_8초에서_1_5초() {
        assertThat(hard.catchHabit()).contains(new CatchHabit(100, 800, 1500));
    }
}
