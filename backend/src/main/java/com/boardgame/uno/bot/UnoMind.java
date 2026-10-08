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
// 잡기 창이 열려 있으면 그 창에서 한 번 정한 대로 반응하고(대상이 남이면 잡기 R32, 나면 우노 외치기),
// 아니면 차례일 때 생각 시간(R19) 뒤 차례 행동을 한다.
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
        Optional<BotPlan> reacted = reactionPlan(sight, situation);
        if (reacted.isPresent() || situation.kind() != PendingKind.TURN) {
            return reacted;
        }
        Random random = situation.random();
        return Optional.of(BotPlan.act(ThinkTime.standard(random), style.turn(sight, random)));
    }

    // 잡기 창 반응: 남이 대상이면 잡을 수 있을 때 잡기, 내가 대상이면 외칠 수 있을 때 외치기. 결정은 창마다 한 번(CatchWindow).
    private Optional<BotPlan> reactionPlan(UnoSight sight, BotSituation situation) {
        Optional<Long> target = sight.catchTarget()
                .filter(open -> canReact(sight, open));
        if (target.isEmpty()) {
            return Optional.empty();
        }
        long open = target.get();
        GameAction move = moveFor(sight, open);
        return window.decide(open, situation.now(), () -> decision(sight, open, situation.random()).map(situation::real))
                .map(situation::planned)
                .map(delay -> BotPlan.act(delay, move));
    }

    private static boolean canReact(UnoSight sight, long open) {
        if (open == sight.me()) {
            return sight.canCall();
        }
        return sight.canCatch();
    }

    private static GameAction moveFor(UnoSight sight, long open) {
        if (open == sight.me()) {
            return UnoMoves.callUno();
        }
        return UnoMoves.catchUno(open);
    }

    private Optional<Duration> decision(UnoSight sight, long open, Random random) {
        if (open == sight.me()) {
            return style.call(random);
        }
        return style.catchHabit()
                .filter(habit -> habit.tries(random))
                .map(habit -> habit.delay(random));
    }

    @Override
    public Optional<GameAction> fallback(Object view, Random random) {
        return UnoAuto.fallback(UnoSight.of(view));
    }
}
