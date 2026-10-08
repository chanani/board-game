package com.boardgame.game.bot;

import com.boardgame.game.GameAction;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

// 컴퓨터가 지금 하기로 한 일. 신호 걸음들 뒤에 행동 걸음이 하나 오거나, 행동 하나뿐이다.
public record BotPlan(List<BotStep> steps) {

    public BotPlan {
        if (steps.isEmpty()) {
            throw new IllegalArgumentException("계획에는 걸음이 하나 이상 있어야 한다");
        }
        steps = List.copyOf(steps);
    }

    public static BotPlan of(BotStep... steps) {
        return new BotPlan(List.of(steps));
    }

    public static BotPlan act(Duration delay, GameAction action) {
        return of(BotStep.act(delay, action));
    }

    public BotStep first() {
        return steps.get(0);
    }

    public Optional<BotPlan> rest() {
        if (steps.size() == 1) {
            return Optional.empty();
        }
        return Optional.of(new BotPlan(steps.subList(1, steps.size())));
    }

    /** 처음부터 마지막 걸음까지 걸리는 시간(시뮬레이션이 가장 먼저 끝나는 계획을 고를 때 쓴다). */
    public Duration total() {
        return steps.stream()
                .map(BotStep::delay)
                .reduce(Duration.ZERO, Duration::plus);
    }
}
