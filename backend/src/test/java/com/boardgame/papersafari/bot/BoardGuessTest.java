package com.boardgame.papersafari.bot;

import static com.boardgame.papersafari.bot.SafariViews.ME;
import static com.boardgame.papersafari.bot.SafariViews.board;
import static com.boardgame.papersafari.bot.SafariViews.number;
import static com.boardgame.papersafari.bot.SafariViews.wild;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import org.junit.jupiter.api.Test;

class BoardGuessTest {

    @Test
    void R26_아는_카드는_그_값_같은_열_짝은_0점_모르는_칸은_평균이다() {
        BoardGuess known = BoardGuess.of(board(ME, number(1), number(2), number(3), number(1), number(5), number(6)), 4.5);
        BoardGuess hidden = BoardGuess.of(board(ME, number(1), number(2), number(3), null, number(5), number(6)), 4.5);

        assertThat(known.total()).isCloseTo(16.0, within(1e-9));
        assertThat(hidden.total()).isCloseTo(1 + 4.5 + 7 + 9, within(1e-9));
    }

    @Test
    void R26_와일드는_같은_줄_이웃을_복사하는_가장_낮은_해석이다() {
        BoardGuess guess = BoardGuess.of(board(ME, wild(), number(4), number(9), number(4), number(0), number(1)), 4.5);

        assertThat(guess.total()).isCloseTo(0 + 4 + 10, within(1e-9));
    }

    @Test
    void 칸을_바꾼_어림은_원래_판을_바꾸지_않는다() {
        BoardGuess guess = BoardGuess.of(board(ME, number(9), number(2), number(8), null, number(2), null), 4.5);

        BoardGuess changed = guess.with(SafariViews.sight(com.boardgame.papersafari.TurnPhase.PLACE, null, null,
                board(ME, number(9), number(2), number(8), null, number(2), null)).mySlot(0, 0), number(1));

        assertThat(changed.total()).isCloseTo(guess.total() - 8, within(1e-9));
        assertThat(guess.worthAt(SafariViews.sight(com.boardgame.papersafari.TurnPhase.PLACE, null, null,
                board(ME, number(9), number(2), number(8), null, number(2), null)).mySlot(0, 1))).isEqualTo(4.5);
    }
}
