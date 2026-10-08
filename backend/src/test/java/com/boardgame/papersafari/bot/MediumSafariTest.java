package com.boardgame.papersafari.bot;

import static com.boardgame.papersafari.bot.SafariViews.ME;
import static com.boardgame.papersafari.bot.SafariViews.board;
import static com.boardgame.papersafari.bot.SafariViews.fromDeck;
import static com.boardgame.papersafari.bot.SafariViews.fromDiscard;
import static com.boardgame.papersafari.bot.SafariViews.number;
import static com.boardgame.papersafari.bot.SafariViews.sight;
import static com.boardgame.papersafari.bot.SafariViews.wild;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameAction;
import com.boardgame.papersafari.TurnPhase;
import com.boardgame.papersafari.view.BoardView;
import com.boardgame.support.FixedRandom;
import org.junit.jupiter.api.Test;

class MediumSafariTest {

    private static final BoardView MINE = board(ME, number(9), number(2), number(8), null, number(2), null);
    private static final GameAction FROM_DISCARD = new GameAction("DRAW_DISCARD", null, null);
    private static final GameAction FROM_DECK = new GameAction("DRAW_DECK", null, null);
    private final MediumSafari medium = new MediumSafari();

    @Test
    void R26_버린_더미_카드가_3점_이하이거나_와일드거나_짝을_만들면_가져온다() {
        FixedRandom random = new FixedRandom(0);

        assertThat(medium.draw(sight(TurnPhase.DRAW, number(3), null, MINE), random)).isEqualTo(FROM_DISCARD);
        assertThat(medium.draw(sight(TurnPhase.DRAW, wild(), null, MINE), random)).isEqualTo(FROM_DISCARD);
        assertThat(medium.draw(sight(TurnPhase.DRAW, number(9), null, MINE), random)).isEqualTo(FROM_DISCARD);
        assertThat(medium.draw(sight(TurnPhase.DRAW, number(7), null, MINE), random)).isEqualTo(FROM_DECK);
        assertThat(medium.draw(sight(TurnPhase.DRAW, number(2), null, MINE), random)).isEqualTo(FROM_DISCARD);
        assertThat(medium.draw(sight(TurnPhase.DRAW, null, null, MINE), random)).isEqualTo(FROM_DECK);
    }

    @Test
    void R26_이미_짝인_열과_같은_카드는_짝을_새로_만들지_않는다() {
        BoardView paired = board(ME, number(9), number(6), number(8), null, number(6), null);

        assertThat(medium.draw(sight(TurnPhase.DRAW, number(6), null, paired), new FixedRandom(0))).isEqualTo(FROM_DECK);
    }

    @Test
    void R26_가져온_카드는_점수가_가장_많이_줄어드는_칸에_넣는다() {
        assertThat(medium.place(sight(TurnPhase.PLACE, null, fromDeck(number(1)), MINE), new FixedRandom(0)))
                .isEqualTo(new GameAction("SWAP", 0, 0));
    }

    @Test
    void R26_줄어드는_칸이_없으면_덱_카드는_버리고_버린_더미_카드는_가장_손해가_적은_칸에_넣는다() {
        BoardView low = board(ME, number(1), number(2), number(0), number(1), number(2), number(0));

        assertThat(medium.place(sight(TurnPhase.PLACE, null, fromDeck(number(9)), low), new FixedRandom(0)))
                .isEqualTo(new GameAction("DISCARD", null, null));
        assertThat(medium.place(sight(TurnPhase.PLACE, null, fromDiscard(number(9)), low), new FixedRandom(0)))
                .isEqualTo(new GameAction("SWAP", 2, 0));
    }

    @Test
    void R26_코끼리_엿보기는_같은_열_반대쪽을_아는_뒷면_칸이_먼저다() {
        BoardView mine = board(ME, number(5), null, null, null, null, null);

        assertThat(medium.peek(sight(TurnPhase.PEEK, null, null, mine), new FixedRandom(3)))
                .isEqualTo(new GameAction("PEEK", 0, 1));
    }
}
