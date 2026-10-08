package com.boardgame.uno.bot;

import static com.boardgame.uno.bot.UnoViews.LEFT;
import static com.boardgame.uno.bot.UnoViews.ME;
import static com.boardgame.uno.bot.UnoViews.number;
import static com.boardgame.uno.bot.UnoViews.view;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import com.boardgame.game.GameAction;
import com.boardgame.game.GameSession;
import com.boardgame.game.PendingActor;
import com.boardgame.game.PendingKind;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.game.bot.BotMind;
import com.boardgame.game.bot.BotPlan;
import com.boardgame.game.bot.BotSituation;
import com.boardgame.game.bot.BotStep;
import com.boardgame.support.FixedRandom;
import com.boardgame.uno.RandomUnoShuffler;
import com.boardgame.uno.UnoColor;
import com.boardgame.uno.UnoSessionFactory;
import com.boardgame.uno.UnoShuffler;
import com.boardgame.uno.UnoStage;
import com.boardgame.uno.view.UnoSessionView;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

class UnoMindTest {

    private static final Instant NOW = Instant.parse("2026-10-08T00:00:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    private final UnoBrain brain = new UnoBrain();

    private static BotSituation reaction(UnoViews table, Instant now, Random random) {
        return new BotSituation(table.session(), PendingKind.REACTION, now, random);
    }

    private static UnoViews othersTurnWithWindow() {
        return view().current(LEFT).held(number(UnoColor.BLUE, 1)).catchWindow(LEFT);
    }

    @Test
    void R30_R32_중은_잡기_창을_처음_볼_때만_30퍼센트로_정한다() {
        BotMind mind = brain.mind(BotDifficulty.MEDIUM);
        UnoViews open = othersTurnWithWindow();

        BotPlan plan = mind.plan(reaction(open, NOW, new FixedRandom(10))).orElseThrow();

        assertThat(plan.first().action().type()).isEqualTo("CATCH_UNO");
        assertThat(plan.first().action().targetId()).isEqualTo(LEFT);
        assertThat(plan.first().delay()).isEqualTo(Duration.ofMillis(1010));
    }

    @Test
    void R32_한_잡기_창에서는_한_번만_정하고_창이_닫히면_잊는다() {
        BotMind mind = brain.mind(BotDifficulty.MEDIUM);
        UnoViews open = othersTurnWithWindow();
        UnoViews closed = view().current(LEFT).held(number(UnoColor.BLUE, 1));

        // 처음 볼 때 잡지 않기로 정하면(50 ≥ 30) 같은 창에서는 다시 물어도 잡지 않는다.
        mind.observe(open.session());
        assertThat(mind.plan(reaction(open, NOW, new FixedRandom(50)))).isEmpty();
        assertThat(mind.plan(reaction(open, NOW, new FixedRandom(10)))).isEmpty();

        // 창이 닫혔다 다시 열리면 새로 정한다. 잡기로 정한 뒤 다시 물으면 같은 시각을 남은 시간으로 답한다.
        mind.observe(closed.session());
        mind.observe(open.session());
        BotPlan first = mind.plan(reaction(open, NOW, new FixedRandom(10))).orElseThrow();
        BotPlan again = mind.plan(reaction(open, NOW.plusMillis(400), new FixedRandom(90))).orElseThrow();

        assertThat(first.first().delay()).isEqualTo(Duration.ofMillis(1010));
        assertThat(again.first().delay()).isEqualTo(Duration.ofMillis(610));
        assertThat(again.first().action().type()).isEqualTo("CATCH_UNO");
    }

    @Test
    void R31_상은_0_8_1_5초_안에_반드시_잡는다() {
        BotMind mind = brain.mind(BotDifficulty.HARD);

        BotStep low = mind.plan(reaction(othersTurnWithWindow(), NOW, new FixedRandom(99))).orElseThrow().first();
        BotStep high = brain.mind(BotDifficulty.HARD)
                .plan(reaction(othersTurnWithWindow(), NOW, new FixedRandom(700)))
                .orElseThrow()
                .first();

        assertThat(low.action().type()).isEqualTo("CATCH_UNO");
        assertThat(low.delay()).isEqualTo(Duration.ofMillis(899));
        assertThat(high.delay()).isEqualTo(Duration.ofMillis(1500));
    }

    @Test
    void R29_하는_잡지_않는다() {
        BotMind mind = brain.mind(BotDifficulty.EASY);

        assertThat(mind.plan(reaction(othersTurnWithWindow(), NOW, new FixedRandom(0)))).isEmpty();
    }

    @Test
    void R32_나를_잡을_수는_없다() {
        BotMind mind = brain.mind(BotDifficulty.HARD);
        UnoViews mine = view().current(LEFT).held(number(UnoColor.BLUE, 1)).catchWindow(ME);

        assertThat(mind.plan(reaction(mine, NOW, new FixedRandom(0)))).isEmpty();
    }

    @Test
    void R32_차례인_컴퓨터도_잡기를_먼저_하고_창이_닫히면_차례_행동을_한다() {
        BotMind mind = brain.mind(BotDifficulty.HARD);
        UnoViews withWindow = view().playable(number(UnoColor.RED, 3)).catchWindow(LEFT);
        UnoViews without = view().playable(number(UnoColor.RED, 3));

        BotPlan caught = mind.plan(new BotSituation(withWindow.session(), PendingKind.TURN, NOW, new FixedRandom(0)))
                .orElseThrow();
        mind.observe(without.session());
        BotPlan played = mind.plan(new BotSituation(without.session(), PendingKind.TURN, NOW, new FixedRandom(0)))
                .orElseThrow();

        assertThat(caught.first().action().type()).isEqualTo("CATCH_UNO");
        assertThat(played.first().action().type()).isEqualTo("PLAY");
        assertThat(played.first().delay()).isEqualTo(Duration.ofMillis(800));
    }

    @Test
    void R21_자동_행동_대체() {
        BotMind mind = brain.mind(BotDifficulty.HARD);
        Random random = new FixedRandom(0);

        assertThat(mind.fallback(view().playable(number(UnoColor.RED, 3)).session(), random))
                .map(GameAction::type)
                .contains("DRAW");
        assertThat(mind.fallback(view().drawn(number(UnoColor.RED, 3)).session(), random))
                .map(GameAction::type)
                .contains("KEEP");
        assertThat(mind.fallback(view().stage(UnoStage.CHOOSE_COLOR)
                        .held(number(UnoColor.BLUE, 1), number(UnoColor.GREEN, 2), number(UnoColor.GREEN, 3))
                        .session(), random))
                .map(GameAction::color)
                .contains("GREEN");
        assertThat(mind.fallback(view().challenge(LEFT, UnoColor.RED).session(), random))
                .map(GameAction::type)
                .contains("ACCEPT");
        assertThat(mind.fallback(view().current(LEFT).session(), random)).isEmpty();
    }

    @Test
    void R16_실제_세션의_시야로_고른_행동을_세션이_받아_준다() {
        GameSession session = new UnoSessionFactory(CLOCK, new RandomUnoShuffler(), count -> 0)
                .create(List.of(-1L, -2L));
        PendingActor actor = session.pendingActors()
                .get(0);
        BotMind mind = brain.mind(BotDifficulty.HARD);
        Object view = session.viewFor(actor.memberId());
        mind.observe(view);

        BotPlan plan = mind.plan(new BotSituation(view, actor.kind(), NOW, new Random(1))).orElseThrow();

        assertThat(((UnoSessionView) view).game().hand()).isNotEmpty();
        assertThatCode(() -> session.act(actor.memberId(), plan.first().action())).doesNotThrowAnyException();
    }

    @ParameterizedTest
    @EnumSource(BotDifficulty.class)
    void R16_컴퓨터끼리_자기_시야만으로_한_판을_끝까지_둔다(BotDifficulty difficulty) {
        for (long seed = 1; seed <= 5; seed++) {
            assertThat(playOut(difficulty, seed)).isTrue();
        }
    }

    // 세 컴퓨터가 서로 다른 난이도 중 하나로, 가장 먼저 예약된 계획부터 실행한다(거절되면 예외로 실패).
    private boolean playOut(BotDifficulty difficulty, long seed) {
        Random random = new Random(seed);
        UnoShuffler shuffler = cards -> seeded(cards, seed);
        List<Long> members = List.of(-1L, -2L, -3L);
        GameSession session = new UnoSessionFactory(CLOCK, shuffler, count -> 0).create(members);
        Map<Long, BotMind> minds = new HashMap<>();
        members.forEach(member -> minds.put(member, brain.mind(difficulty)));
        for (int step = 0; step < 5000 && !session.isFinished(); step++) {
            members.forEach(member -> minds.get(member).observe(session.viewFor(member)));
            Planned next = earliest(session, minds, random);
            session.act(next.member(), next.plan().first().action());
        }
        return session.isFinished();
    }

    private Planned earliest(GameSession session, Map<Long, BotMind> minds, Random random) {
        List<Planned> planned = new ArrayList<>();
        for (PendingActor actor : session.pendingActors()) {
            BotSituation situation = new BotSituation(session.viewFor(actor.memberId()), actor.kind(), NOW, random);
            minds.get(actor.memberId())
                    .plan(situation)
                    .ifPresent(plan -> planned.add(new Planned(actor.memberId(), plan)));
        }
        return planned.stream()
                .min((a, b) -> a.plan().first().delay().compareTo(b.plan().first().delay()))
                .orElseThrow();
    }

    private static <T> List<T> seeded(List<T> cards, long seed) {
        List<T> copy = new ArrayList<>(cards);
        Collections.shuffle(copy, new Random(seed));
        return copy;
    }

    private record Planned(long member, BotPlan plan) {
    }

    @Test
    void 우노_머리는_우노_게임에_등록된다() {
        assertThat(brain.type()).isEqualTo(com.boardgame.game.GameType.UNO);
        assertThat(Optional.of(brain.mind(BotDifficulty.EASY))).isPresent();
    }
}
