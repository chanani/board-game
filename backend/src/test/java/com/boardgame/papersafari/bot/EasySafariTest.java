package com.boardgame.papersafari.bot;

import static com.boardgame.papersafari.bot.SafariViews.ME;
import static com.boardgame.papersafari.bot.SafariViews.board;
import static com.boardgame.papersafari.bot.SafariViews.fromDeck;
import static com.boardgame.papersafari.bot.SafariViews.fromDiscard;
import static com.boardgame.papersafari.bot.SafariViews.number;
import static com.boardgame.papersafari.bot.SafariViews.sight;
import static com.boardgame.papersafari.bot.SafariViews.tarzan;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameAction;
import com.boardgame.papersafari.TurnPhase;
import com.boardgame.papersafari.view.BoardView;
import com.boardgame.support.FixedRandom;
import org.junit.jupiter.api.Test;

class EasySafariTest {

    private static final BoardView MINE = board(ME, number(9), number(2), number(8), null, number(2), null);
    private final EasySafari easy = new EasySafari();

    @Test
    void R25_버린_더미가_있으면_가져오고_없으면_덱에서_뽑는다() {
        assertThat(easy.draw(sight(TurnPhase.DRAW, number(9), null, MINE), new FixedRandom(0)))
                .isEqualTo(new GameAction("DRAW_DISCARD", null, null));
        assertThat(easy.draw(sight(TurnPhase.DRAW, null, null, MINE), new FixedRandom(0)))
                .isEqualTo(new GameAction("DRAW_DECK", null, null));
    }

    @Test
    void R25_덱에서_뽑은_카드는_30퍼센트로_그냥_버리고_아니면_무작위_칸에_넣는다() {
        assertThat(easy.place(sight(TurnPhase.PLACE, null, fromDeck(number(5)), MINE), new FixedRandom(10)))
                .isEqualTo(new GameAction("DISCARD", null, null));
        assertThat(easy.place(sight(TurnPhase.PLACE, null, fromDeck(number(5)), MINE), new FixedRandom(40)))
                .isEqualTo(new GameAction("SWAP", 1, 1));
    }

    @Test
    void R25_타잔과_버린_더미_카드는_버리지_않고_무작위_칸에_넣는다() {
        assertThat(easy.place(sight(TurnPhase.PLACE, null, fromDeck(tarzan()), MINE), new FixedRandom(10)))
                .isEqualTo(new GameAction("SWAP", 1, 1));
        assertThat(easy.place(sight(TurnPhase.PLACE, null, fromDiscard(number(1)), MINE), new FixedRandom(10)))
                .isEqualTo(new GameAction("SWAP", 1, 1));
    }

    @Test
    void R24_R25_처음_뒤집기와_엿보기는_무작위_뒷면_칸이다() {
        assertThat(easy.flip(sight(TurnPhase.SETUP_FLIP, null, null, MINE), new FixedRandom(1)))
                .isEqualTo(new GameAction("FLIP", 2, 1));
        assertThat(easy.peek(sight(TurnPhase.PEEK, null, null, MINE), new FixedRandom(0)))
                .isEqualTo(new GameAction("PEEK", 0, 1));
    }
}
