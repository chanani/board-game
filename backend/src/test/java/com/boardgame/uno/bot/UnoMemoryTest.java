package com.boardgame.uno.bot;

import static com.boardgame.uno.bot.UnoViews.LEFT;
import static com.boardgame.uno.bot.UnoViews.RIGHT;
import static com.boardgame.uno.bot.UnoViews.event;
import static com.boardgame.uno.bot.UnoViews.number;
import static com.boardgame.uno.bot.UnoViews.penalty;
import static com.boardgame.uno.bot.UnoViews.view;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.uno.UnoColor;
import com.boardgame.uno.UnoEventType;
import org.junit.jupiter.api.Test;

class UnoMemoryTest {

    private final UnoMemory memory = new UnoMemory();

    @Test
    void R31_뽑은_사람과_그때의_색을_기억한다() {
        memory.observe(view().color(UnoColor.GREEN).events(event(3, UnoEventType.DRAW, LEFT, null, null)).sight());

        assertThat(memory.missed(LEFT, UnoColor.GREEN)).isTrue();
        assertThat(memory.missed(LEFT, UnoColor.RED)).isFalse();
        assertThat(memory.missed(RIGHT, UnoColor.GREEN)).isFalse();
    }

    @Test
    void R31_벌칙으로_카드를_받으면_잊는다() {
        memory.observe(view().color(UnoColor.GREEN).events(event(3, UnoEventType.DRAW, LEFT, null, null)).sight());
        memory.observe(view().color(UnoColor.GREEN).events(penalty(4, LEFT)).sight());

        assertThat(memory.missed(LEFT, UnoColor.GREEN)).isFalse();
    }

    @Test
    void R31_그_색을_내면_잊는다() {
        memory.observe(view().color(UnoColor.GREEN).events(event(3, UnoEventType.DRAW, LEFT, null, null)).sight());
        memory.observe(view().color(UnoColor.GREEN)
                .events(event(4, UnoEventType.PLAY, LEFT, null, number(UnoColor.GREEN, 2)))
                .sight());

        assertThat(memory.missed(LEFT, UnoColor.GREEN)).isFalse();
    }

    @Test
    void R31_같은_순번은_두_번_봐도_한_번만_읽는다() {
        memory.observe(view().color(UnoColor.GREEN).events(event(3, UnoEventType.DRAW, LEFT, null, null)).sight());
        memory.observe(view().color(UnoColor.GREEN).events(penalty(4, LEFT)).sight());
        memory.observe(view().color(UnoColor.BLUE).events(event(3, UnoEventType.DRAW, LEFT, null, null)).sight());

        assertThat(memory.missed(LEFT, UnoColor.GREEN)).isFalse();
        assertThat(memory.missed(LEFT, UnoColor.BLUE)).isFalse();
    }
}
