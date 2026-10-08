package com.boardgame.oldmaid.bot;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.PendingKind;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.game.bot.BotMind;
import com.boardgame.game.bot.BotPlan;
import com.boardgame.game.bot.BotSituation;
import com.boardgame.support.FixedRandom;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class OldMaidShuffleTest {

    private static final Instant NOW = Instant.parse("2026-10-08T00:00:00Z");

    private final OldMaidBrain brain = new OldMaidBrain();

    private static Optional<BotPlan> reaction(BotMind mind, Object view, Instant now) {
        return mind.plan(new BotSituation(view, PendingKind.REACTION, now, new FixedRandom(0)));
    }

    private static boolean shuffles(Optional<BotPlan> plan) {
        return plan.map(p -> p.first().action().type())
                .filter("SHUFFLE"::equals)
                .isPresent();
    }

    @Test
    void R36_하는_섞지_않는다() {
        BotMind mind = brain.mind(BotDifficulty.EASY);
        Object view = OldMaidViews.targeted(5L, true);
        mind.observe(view);

        assertThat(reaction(mind, view, NOW)).isEmpty();
    }

    @Test
    void R36_중은_조커를_받은_뒤_한_번만_섞는다() {
        BotMind mind = brain.mind(BotDifficulty.MEDIUM);
        mind.observe(OldMaidViews.targeted(4L, false));
        Object withJoker = OldMaidViews.targeted(5L, true);
        mind.observe(withJoker);

        assertThat(shuffles(reaction(mind, withJoker, NOW))).isTrue();
        assertThat(reaction(mind, withJoker, NOW.plusSeconds(10))).isEmpty();
    }

    @Test
    void R36_중은_조커가_없으면_섞지_않는다() {
        BotMind mind = brain.mind(BotDifficulty.MEDIUM);
        Object view = OldMaidViews.targeted(4L, false);
        mind.observe(view);

        assertThat(reaction(mind, view, NOW)).isEmpty();
    }

    @Test
    void R36_상은_조커를_든_동안_내가_뽑힐_차례마다_섞는다() {
        BotMind mind = brain.mind(BotDifficulty.HARD);
        Object turn5 = OldMaidViews.targeted(5L, true);
        Object turn6 = OldMaidViews.targeted(6L, true);
        Object noJoker = OldMaidViews.targeted(7L, false);

        assertThat(shuffles(reaction(mind, turn5, NOW))).isTrue();
        assertThat(reaction(mind, turn5, NOW.plusSeconds(1))).isEmpty();
        assertThat(shuffles(reaction(mind, turn6, NOW.plusSeconds(2)))).isTrue();
        assertThat(reaction(mind, noJoker, NOW.plusSeconds(10))).isEmpty();
    }

    @Test
    void R36_쿨다운_1초_안에는_섞지_않는다() {
        BotMind mind = brain.mind(BotDifficulty.HARD);
        Object turn5 = OldMaidViews.targeted(5L, true);
        Object turn6 = OldMaidViews.targeted(6L, true);

        assertThat(shuffles(reaction(mind, turn5, NOW))).isTrue();
        // 계획의 지연(800ms)만큼 뒤에 실행되는 것으로 보므로, 직후 차례는 1.1초가 지나기 전이다.
        assertThat(reaction(mind, turn6, NOW)).isEmpty();
    }
}
