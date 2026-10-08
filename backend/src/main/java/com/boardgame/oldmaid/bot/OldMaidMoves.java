package com.boardgame.oldmaid.bot;

import com.boardgame.game.GameAction;
import com.boardgame.game.bot.BotPlan;
import com.boardgame.game.bot.BotStep;
import com.boardgame.game.bot.ThinkTime;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import java.util.stream.IntStream;

final class OldMaidMoves {

    private static final int GAP_MIN_MILLIS = 300;
    private static final int GAP_MAX_MILLIS = 800;
    private static final int MAX_LIFTS = 3;

    private OldMaidMoves() {
    }

    static GameAction discardAll() {
        return new GameAction("DISCARD_ALL", null, null);
    }

    static GameAction draw(int index) {
        return indexed("DRAW", index);
    }

    static GameAction peek(int index) {
        return indexed("PEEK", index);
    }

    static GameAction shuffle() {
        return new GameAction("SHUFFLE", null, null);
    }

    private static GameAction indexed(String type, int index) {
        return new GameAction(type, null, null, null, null, null, index);
    }

    // R23: 고른 자리를 뺀 자리에서 1~3개를 겹치지 않게 든다(남은 자리가 모자라면 있는 만큼).
    static List<Integer> otherSlots(int count, int chosen, Random random) {
        List<Integer> pool = new ArrayList<>(IntStream.range(0, count)
                .filter(slot -> slot != chosen)
                .boxed()
                .toList());
        int wanted = Math.min(pool.size(), 1 + random.nextInt(MAX_LIFTS));
        List<Integer> picked = new ArrayList<>();
        for (int i = 0; i < wanted; i++) {
            picked.add(pool.remove(random.nextInt(pool.size())));
        }
        return picked;
    }

    // R23: 다른 자리들을 들었다가 고른 자리를 들고 뽑는다. 들 자리가 없으면 바로 뽑는다.
    static BotPlan drawPlan(Duration think, List<Integer> lifts, int chosen, Random random) {
        if (lifts.isEmpty()) {
            return BotPlan.act(think, draw(chosen));
        }
        List<BotStep> steps = new ArrayList<>();
        steps.add(BotStep.signal(think, peek(lifts.get(0))));
        lifts.stream()
                .skip(1)
                .forEach(slot -> steps.add(BotStep.signal(gap(random), peek(slot))));
        steps.add(BotStep.signal(gap(random), peek(chosen)));
        steps.add(BotStep.act(gap(random), draw(chosen)));
        return new BotPlan(steps);
    }

    private static Duration gap(Random random) {
        return ThinkTime.between(random, GAP_MIN_MILLIS, GAP_MAX_MILLIS);
    }
}
