package com.boardgame.uno.bot;

import static com.boardgame.uno.bot.UnoViews.LEFT;
import static com.boardgame.uno.bot.UnoViews.action;
import static com.boardgame.uno.bot.UnoViews.four;
import static com.boardgame.uno.bot.UnoViews.number;
import static com.boardgame.uno.bot.UnoViews.view;
import static com.boardgame.uno.bot.UnoViews.wild;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameAction;
import com.boardgame.support.FixedRandom;
import com.boardgame.uno.CardKind;
import com.boardgame.uno.UnoColor;
import com.boardgame.uno.view.UnoCardView;
import org.junit.jupiter.api.Test;

class MediumUnoTest {

    private final MediumUno medium = new MediumUno();

    @Test
    void R30_숫자를_먼저_내고_그중_가장_많이_가진_색() {
        UnoCardView blueThree = number(UnoColor.BLUE, 3);
        UnoSight sight = view().color(UnoColor.BLUE)
                .playable(number(UnoColor.RED, 5), blueThree, number(UnoColor.BLUE, 7),
                        action(UnoColor.BLUE, CardKind.SKIP), wild())
                .sight();

        GameAction action = medium.turn(sight, new FixedRandom(0));

        assertThat(action.cardId()).isEqualTo(blueThree.id());
    }

    @Test
    void R30_기능_카드는_숫자_다음_와일드보다_먼저() {
        UnoCardView skip = action(UnoColor.RED, CardKind.SKIP);
        UnoSight sight = view().playable(wild(), four(), skip).sight();

        assertThat(medium.turn(sight, new FixedRandom(0)).cardId()).isEqualTo(skip.id());
    }

    @Test
    void R30_와일드는_다른_카드가_없을_때만_색은_가장_많이_가진_색() {
        UnoCardView card = wild();
        UnoSight sight = view()
                .held(number(UnoColor.BLUE, 1), number(UnoColor.YELLOW, 2), number(UnoColor.YELLOW, 3))
                .playable(card)
                .sight();

        GameAction action = medium.turn(sight, new FixedRandom(0));

        assertThat(action.cardId()).isEqualTo(card.id());
        assertThat(action.color()).isEqualTo("YELLOW");
    }

    @Test
    void R30_뽑은_카드는_낸다() {
        UnoCardView card = number(UnoColor.RED, 8);
        UnoSight sight = view().held(number(UnoColor.BLUE, 1)).drawn(card).sight();

        GameAction action = medium.turn(sight, new FixedRandom(99));

        assertThat(action.type()).isEqualTo("PLAY");
        assertThat(action.cardId()).isEqualTo(card.id());
    }

    @Test
    void R30_우노를_90퍼센트_외친다() {
        UnoSight sight = view().playable(number(UnoColor.RED, 3)).held(number(UnoColor.BLUE, 4)).canCall().sight();

        assertThat(medium.turn(sight, new FixedRandom(80)).type()).isEqualTo("CALL_UNO");
        assertThat(medium.turn(sight, new FixedRandom(95)).type()).isEqualTo("PLAY");
    }

    @Test
    void R30_도전은_5장_이상일_때_30퍼센트() {
        UnoSight many = view().held(number(UnoColor.BLUE, 1)).challenge(LEFT, UnoColor.RED).left(5).sight();
        UnoSight few = view().held(number(UnoColor.BLUE, 1)).challenge(LEFT, UnoColor.RED).left(4).sight();

        assertThat(medium.turn(many, new FixedRandom(20)).type()).isEqualTo("CHALLENGE");
        assertThat(medium.turn(many, new FixedRandom(40)).type()).isEqualTo("ACCEPT");
        assertThat(medium.turn(few, new FixedRandom(0)).type()).isEqualTo("ACCEPT");
    }

    @Test
    void R30_잡기는_30퍼센트_1초에서_3초() {
        assertThat(medium.catchHabit()).contains(new CatchHabit(30, 1000, 3000));
    }
}
