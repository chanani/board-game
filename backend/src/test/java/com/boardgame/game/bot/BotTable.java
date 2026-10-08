package com.boardgame.game.bot;

import com.boardgame.common.error.BusinessException;
import com.boardgame.game.ClockFreeView;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameSession;
import com.boardgame.game.PendingActor;
import com.boardgame.game.PendingKind;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.Set;
import java.util.TreeMap;
import java.util.stream.Collectors;

// 방·예약기 없이 실제 세션 한 판을 컴퓨터만으로 끝까지 돌린다(시뮬레이션용).
// BotDriver와 같은 결정 경로를 흉내 낸다(시계는 가짜라 기다리지 않는다):
// - 상태가 바뀔 때마다 모든 마음에 자기 자리 화면(viewFor)만 observe시키고, 기다리는 컴퓨터마다 결정이 바뀌었을 때만
//   plan을 묻는다(같은 종류이고 동시 단계이거나 서버 시각을 뺀 자기 화면이 그대로면 예약을 그대로 둔다. 빈 계획도 기억한다).
// - 예약 중 가장 먼저 올 걸음을 실행한다(R19). SIGNAL은 session.signal 후 같은 결정으로 다음 걸음을 예약하고,
//   ACT는 결정을 다 쓰고 session.act. 거절(BusinessException)이면 rejections++ 후 fallback을 한 번(R21).
// - 마감(session.deadline)이 먼저 오거나 예약이 하나도 없으면 timeouts++ 후 session.autoAct(시간 초과 처리).
public final class BotTable {

    private static final int MAX_STEPS = 5000;

    private final GameSession session;
    private final Map<Long, BotMind> minds;
    private final MutableClock clock;
    private final Map<Long, Intent> intents = new TreeMap<>();
    private final Map<String, Integer> applied = new HashMap<>();
    private int timeouts;
    private int rejections;
    private int steps;

    public BotTable(GameSession session, Map<Long, BotMind> minds, MutableClock clock) {
        this.session = session;
        this.minds = new TreeMap<>(minds);
        this.clock = clock;
    }

    public BotTable play(Random random) {
        afterChange(random);
        while (!session.isFinished() && steps < MAX_STEPS) {
            steps++;
            step(random);
        }
        return this;
    }

    public int timeouts() {
        return timeouts;
    }

    public int rejections() {
        return rejections;
    }

    public int steps() {
        return steps;
    }

    /** 게임이 받아 준 컴퓨터 행동 중 그 종류(GameAction.type)의 수. */
    public int applied(String type) {
        return applied.getOrDefault(type, 0);
    }

    public GameSession session() {
        return session;
    }

    private void afterChange(Random random) {
        if (session.isFinished()) {
            intents.clear();
            return;
        }
        minds.forEach((id, mind) -> mind.observe(session.viewFor(id)));
        List<PendingActor> pending = session.pendingActors()
                .stream()
                .filter(actor -> minds.containsKey(actor.memberId()))
                .toList();
        Set<Long> pendingIds = pending.stream()
                .map(PendingActor::memberId)
                .collect(Collectors.toSet());
        intents.keySet().retainAll(pendingIds);
        pending.forEach(actor -> consider(actor, random));
    }

    private void consider(PendingActor actor, Random random) {
        long id = actor.memberId();
        Object view = session.viewFor(id);
        Intent held = intents.get(id);
        if (held != null && held.stillHolds(actor.kind(), view)) {
            return;
        }
        Instant now = clock.instant();
        Optional<BotPlan> plan = minds.get(id).plan(new BotSituation(view, actor.kind(), now, random));
        intents.put(id, new Intent(actor.kind(), view, plan.orElse(null), plan.map(p -> now.plus(p.first().delay())).orElse(null)));
    }

    private void step(Random random) {
        Optional<Map.Entry<Long, Intent>> next = intents.entrySet()
                .stream()
                .filter(entry -> entry.getValue().plan() != null)
                .min(Comparator.comparing(entry -> entry.getValue().dueAt()));
        Optional<Instant> deadline = session.deadline();
        boolean timedOut = next.isEmpty()
                || deadline.filter(limit -> next.get().getValue().dueAt().isAfter(limit)).isPresent();
        if (timedOut) {
            timeOut(deadline, random);
            return;
        }
        run(next.get().getKey(), next.get().getValue(), random);
    }

    private void timeOut(Optional<Instant> deadline, Random random) {
        timeouts++;
        deadline.ifPresent(this::advanceTo);
        session.autoAct(random);
        afterChange(random);
    }

    private void run(long id, Intent intent, Random random) {
        advanceTo(intent.dueAt());
        BotStep step = intent.plan().first();
        if (step.isSignal()) {
            signal(id, step.action());
            Optional<BotPlan> rest = intent.plan().rest();
            intents.put(id, intent.continueWith(rest.orElse(null)));
            return;
        }
        intents.remove(id);
        if (tryAct(id, step.action())) {
            afterChange(random);
            return;
        }
        rejections++;
        Optional<GameAction> fallback = minds.get(id).fallback(session.viewFor(id), random);
        if (fallback.isPresent() && tryAct(id, fallback.get())) {
            afterChange(random);
        }
    }

    private void signal(long id, GameAction action) {
        try {
            session.signal(id, action);
        } catch (BusinessException exception) {
            rejections++;
        }
    }

    private boolean tryAct(long id, GameAction action) {
        try {
            session.act(id, action);
            applied.merge(action.type(), 1, Integer::sum);
            return true;
        } catch (BusinessException exception) {
            return false;
        }
    }

    private void advanceTo(Instant target) {
        Duration gap = Duration.between(clock.instant(), target);
        if (gap.isNegative()) {
            return;
        }
        clock.advance(gap);
    }

    // 컴퓨터 한 명의 살아 있는 결정(BotIntent 흉내): 그때의 종류·화면, 남은 계획(없으면 하지 않기로 함), 다음 걸음 시각.
    private record Intent(PendingKind kind, Object view, BotPlan plan, Instant dueAt) {

        boolean stillHolds(PendingKind currentKind, Object currentView) {
            if (kind != currentKind) {
                return false;
            }
            return kind == PendingKind.TOGETHER || ClockFreeView.of(view).equals(ClockFreeView.of(currentView));
        }

        Intent continueWith(BotPlan rest) {
            if (rest == null) {
                return new Intent(kind, view, null, null);
            }
            return new Intent(kind, view, rest, dueAt.plus(rest.first().delay()));
        }
    }
}
