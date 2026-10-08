package com.boardgame.papersafari.bot;

import static com.boardgame.papersafari.bot.SafariViews.ME;
import static com.boardgame.papersafari.bot.SafariViews.OTHER;
import static com.boardgame.papersafari.bot.SafariViews.board;
import static com.boardgame.papersafari.bot.SafariViews.number;
import static com.boardgame.papersafari.bot.SafariViews.view;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameAction;
import com.boardgame.game.GameType;
import com.boardgame.game.PendingKind;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.game.bot.BotMind;
import com.boardgame.game.bot.BotPlan;
import com.boardgame.game.bot.BotSituation;
import com.boardgame.papersafari.PaperSafariSession;
import com.boardgame.papersafari.RoundFactory;
import com.boardgame.papersafari.TurnPhase;
import com.boardgame.papersafari.view.BoardView;
import com.boardgame.papersafari.view.SlotView;
import com.boardgame.support.FixedRandom;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class PaperSafariMindTest {

    private static final BoardView MINE = board(ME, number(9), number(2), number(8), null, number(2), null);
    private static final BoardView THEIRS = board(OTHER, null, null, null, null, null, null);
    private final PaperSafariBrain brain = new PaperSafariBrain();

    private Optional<BotPlan> plan(BotMind mind, Object view) {
        return mind.plan(new BotSituation(view, PendingKind.TURN, Instant.EPOCH, new FixedRandom(0)));
    }

    @Test
    void 머리는_페이퍼_사파리_것이고_난이도마다_새_마음을_만든다() {
        assertThat(brain.type()).isEqualTo(GameType.PAPER_SAFARI);
        assertThat(brain.mind(BotDifficulty.HARD)).isNotSameAs(brain.mind(BotDifficulty.HARD));
    }

    @Test
    void R19_내_차례면_생각_시간_뒤에_한_번_행동한다() {
        Optional<BotPlan> plan = plan(brain.mind(BotDifficulty.MEDIUM), view(TurnPhase.DRAW, ME, number(3), null, MINE, THEIRS));

        assertThat(plan).contains(BotPlan.act(Duration.ofMillis(800), new GameAction("DRAW_DISCARD", null, null)));
    }

    @Test
    void 내_결정을_기다리지_않으면_아무것도_하지_않는다() {
        BotMind mind = brain.mind(BotDifficulty.EASY);

        assertThat(plan(mind, view(TurnPhase.DRAW, OTHER, number(3), null, MINE, THEIRS))).isEmpty();
        assertThat(plan(mind, view(TurnPhase.ROUND_OVER, ME, number(3), null, MINE, THEIRS))).isEmpty();
        assertThat(plan(mind, view(TurnPhase.SETUP_FLIP, ME, number(3), null, MINE, THEIRS))).isEmpty();
    }

    @Test
    void R21_자동_행동_대체는_기존_autoAct와_같은_결정이다() {
        BotMind mind = brain.mind(BotDifficulty.HARD);

        assertThat(mind.fallback(view(TurnPhase.DRAW, ME, number(9), null, MINE, THEIRS), new FixedRandom(0)))
                .contains(new GameAction("DRAW_DISCARD", null, null));
        assertThat(mind.fallback(view(TurnPhase.DRAW, ME, null, null, MINE, THEIRS), new FixedRandom(0)))
                .contains(new GameAction("DRAW_DECK", null, null));
        assertThat(mind.fallback(view(TurnPhase.DRAW, OTHER, null, null, MINE, THEIRS), new FixedRandom(0))).isEmpty();
    }

    @Test
    void R16_실제_세션의_컴퓨터_시야에는_남의_뒷면_카드가_없고_고른_행동을_세션이_받아_준다() {
        PaperSafariSession session = new PaperSafariSession(List.of(-1L, -2L), RoundFactory.random(),
                new MutableClock(Instant.parse("2026-10-08T00:00:00Z")));
        Object view = session.viewFor(-1L);
        SafariSight sight = SafariSight.of(view);

        assertThat(sight.opponents()).flatExtracting(BoardView::slots)
                .filteredOn(slot -> !slot.faceUp())
                .extracting(SlotView::card)
                .containsOnlyNulls();
        BotPlan plan = brain.mind(BotDifficulty.HARD)
                .plan(new BotSituation(view, PendingKind.TOGETHER, Instant.EPOCH, new FixedRandom(0)))
                .orElseThrow();
        session.act(-1L, plan.first().action());
        assertThat(SafariSight.of(session.viewFor(-1L)).mySlots()).filteredOn(SlotView::faceUp).hasSize(1);
    }
}
