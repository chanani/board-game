package com.boardgame.oldmaid.bot;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameAction;
import com.boardgame.game.PendingKind;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.game.bot.BotMind;
import com.boardgame.game.bot.BotPlan;
import com.boardgame.game.bot.BotSituation;
import com.boardgame.game.bot.BotStep;
import com.boardgame.oldmaid.OldMaidSession;
import com.boardgame.oldmaid.OldMaidSessionFactory;
import com.boardgame.oldmaid.OldMaidStage;
import com.boardgame.oldmaid.RandomOldMaidShuffler;
import com.boardgame.game.PendingActor;
import com.boardgame.support.FixedRandom;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

class OldMaidMindTest {

    private static final Instant NOW = Instant.parse("2026-10-08T00:00:00Z");

    private final OldMaidBrain brain = new OldMaidBrain();

    private static BotPlan plan(BotMind mind, Object view, PendingKind kind, Random random) {
        return mind.plan(new BotSituation(view, kind, NOW, random)).orElseThrow();
    }

    private static List<String> shape(BotPlan plan) {
        return plan.steps()
                .stream()
                .map(OldMaidMindTest::describe)
                .toList();
    }

    private static String describe(BotStep step) {
        return (step.isSignal() ? "S:" : "A:") + step.action().type() + step.action().index();
    }

    @Test
    void R33_처음_짝_버리기는_DISCARD_ALL이고_하는_2_5초부터_기다린다() {
        Object view = OldMaidViews.discarding(OldMaidStage.OPENING_DISCARD);

        BotPlan easy = plan(brain.mind(BotDifficulty.EASY), view, PendingKind.TOGETHER, new FixedRandom(0));
        BotPlan medium = plan(brain.mind(BotDifficulty.MEDIUM), view, PendingKind.TOGETHER, new FixedRandom(0));

        assertThat(easy.first().action().type()).isEqualTo("DISCARD_ALL");
        assertThat(easy.first().delay().toMillis()).isEqualTo(2500);
        assertThat(medium.first().action().type()).isEqualTo("DISCARD_ALL");
        assertThat(medium.first().delay().toMillis()).isEqualTo(800);
    }

    @Test
    void R33_짝_버리기_단계도_DISCARD_ALL() {
        Object view = OldMaidViews.discarding(OldMaidStage.DISCARD);

        BotPlan easy = plan(brain.mind(BotDifficulty.EASY), view, PendingKind.TURN, new FixedRandom(0));
        BotPlan hard = plan(brain.mind(BotDifficulty.HARD), view, PendingKind.TURN, new FixedRandom(0));

        assertThat(shape(easy)).containsExactly("A:DISCARD_ALLnull");
        assertThat(easy.first().delay().toMillis()).isEqualTo(800);
        assertThat(shape(hard)).containsExactly("A:DISCARD_ALLnull");
    }

    @Test
    void R23_하는_신호_없이_바로_뽑는다() {
        BotPlan plan = plan(brain.mind(BotDifficulty.EASY), OldMaidViews.drawing(5), PendingKind.TURN,
                new FixedRandom(1));

        assertThat(shape(plan)).containsExactly("A:DRAW1");
    }

    @Test
    void R23_중은_다른_자리를_들었다가_고른_자리를_뽑는다() {
        BotPlan plan = plan(brain.mind(BotDifficulty.MEDIUM), OldMaidViews.drawing(5), PendingKind.TURN,
                new FixedRandom(1));

        assertThat(shape(plan)).containsExactly("S:PEEK2", "S:PEEK3", "S:PEEK1", "A:DRAW1");
        assertThat(plan.steps().stream().map(step -> step.delay().toMillis()).toList())
                .containsExactly(801L, 301L, 301L, 301L);
    }

    @Test
    void R23_상대_카드가_한_장이면_들_다른_자리가_없어_바로_뽑는다() {
        BotPlan plan = plan(brain.mind(BotDifficulty.MEDIUM), OldMaidViews.drawing(1), PendingKind.TURN,
                new FixedRandom(1));

        assertThat(shape(plan)).containsExactly("A:DRAW0");
    }

    @Test
    void 서든데스에서_뽑을_때는_1초_더_머뭇거린다() {
        // 카드 가진 사람이 나(1장)와 상대(2장)뿐: 이번 뽑기에 승부가 걸렸다.
        BotPlan sudden = plan(brain.mind(BotDifficulty.EASY), OldMaidViews.drawing(2), PendingKind.TURN,
                new FixedRandom(0));
        // 세 번째 사람도 카드를 들고 있으면 서든데스가 아니다.
        Object crowded = OldMaidViews.view(OldMaidViews.ME, OldMaidStage.DRAW, OldMaidViews.ME, OldMaidViews.OTHER, 3L,
                List.of(OldMaidViews.card(1)), List.of(OldMaidViews.player(OldMaidViews.ME, 1),
                        OldMaidViews.player(OldMaidViews.OTHER, 2), OldMaidViews.player(-3L, 2)), false, false);
        BotPlan calm = plan(brain.mind(BotDifficulty.EASY), crowded, PendingKind.TURN, new FixedRandom(0));

        assertThat(sudden.first().delay().toMillis()).isEqualTo(1800);
        assertThat(calm.first().delay().toMillis()).isEqualTo(800);
    }

    @Test
    void 서든데스는_두_사람이_1장과_2장을_들고_1장_쪽이_뽑을_때만이다() {
        OldMaidSight sudden = OldMaidSight.of(OldMaidViews.drawing(2));
        // 2장 쪽이 1장 쪽에서 뽑으면 결과가 이미 정해져 있다.
        OldMaidSight settled = OldMaidSight.of(OldMaidViews.view(OldMaidViews.ME, OldMaidStage.DRAW, OldMaidViews.ME,
                OldMaidViews.OTHER, 3L, List.of(OldMaidViews.card(1), OldMaidViews.card(2)),
                List.of(OldMaidViews.player(OldMaidViews.ME, 2), OldMaidViews.player(OldMaidViews.OTHER, 1)), false, false));
        OldMaidSight discarding = OldMaidSight.of(OldMaidViews.discarding(OldMaidStage.DISCARD));

        assertThat(sudden.isSuddenDeath()).isTrue();
        assertThat(settled.isSuddenDeath()).isFalse();
        assertThat(discarding.isSuddenDeath()).isFalse();
        assertThat(OldMaidSight.of(OldMaidViews.drawing(5)).isSuddenDeath()).isFalse();
    }

    @Test
    void R35_상도_화면에_추적_정보가_없으면_무작위로_뽑는다() {
        BotPlan hard = plan(brain.mind(BotDifficulty.HARD), OldMaidViews.drawing(5), PendingKind.TURN,
                new FixedRandom(1));
        BotPlan medium = plan(brain.mind(BotDifficulty.MEDIUM), OldMaidViews.drawing(5), PendingKind.TURN,
                new FixedRandom(1));

        assertThat(shape(hard)).isEqualTo(shape(medium));
    }

    @Test
    void 내_차례도_할_일도_없으면_계획이_없다() {
        Object view = OldMaidViews.targeted(4L, false);

        assertThat(brain.mind(BotDifficulty.MEDIUM)
                .plan(new BotSituation(view, PendingKind.TURN, NOW, new FixedRandom(0)))).isEmpty();
    }

    @Test
    void R21_자동_행동_대체() {
        BotMind mind = brain.mind(BotDifficulty.HARD);

        GameAction opening = mind.fallback(OldMaidViews.discarding(OldMaidStage.OPENING_DISCARD),
                new FixedRandom(0)).orElseThrow();
        GameAction draw = mind.fallback(OldMaidViews.drawing(5), new FixedRandom(3)).orElseThrow();

        assertThat(opening.type()).isEqualTo("DISCARD_ALL");
        assertThat(draw.type()).isEqualTo("DRAW");
        assertThat(draw.index()).isEqualTo(3);
        assertThat(mind.fallback(OldMaidViews.targeted(4L, false), new FixedRandom(0))).isEmpty();
    }

    @Test
    void R16_실제_세션의_시야로_고른_행동을_세션이_받아_준다() {
        OldMaidSession session = (OldMaidSession) new OldMaidSessionFactory(
                Clock.systemUTC(), new RandomOldMaidShuffler(), bound -> 0).create(List.of(-1L, -2L));
        BotMind mind = brain.mind(BotDifficulty.HARD);

        BotPlan plan = plan(mind, session.viewFor(-1L), pendingKind(session), new FixedRandom(0));

        BotStep act = plan.steps().get(plan.steps().size() - 1);
        assertThat(session.act(-1L, act.action())).isNotNull();
    }

    private static PendingKind pendingKind(OldMaidSession session) {
        return session.pendingActors()
                .stream()
                .filter(actor -> actor.memberId() == -1L)
                .map(PendingActor::kind)
                .findFirst()
                .orElseThrow();
    }
}
