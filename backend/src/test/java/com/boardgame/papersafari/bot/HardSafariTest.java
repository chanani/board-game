package com.boardgame.papersafari.bot;

import static com.boardgame.papersafari.bot.SafariViews.ME;
import static com.boardgame.papersafari.bot.SafariViews.OTHER;
import static com.boardgame.papersafari.bot.SafariViews.board;
import static com.boardgame.papersafari.bot.SafariViews.fox;
import static com.boardgame.papersafari.bot.SafariViews.fromDeck;
import static com.boardgame.papersafari.bot.SafariViews.number;
import static com.boardgame.papersafari.bot.SafariViews.sight;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import com.boardgame.game.GameAction;
import com.boardgame.papersafari.TurnPhase;
import com.boardgame.papersafari.view.BoardView;
import com.boardgame.papersafari.view.CardView;
import com.boardgame.papersafari.view.SlotView;
import com.boardgame.support.FixedRandom;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;

class HardSafariTest {

    // 내 판: 1·1 짝, 2·2 짝, 위 3 / 아래 뒷면 하나만 남음.
    private static final BoardView MINE = board(ME, number(1), number(2), number(3), number(1), number(2), null);
    // 상대 판(모두 앞면): 1+3 = 4점, 0·0 짝, 5·5 짝 → 4점.
    private static final BoardView CLOSE = board(OTHER, number(1), number(0), number(5), number(3), number(0), number(5));
    // 상대 판: 4+6 = 10점.
    private static final BoardView FAR = board(OTHER, number(4), number(0), number(5), number(6), number(0), number(5));

    private HardSafari hard() {
        return new HardSafari(new SeenCards());
    }

    @Test
    void R27_남은_카드_평균은_공개된_카드를_54장에서_뺀_나머지_평균이다() {
        List<CardView> zeros = Collections.nCopies(4, number(0));

        assertThat(CardOdds.DECK_AVERAGE).isCloseTo(252.0 / 54, within(1e-9));
        assertThat(CardOdds.remainingAverage(zeros)).isCloseTo(252.0 / 50, within(1e-9));
    }

    @Test
    void R27_판을_끝내는_수는_다른_사람보다_2점_이상_낮을_때만_둔다() {
        GameAction close = hard().place(sight(TurnPhase.PLACE, null, fromDeck(number(0)), MINE, CLOSE), new FixedRandom(0));
        GameAction far = hard().place(sight(TurnPhase.PLACE, null, fromDeck(number(0)), MINE, FAR), new FixedRandom(0));

        assertThat(close).isEqualTo(new GameAction("SWAP", 2, 0));
        assertThat(far).isEqualTo(new GameAction("SWAP", 2, 1));
    }

    @Test
    void 상끼리_판이_끝나지_않는_것을_막으려고_내_놓기가_20번을_넘으면_지지_않을_때_끝낸다() {
        HardSafari hard = hard();
        SafariSight sight = sight(TurnPhase.PLACE, null, fromDeck(number(0)), MINE, CLOSE);

        for (int placement = 0; placement < 20; placement++) {
            assertThat(hard.place(sight, new FixedRandom(0))).isEqualTo(new GameAction("SWAP", 2, 0));
        }

        assertThat(hard.place(sight, new FixedRandom(0))).isEqualTo(new GameAction("SWAP", 2, 1));
    }

    @Test
    void R27_같은_이득이면_밀려나는_카드_점수가_높은_칸을_먼저_고른다() {
        SlotView low = new SlotView(0, 0, true, false, number(-2));
        SlotView high = new SlotView(1, 0, true, false, number(2));

        List<Choice> ordered = HardSafari.preferPushingHigh(List.of(new Choice(low, -12, -2), new Choice(high, -12, 2),
                new Choice(low, -20, 9)));

        assertThat(ordered).extracting(Choice::slot).containsExactly(high, low, low);
    }

    @Test
    void R27_여우는_짝이_없는_열_중_합이_가장_큰_열의_큰_칸에_넣는다() {
        BoardView mine = board(ME, number(9), number(5), number(4), number(3), number(5), number(2));

        assertThat(hard().place(sight(TurnPhase.PLACE, null, fromDeck(fox()), mine), new FixedRandom(0)))
                .isEqualTo(new GameAction("SWAP", 0, 0));
    }

    @Test
    void R24_처음_뒤집기는_위_아래_줄을_고른_뒤_그_줄의_칸을_고른다() {
        BoardView hidden = board(ME, null, null, null, null, null, null);

        assertThat(hard().flip(sight(TurnPhase.SETUP_FLIP, null, null, hidden), new FixedRandom(1)))
                .isEqualTo(new GameAction("FLIP", 1, 1));
    }

    @Test
    void R27_버린_더미_기억은_맨_위가_바뀔_때_쌓고_누가_가져가면_뺀다() {
        SeenCards seen = new SeenCards();
        BoardView mine = board(ME, null, null, null, null, null, null);

        seen.observe(sight(TurnPhase.DRAW, number(7), null, mine));
        seen.observe(sight(TurnPhase.DRAW, number(3), null, mine));
        seen.observe(sight(TurnPhase.PLACE, number(7), new com.boardgame.papersafari.view.HeldView(OTHER,
                com.boardgame.papersafari.DrawSource.DISCARD, number(3)), mine));

        assertThat(seen.seenWith(sight(TurnPhase.DRAW, number(7), null, mine))).containsExactly(number(7));
    }
}
