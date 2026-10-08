package com.boardgame.uno.bot;

import com.boardgame.game.GameAction;
import com.boardgame.game.PendingKind;
import com.boardgame.game.bot.BotMind;
import com.boardgame.game.bot.BotPlan;
import com.boardgame.game.bot.BotSituation;
import com.boardgame.game.bot.ThinkTime;
import java.time.Duration;
import java.util.Optional;
import java.util.Random;

// 우노 컴퓨터 한 명의 한 게임 동안의 판단. 입력은 자기 자리 화면뿐이다(R16).
// 잡기 창이 열려 있으면 그 창에서 한 번 정한 대로 잡고(R32), 아니면 차례일 때 생각 시간(R19) 뒤 차례 행동을 한다.
final class UnoMind implements BotMind {

    private final UnoStyle style;
    private final CatchWindow window = new CatchWindow();

    UnoMind(UnoStyle style) {
        this.style = style;
    }

    @Override
    public void observe(Object view) {
        UnoSight sight = UnoSight.of(view);
        window.forgetIfClosed(sight.catchTarget());
    }

    @Override
    public Optional<BotPlan> plan(BotSituation situation) {
        UnoSight sight = UnoSight.of(situation.view());
        window.forgetIfClosed(sight.catchTarget());
        Optional<BotPlan> caught = catchPlan(sight, situation);
        if (caught.isPresent() || situation.kind() != PendingKind.TURN) {
            return caught;
        }
        Random random = situation.random();
        return Optional.of(BotPlan.act(ThinkTime.standard(random), style.turn(sight, random)));
    }

    // R32: 대상이 내가 아니고 잡을 수 있을 때만. 결정은 창마다 한 번(CatchWindow).
    private Optional<BotPlan> catchPlan(UnoSight sight, BotSituation situation) {
        Optional<Long> target = sight.catchTarget()
                .filter(open -> open != sight.me());
        if (!sight.canCatch() || target.isEmpty()) {
            return Optional.empty();
        }
        long open = target.get();
        return window.decide(open, situation.now(), () -> decision(situation).map(situation::real))
                .map(situation::planned)
                .map(delay -> BotPlan.act(delay, UnoMoves.catchUno(open)));
    }

    private Optional<Duration> decision(BotSituation situation) {
        Random random = situation.random();
        return style.catchHabit()
                .filter(habit -> habit.tries(random))
                .map(habit -> habit.delay(random));
    }

    @Override
    public Optional<GameAction> fallback(Object view, Random random) {
        return UnoAuto.fallback(UnoSight.of(view));
    }
}
