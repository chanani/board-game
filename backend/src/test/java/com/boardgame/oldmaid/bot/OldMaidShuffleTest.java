package com.boardgame.oldmaid.bot;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.PendingKind;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.game.bot.BotMind;
import com.boardgame.game.bot.BotPlan;
import com.boardgame.game.bot.BotSituation;
import com.boardgame.support.FixedRandom;
import com.boardgame.oldmaid.view.OldMaidSessionView;
import java.time.Duration;
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
        OldMaidSessionView withJoker = OldMaidViews.targeted(5L, true);
        mind.observe(withJoker);

        assertThat(shuffles(reaction(mind, withJoker, NOW))).isTrue();
        Object shuffled = OldMaidViews.withShuffle(withJoker, 9L, OldMaidViews.ME, NOW.plusMillis(800));
        mind.observe(shuffled);
        assertThat(reaction(mind, shuffled, NOW.plusSeconds(10))).isEmpty();
        assertThat(reaction(mind, OldMaidViews.targeted(6L, true), NOW.plusSeconds(11))).isEmpty();
    }

    @Test
    void R36_중의_섞기는_예약이_취소돼도_실제로_섞을_때까지_남은_시간으로_다시_정한다() {
        BotMind mind = brain.mind(BotDifficulty.MEDIUM);
        OldMaidSessionView withJoker = OldMaidViews.targeted(5L, true);
        mind.observe(withJoker);
        Duration first = delayOf(reaction(mind, withJoker, NOW));

        // 다른 사람이 섞어 내 화면이 바뀌어 예약이 취소되고 다시 묻는다(같은 조커 도착).
        Object othersShuffle = OldMaidViews.withShuffle(withJoker, 3L, OldMaidViews.OTHER, NOW.plusMillis(300));
        mind.observe(othersShuffle);
        Optional<BotPlan> again = reaction(mind, othersShuffle, NOW.plusMillis(300));

        assertThat(shuffles(again)).isTrue();
        assertThat(delayOf(again)).isEqualTo(first.minusMillis(300));
        // 다음 차례에도 아직 섞지 않았으면 섞는다(조커 하나에 한 번은 반드시).
        assertThat(shuffles(reaction(mind, OldMaidViews.targeted(6L, true), NOW.plusSeconds(5)))).isTrue();
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
        OldMaidSessionView turn5 = OldMaidViews.targeted(5L, true);
        Object turn6 = OldMaidViews.targeted(6L, true);
        Object noJoker = OldMaidViews.targeted(7L, false);

        assertThat(shuffles(reaction(mind, turn5, NOW))).isTrue();
        Object shuffled5 = OldMaidViews.withShuffle(turn5, 9L, OldMaidViews.ME, NOW.plusMillis(800));
        mind.observe(shuffled5);
        assertThat(reaction(mind, shuffled5, NOW.plusSeconds(1))).isEmpty();
        assertThat(shuffles(reaction(mind, turn6, NOW.plusSeconds(2)))).isTrue();
        assertThat(reaction(mind, noJoker, NOW.plusSeconds(10))).isEmpty();
    }

    @Test
    void R36_상의_섞기는_예약이_취소돼도_그_차례_안에서_남은_시간으로_다시_정한다() {
        BotMind mind = brain.mind(BotDifficulty.HARD);
        OldMaidSessionView turn5 = OldMaidViews.targeted(5L, true);
        Duration first = delayOf(reaction(mind, turn5, NOW));

        Object othersShuffle = OldMaidViews.withShuffle(turn5, 3L, OldMaidViews.OTHER, NOW.plusMillis(500));
        mind.observe(othersShuffle);
        Optional<BotPlan> again = reaction(mind, othersShuffle, NOW.plusMillis(500));

        assertThat(shuffles(again)).isTrue();
        assertThat(delayOf(again)).isEqualTo(first.minusMillis(500));
        assertThat(delayOf(reaction(mind, othersShuffle, NOW.plusSeconds(5)))).isZero();
    }

    @Test
    void R36_쿨다운_중이면_버리지_않고_쿨다운이_끝날_때_섞는다() {
        BotMind mind = brain.mind(BotDifficulty.HARD);
        OldMaidSessionView turn5 = OldMaidViews.targeted(5L, true);
        OldMaidSessionView turn6 = OldMaidViews.targeted(6L, true);

        assertThat(shuffles(reaction(mind, turn5, NOW))).isTrue();
        mind.observe(OldMaidViews.withShuffle(turn5, 9L, OldMaidViews.ME, NOW.plusMillis(800)));
        Optional<BotPlan> next = reaction(mind, turn6, NOW.plusMillis(900));

        // 마지막으로 섞은 때(800ms) + 1.1초 = 1900ms. 지금이 900ms이므로 1초 뒤(생각 시간 800ms보다 길다).
        assertThat(shuffles(next)).isTrue();
        assertThat(delayOf(next)).isEqualTo(Duration.ofMillis(1000));
    }

    private static Duration delayOf(Optional<BotPlan> plan) {
        return plan.orElseThrow()
                .first()
                .delay();
    }
}
