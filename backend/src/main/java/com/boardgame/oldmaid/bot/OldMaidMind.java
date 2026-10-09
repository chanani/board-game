package com.boardgame.oldmaid.bot;

import com.boardgame.game.GameAction;
import com.boardgame.game.PendingKind;
import com.boardgame.game.bot.BotMind;
import com.boardgame.game.bot.BotPlan;
import com.boardgame.game.bot.BotSituation;
import com.boardgame.game.bot.ThinkTime;
import java.time.Duration;
import java.util.Optional;
import java.util.Random;

final class OldMaidMind implements BotMind {

    /** 서든데스에서 뽑을 때 더 머뭇거리는 시간. 모두가 긴장을 느낄 틈을 준다. */
    static final Duration SUDDEN_DEATH_PAUSE = Duration.ofMillis(1000);

    private final OldMaidPlayer player;

    OldMaidMind(OldMaidPlayer player) {
        this.player = player;
    }

    @Override
    public void observe(Object view) {
        player.observe(OldMaidSight.of(view));
    }

    @Override
    public Optional<BotPlan> plan(BotSituation situation) {
        OldMaidSight sight = OldMaidSight.of(situation.view());
        Random random = situation.random();
        if (sight.canDiscard()) {
            return Optional.of(BotPlan.act(player.discardThink(sight, random), OldMaidMoves.discardAll()));
        }
        if (sight.isDrawing() && sight.targetCardCount() > 0) {
            return Optional.of(drawing(sight, random));
        }
        if (situation.kind() == PendingKind.REACTION && sight.canShuffle()) {
            return shuffling(situation, sight);
        }
        return Optional.empty();
    }

    private BotPlan drawing(OldMaidSight sight, Random random) {
        Duration think = ThinkTime.standard(random).plus(suspense(sight));
        int count = sight.targetCardCount();
        int chosen = random.nextInt(count);
        return OldMaidMoves.drawPlan(think, player.lifts(count, chosen, random), chosen, random);
    }

    private static Duration suspense(OldMaidSight sight) {
        if (sight.isSuddenDeath()) {
            return SUDDEN_DEATH_PAUSE;
        }
        return Duration.ZERO;
    }

    private Optional<BotPlan> shuffling(BotSituation situation, OldMaidSight sight) {
        Duration think = situation.real(ThinkTime.standard(situation.random()));
        return player.shuffleDelay(sight, situation.now(), think)
                .map(situation::planned)
                .map(delay -> BotPlan.act(delay, OldMaidMoves.shuffle()));
    }

    @Override
    public Optional<GameAction> fallback(Object view, Random random) {
        return OldMaidAuto.decide(OldMaidSight.of(view), random);
    }
}
