package com.boardgame.room.application;

import com.boardgame.game.GameAction;
import com.boardgame.game.GameType;
import com.boardgame.game.PendingActor;
import com.boardgame.game.bot.BotBrains;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.game.bot.BotMind;
import com.boardgame.game.bot.BotPlan;
import com.boardgame.game.bot.BotSituation;
import com.boardgame.game.bot.BotStep;
import com.boardgame.game.bot.ThinkTime;
import com.boardgame.room.domain.BotProfile;
import com.boardgame.room.domain.Participant;
import com.boardgame.room.domain.Room;
import com.boardgame.room.domain.RoomCode;
import java.time.Clock;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import java.util.Set;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.scheduling.concurrent.SimpleAsyncTaskScheduler;
import org.springframework.stereotype.Component;

// D1·R17~R21: 서버 안의 컴퓨터 구동. 상태가 바뀔 때마다(RoomService.broadcast) 결정이 바뀐 컴퓨터마다 한 번 계획을 받아 예약하고,
// 실행 때 그 결정이 아직 살아 있을 때만 RoomService가 사람과 같은 경로로 적용한다.
// 결정이 그대로(같은 종류이고 자기 화면이 같거나 동시 단계)면 예약을 그대로 두어 관전자 입장 같은 방송이 생각 시간을 다시 시작하지 않게 한다.
// 컴퓨터 쪽 실패(마음 만들기·관찰·판단·자동 행동 결정)는 기록만 하고 삼킨다. 사람의 요청을 실패시키지 않는다.
@Component
public class BotDriver {

    private static final Logger log = LoggerFactory.getLogger(BotDriver.class);

    private final BotScheduler scheduler;
    private final BotBrains brains;
    private final Random random;
    private final BotRooms rooms = new BotRooms();

    public BotDriver(BotScheduler scheduler, BotBrains brains, @Qualifier(BotConfig.RANDOM) Random random) {
        this.scheduler = scheduler;
        this.brains = brains;
        this.random = random;
    }

    /** 컴퓨터를 움직이지 않는 구동기(기존 12인자 RoomService 생성자용). 머리가 없어 아무것도 예약하지 않는다. */
    public static BotDriver idle() {
        BotScheduler scheduler = new BotScheduler(new SimpleAsyncTaskScheduler(), Clock.systemUTC(), 1.0);
        return new BotDriver(scheduler, new BotBrains(List.of()), new Random());
    }

    /** 상태가 바뀐 뒤 방 잠금 안에서 부른다. R19: 결정이 바뀐 컴퓨터마다 한 번 예약한다. 예외를 밖으로 내지 않는다. */
    public void afterChange(Room room, BotRunner runner) {
        try {
            drive(room, runner);
        } catch (RuntimeException exception) {
            log.warn("컴퓨터 구동 실패: room={}", room.codeValue(), exception);
        }
    }

    private void drive(Room room, BotRunner runner) {
        if (!room.isGameInProgress() || room.bots().isEmpty()) {
            rooms.forget(room.code());
            return;
        }
        BotRoom state = rooms.refresh(room, () -> mindsOf(room));
        state.observe(room);
        List<PendingActor> pending = pendingBots(room);
        state.retainOnly(idsOf(pending));
        pending.forEach(actor -> consider(room, state, actor, runner));
    }

    private static List<PendingActor> pendingBots(Room room) {
        return room.pendingActors()
                .stream()
                .filter(actor -> room.isBot(actor.memberId()))
                .toList();
    }

    private static Set<Long> idsOf(List<PendingActor> actors) {
        return actors.stream()
                .map(PendingActor::memberId)
                .collect(Collectors.toSet());
    }

    /** R20: 그 컴퓨터의 결정이 아직 살아 있고(상태가 결정을 바꾸지 않음) 그 컴퓨터가 아직 게임 중일 때만 참. */
    public boolean isCurrent(Room room, BotTicket ticket) {
        boolean live = rooms.find(ticket.code())
                .filter(state -> state.isLive(ticket.botId(), ticket.epoch()))
                .isPresent();
        return live && room.isPlaying(ticket.botId());
    }

    /** 행동 걸음을 실행하기 직전에 부른다. 그 결정은 다 썼으니 다음 상태 변화에서 새로 정한다. */
    public void consume(BotTicket ticket) {
        rooms.find(ticket.code())
                .ifPresent(state -> state.consume(ticket.botId(), ticket.epoch()));
    }

    /** 신호 걸음 뒤 같은 예약 번호로 다음 걸음을 예약한다. */
    public void continueWith(BotTicket ticket, BotRunner runner) {
        ticket.next()
                .ifPresent(next -> schedule(next, runner));
    }

    /** R21: 기존 자동 행동과 같은 결정(서버가 컴퓨터 행동을 거절했을 때 한 번). 실패하면 빈 값. */
    public Optional<GameAction> fallback(Room room, long botId) {
        Optional<BotMind> mind = rooms.find(room.code())
                .flatMap(state -> state.mindOf(botId));
        Optional<Object> view = room.viewFor(botId);
        if (mind.isEmpty() || view.isEmpty()) {
            return Optional.empty();
        }
        return fallbackSafely(mind.get(), view.get());
    }

    public void forget(RoomCode code) {
        rooms.forget(code);
    }

    private Map<Long, BotMind> mindsOf(Room room) {
        Map<Long, BotMind> minds = new HashMap<>();
        room.bots()
                .forEach(bot -> mindSafely(room.gameType(), bot).ifPresent(mind -> minds.put(bot.memberId(), mind)));
        return minds;
    }

    // 마음을 만들지 못한 컴퓨터는 이 게임 동안 움직이지 않는다(시간 초과 처리가 진행시킨다).
    private Optional<BotMind> mindSafely(GameType type, Participant bot) {
        try {
            return brains.mind(type, difficultyOf(bot));
        } catch (RuntimeException exception) {
            log.warn("컴퓨터 마음 만들기 실패: bot={}", bot.memberId(), exception);
            return Optional.empty();
        }
    }

    private static BotDifficulty difficultyOf(Participant bot) {
        BotProfile profile = bot.bot();
        return profile.difficulty();
    }

    private void consider(Room room, BotRoom state, PendingActor actor, BotRunner runner) {
        try {
            decide(room, state, actor, runner);
        } catch (RuntimeException exception) {
            log.warn("컴퓨터 예약 실패: room={}, bot={}", room.codeValue(), actor.memberId(), exception);
        }
    }

    private void decide(Room room, BotRoom state, PendingActor actor, BotRunner runner) {
        long botId = actor.memberId();
        Optional<BotMind> mind = state.mindOf(botId);
        Optional<Object> view = room.viewFor(botId);
        if (mind.isEmpty() || view.isEmpty() || state.holds(botId, actor.kind(), view.get())) {
            return;
        }
        long epoch = rooms.nextEpoch();
        state.hold(botId, new BotIntent(epoch, actor.kind(), view.get()));
        BotSituation situation = new BotSituation(view.get(), actor.kind(), scheduler.now(), random, scheduler.pace());
        planSafely(mind.get(), situation)
                .ifPresent(plan -> schedule(new BotTicket(room.code(), botId, epoch, plan), runner));
    }

    // R21: 판단이 예외를 내면 기록하고, 기존 자동 행동과 같은 결정을 생각 시간 뒤에 한 번 한다.
    private Optional<BotPlan> planSafely(BotMind mind, BotSituation situation) {
        try {
            return mind.plan(situation);
        } catch (RuntimeException exception) {
            log.warn("컴퓨터 판단 실패, 자동 행동으로 대신한다", exception);
            return fallbackSafely(mind, situation.view())
                    .map(action -> BotPlan.act(ThinkTime.standard(random), action));
        }
    }

    private Optional<GameAction> fallbackSafely(BotMind mind, Object view) {
        try {
            return mind.fallback(view, random);
        } catch (RuntimeException exception) {
            log.warn("컴퓨터 자동 행동 결정 실패, 시간 초과 처리에 맡긴다", exception);
            return Optional.empty();
        }
    }

    private void schedule(BotTicket ticket, BotRunner runner) {
        BotStep step = ticket.step();
        scheduler.schedule(step.delay(), () -> runner.run(ticket));
    }
}
