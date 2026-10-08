package com.boardgame.room.application;

import com.boardgame.game.GameAction;
import com.boardgame.game.PendingActor;
import com.boardgame.game.bot.BotBrains;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.game.bot.BotMind;
import com.boardgame.game.bot.BotPlan;
import com.boardgame.game.bot.BotSituation;
import com.boardgame.game.bot.ThinkTime;
import com.boardgame.room.domain.BotProfile;
import com.boardgame.room.domain.Participant;
import com.boardgame.room.domain.Room;
import com.boardgame.room.domain.RoomCode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

// D1·R17~R21: 서버 안의 컴퓨터 구동. 상태가 바뀔 때마다(RoomService.broadcast) 행동할 컴퓨터마다 한 번 계획을 받아 예약하고,
// 실행 때 상태 번호가 그대로일 때만 RoomService가 사람과 같은 경로로 적용한다.
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
        return new BotDriver(null, new BotBrains(List.of()), new Random());
    }

    /** 상태가 바뀐 뒤 방 잠금 안에서 부른다. R19: 행동할 컴퓨터마다 한 번 예약한다. 이전 예약은 R20으로 무효가 된다. */
    public void afterChange(Room room, BotRunner runner) {
        if (!room.isGameInProgress() || room.bots().isEmpty()) {
            rooms.forget(room.code());
            return;
        }
        BotRoom state = rooms.refresh(room, () -> mindsOf(room));
        state.observe(room);
        room.pendingActors()
                .stream()
                .filter(actor -> room.isBot(actor.memberId()))
                .forEach(actor -> plan(room, state, actor, runner));
    }

    /** R20: 예약 뒤로 상태가 바뀌지 않았고 게임이 이어지며 그 컴퓨터가 아직 게임 중일 때만 참. */
    public boolean isCurrent(Room room, BotTicket ticket) {
        boolean sameState = rooms.find(ticket.code())
                .filter(state -> state.isAt(ticket.epoch()))
                .isPresent();
        return sameState && room.isPlaying(ticket.botId());
    }

    /** 신호 걸음 뒤 같은 상태 번호로 다음 걸음을 예약한다. */
    public void continueWith(BotTicket ticket, BotRunner runner) {
        ticket.next().ifPresent(next -> schedule(next, runner));
    }

    /** R21: 기존 자동 행동과 같은 결정(서버가 컴퓨터 행동을 거절했을 때 한 번). */
    public Optional<GameAction> fallback(Room room, long botId) {
        Optional<BotMind> mind = rooms.find(room.code())
                .flatMap(state -> state.mindOf(botId));
        Optional<Object> view = room.viewFor(botId);
        if (mind.isEmpty() || view.isEmpty()) {
            return Optional.empty();
        }
        return mind.get().fallback(view.get(), random);
    }

    public void forget(RoomCode code) {
        rooms.forget(code);
    }

    private Map<Long, BotMind> mindsOf(Room room) {
        Map<Long, BotMind> minds = new HashMap<>();
        room.bots().forEach(bot -> brains.mind(room.gameType(), difficultyOf(bot))
                .ifPresent(mind -> minds.put(bot.memberId(), mind)));
        return minds;
    }

    private static BotDifficulty difficultyOf(Participant bot) {
        BotProfile profile = bot.bot();
        return profile.difficulty();
    }

    private void plan(Room room, BotRoom state, PendingActor actor, BotRunner runner) {
        long botId = actor.memberId();
        Optional<BotMind> mind = state.mindOf(botId);
        Optional<Object> view = room.viewFor(botId);
        if (mind.isEmpty() || view.isEmpty()) {
            return;
        }
        BotSituation situation = new BotSituation(view.get(), actor.kind(), scheduler.now(), random);
        planSafely(mind.get(), situation)
                .ifPresent(plan -> schedule(new BotTicket(room.code(), botId, state.epoch(), plan), runner));
    }

    // R21: 판단이 예외를 내면 기록하고, 기존 자동 행동과 같은 결정을 생각 시간 뒤에 한 번 한다.
    private Optional<BotPlan> planSafely(BotMind mind, BotSituation situation) {
        try {
            return mind.plan(situation);
        } catch (RuntimeException exception) {
            log.warn("컴퓨터 판단 실패, 자동 행동으로 대신한다", exception);
            return mind.fallback(situation.view(), random)
                    .map(action -> BotPlan.act(ThinkTime.standard(random), action));
        }
    }

    private void schedule(BotTicket ticket, BotRunner runner) {
        scheduler.schedule(ticket.step().delay(), () -> runner.run(ticket));
    }
}
