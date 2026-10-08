package com.boardgame.papersafari.bot;

import com.boardgame.game.GameAction;
import com.boardgame.game.bot.BotMind;
import com.boardgame.game.bot.BotPlan;
import com.boardgame.game.bot.BotSituation;
import com.boardgame.game.bot.ThinkTime;
import java.util.Optional;
import java.util.Random;

// 페이퍼 사파리 컴퓨터 한 명의 한 판. 내 결정을 기다릴 때만 생각 시간(R19) 뒤에 행동 하나를 한다.
final class PaperSafariMind implements BotMind {

    private final SafariPlayer player;
    private final SeenCards seen;

    PaperSafariMind(SafariPlayer player, SeenCards seen) {
        this.player = player;
        this.seen = seen;
    }

    @Override
    public void observe(Object view) {
        seen.observe(SafariSight.of(view));
    }

    @Override
    public Optional<BotPlan> plan(BotSituation situation) {
        SafariSight sight = SafariSight.of(situation.view());
        if (!sight.awaitsMe()) {
            return Optional.empty();
        }
        Random random = situation.random();
        return Optional.of(BotPlan.act(ThinkTime.standard(random), decide(sight, random)));
    }

    @Override
    public Optional<GameAction> fallback(Object view, Random random) {
        return SafariAuto.fallback(SafariSight.of(view), random);
    }

    private GameAction decide(SafariSight sight, Random random) {
        return switch (sight.phase()) {
            case SETUP_FLIP -> player.flip(sight, random);
            case DRAW -> player.draw(sight, random);
            case PLACE -> player.place(sight, random);
            case PEEK -> player.peek(sight, random);
            case ROUND_OVER -> throw new IllegalStateException("판이 끝나 행동을 정할 수 없어요");
        };
    }
}
