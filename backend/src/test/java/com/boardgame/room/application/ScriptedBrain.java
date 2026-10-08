package com.boardgame.room.application;

import com.boardgame.game.GameAction;
import com.boardgame.game.GameType;
import com.boardgame.game.bot.BotBrain;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.game.bot.BotMind;
import com.boardgame.game.bot.BotPlan;
import com.boardgame.game.bot.BotSituation;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.function.Function;

// 정해 둔 계획을 돌려주고 받은 입력을 모두 기록하는 머리(BotDriverTest용). planner·fallbackAction은 테스트가 바꾼다.
final class ScriptedBrain implements BotBrain {

    final List<Object> observed = new ArrayList<>();
    final List<BotSituation> situations = new ArrayList<>();
    final List<BotDifficulty> made = new ArrayList<>();
    Function<BotSituation, Optional<BotPlan>> planner =
            situation -> Optional.of(BotPlan.act(Duration.ofMillis(800), new GameAction("FLIP", 0, 0)));
    GameAction fallbackAction = new GameAction("AUTO", null, null);

    @Override
    public GameType type() {
        return GameType.PAPER_SAFARI;
    }

    @Override
    public BotMind mind(BotDifficulty difficulty) {
        made.add(difficulty);
        return new BotMind() {
            @Override
            public void observe(Object view) {
                observed.add(view);
            }

            @Override
            public Optional<BotPlan> plan(BotSituation situation) {
                situations.add(situation);
                return planner.apply(situation);
            }

            @Override
            public Optional<GameAction> fallback(Object view, Random random) {
                return Optional.of(fallbackAction);
            }
        };
    }
}
