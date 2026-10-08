package com.boardgame.uno.bot;

import static com.boardgame.uno.bot.UnoViews.number;
import static com.boardgame.uno.bot.UnoViews.view;
import static com.boardgame.uno.bot.UnoViews.wild;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameAction;
import com.boardgame.support.FixedRandom;
import com.boardgame.uno.UnoColor;
import com.boardgame.uno.view.UnoCardView;
import org.junit.jupiter.api.Test;

class EasyUnoTest {

    private final EasyUno easy = new EasyUno();

    @Test
    void R29_낼_카드가_없으면_뽑는다() {
        UnoSight sight = view().held(number(UnoColor.BLUE, 3)).sight();

        assertThat(easy.turn(sight, new FixedRandom(99)).type()).isEqualTo("DRAW");
    }

    @Test
    void R29_낼_수_있어도_20퍼센트는_뽑는다() {
        UnoSight sight = view().playable(number(UnoColor.RED, 3), number(UnoColor.RED, 4)).sight();

        assertThat(easy.turn(sight, new FixedRandom(10)).type()).isEqualTo("DRAW");
    }

    @Test
    void R29_그_밖에는_무작위_카드를_낸다() {
        UnoCardView second = number(UnoColor.RED, 4);
        UnoSight sight = view().playable(number(UnoColor.RED, 3), second, number(UnoColor.RED, 5)).sight();

        GameAction action = easy.turn(sight, new FixedRandom(25));

        assertThat(action.type()).isEqualTo("PLAY");
        assertThat(action.cardId()).isEqualTo(second.id());
        assertThat(action.color()).isNull();
    }

    @Test
    void R29_뽑은_카드는_50퍼센트만_낸다() {
        UnoCardView card = number(UnoColor.RED, 8);
        UnoSight sight = view().held(number(UnoColor.BLUE, 1)).drawn(card).sight();

        assertThat(easy.turn(sight, new FixedRandom(30)).type()).isEqualTo("PLAY");
        assertThat(easy.turn(sight, new FixedRandom(70)).type()).isEqualTo("KEEP");
    }

    @Test
    void R29_와일드_색은_무작위() {
        UnoCardView card = wild();
        UnoSight sight = view().held(number(UnoColor.RED, 1), number(UnoColor.RED, 2)).playable(card).sight();

        GameAction action = easy.turn(sight, new FixedRandom(26));

        assertThat(action.cardId()).isEqualTo(card.id());
        assertThat(action.color()).isEqualTo("GREEN");
    }

    @Test
    void R29_한_장이_된_내_잡기_창에서_50퍼센트만_외친다() {
        assertThat(easy.call(new FixedRandom(40))).isPresent();
        assertThat(easy.call(new FixedRandom(60))).isEmpty();
    }

    @Test
    void R29_남을_잡지_않는다() {
        assertThat(easy.catchHabit()).isEmpty();
    }
}
