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
        Duration think = ThinkTime.standard(random);
        int count = sight.targetCardCount();
        int chosen = random.nextInt(count);
        return OldMaidMoves.drawPlan(think, player.lifts(count, chosen, random), chosen, random);
    }

    private Optional<BotPlan> shuffling(BotSituation situation, OldMaidSight sight) {
        Duration think = ThinkTime.standard(situation.random());
        return player.shuffle(sight, situation.now().plus(think))
                .map(action -> BotPlan.act(think, action));
    }

    @Override
    public Optional<GameAction> fallback(Object view, Random random) {
        return OldMaidAuto.decide(OldMaidSight.of(view), random);
    }
}
