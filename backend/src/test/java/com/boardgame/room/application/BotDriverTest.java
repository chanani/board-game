package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameSession;
import com.boardgame.game.GameSessionFactories;
import com.boardgame.game.GameSessionFactory;
import com.boardgame.game.GameType;
import com.boardgame.game.PendingActor;
import com.boardgame.game.PendingKind;
import com.boardgame.game.bot.BotBrains;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.game.bot.BotPlan;
import com.boardgame.game.bot.BotSituation;
import com.boardgame.game.bot.BotStep;
import com.boardgame.member.domain.Avatar;
import com.boardgame.room.api.BotDifficultyRequest;
import com.boardgame.room.api.CreateRoomRequest;
import com.boardgame.room.domain.FakeGameSession;
import com.boardgame.room.domain.FakeRoomPasswordHasher;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomRegistry;
import com.boardgame.support.FakeTaskScheduler;
import com.boardgame.support.FakeTaskScheduler.ScheduledTask;
import com.boardgame.support.FixedRandom;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

// 가짜 예약기로 컴퓨터 생각 시간을 기다리지 않고 직접 실행한다. 세션은 모든 참가자가 함께 기다리는 FakeGameSession.
class BotDriverTest {

    private static final String CODE = "ROBOTS";
    private static final RoomCode ROOM_CODE = new RoomCode(CODE);
    private static final long HOST = 1L;
    private static final long BOT = -1L;
    private static final Instant T0 = Instant.parse("2026-10-08T00:00:00Z");
    private static final GameAction HOST_FLIP = new GameAction("FLIP", 1, 1);

    private final MutableClock clock = new MutableClock(T0);
    private final RoomRegistry registry = new RoomRegistry();
    private final RoomNotifier notifier = mock(RoomNotifier.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final FakeTaskScheduler botTasks = new FakeTaskScheduler();
    private final ScriptedBrain brain = new ScriptedBrain();
    private final AtomicReference<FakeGameSession> session = new AtomicReference<>();
    private final GameSessionFactory factory = new GameSessionFactory() {
        @Override
        public GameType type() {
            return GameType.PAPER_SAFARI;
        }

        @Override
        public GameSession create(List<Long> memberIds) {
            FakeGameSession created = new FakeGameSession(memberIds);
            created.awaitActors(memberIds.stream().map(PendingActor::together).toList());
            session.set(created);
            return created;
        }
    };
    private final RoomService service = serviceWith(registry);

    private RoomService serviceWith(RoomRegistry rooms) {
        BotDriver driver = new BotDriver(new BotScheduler(botTasks, clock, 1.0), new BotBrains(List.of(brain)),
                new FixedRandom(0));
        return new RoomService(rooms, () -> ROOM_CODE, new GameSessionFactories(List.of(factory)), notifier,
                new OutcomePublisher(events), events, clock, new PresenceTracker(), new FakeRoomPasswordHasher(),
                new TurnTimer(new FakeTaskScheduler()), new FixedRandom(0), new RoomAvatars(Avatar::defaultFor), driver);
    }

    @BeforeEach
    void startWithTwoBots() {
        service.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("방", GameType.PAPER_SAFARI, 4, null));
        service.addBot(CODE, HOST, new BotDifficultyRequest("EASY"));
        service.addBot(CODE, HOST, new BotDifficultyRequest("HARD"));
        service.start(CODE, HOST);
    }

    @Test
    void R19_시작하면_행동할_컴퓨터마다_생각_시간_뒤로_한_번씩_예약한다() {
        assertThat(brain.made).containsExactly(BotDifficulty.EASY, BotDifficulty.HARD);
        assertThat(botTasks.tasks()).hasSize(2);
        assertThat(botTasks.tasks()).extracting(ScheduledTask::startTime).containsOnly(T0.plusMillis(800));
        assertThat(brain.situations).extracting(BotSituation::kind).containsOnly(PendingKind.TOGETHER);
    }

    @Test
    void R17_예약이_실행되면_사람과_같은_경로로_행동하고_다시_예약한다() {
        clearInvocations(notifier);

        botTasks.tasks().get(0).run();

        assertThat(session.get().actors()).containsExactly(BOT);
        assertThat(session.get().actions()).containsExactly(new GameAction("FLIP", 0, 0));
        verify(notifier).gameUpdated(eq(HOST), any());
        verify(notifier, never()).gameUpdated(eq(BOT), any());
        assertThat(botTasks.tasks()).hasSize(4);
    }

    @Test
    void R20_예약_뒤에_상태가_바뀌면_옛_예약은_아무것도_하지_않는다() {
        ScheduledTask stale = botTasks.tasks().get(1);

        service.act(CODE, HOST, HOST_FLIP);
        stale.run();

        assertThat(session.get().actors()).containsExactly(HOST);
    }

    @Test
    void R20_게임이_끝나면_옛_예약은_아무것도_하지_않는다() {
        ScheduledTask stale = botTasks.tasks().get(0);
        session.get().finishOnAct();
        service.act(CODE, HOST, HOST_FLIP);
        int scheduled = botTasks.tasks().size();

        stale.run();

        assertThat(session.get().actors()).containsExactly(HOST);
        assertThat(botTasks.tasks()).hasSize(scheduled);
    }

    @Test
    void R13_R20_사람이_모두_나가_방이_닫히면_예약은_아무것도_하지_않는다() {
        ScheduledTask stale = botTasks.tasks().get(0);

        service.leave(CODE, HOST);
        stale.run();

        assertThat(registry.find(ROOM_CODE)).isEmpty();
        assertThat(session.get().actions()).isEmpty();
    }

    @Test
    void R21_판단이_예외를_내면_자동_행동_결정을_생각_시간_뒤에_한다() {
        brain.planner = situation -> {
            throw new IllegalStateException("판단 실패");
        };
        service.act(CODE, HOST, HOST_FLIP);

        botTasks.latest().run();

        assertThat(session.get().actions()).containsExactly(HOST_FLIP, new GameAction("AUTO", null, null));
    }

    @Test
    void R21_서버가_거절하면_자동_행동을_한_번_시도한다() {
        brain.planner = situation -> Optional.of(BotPlan.act(Duration.ofMillis(800), new GameAction("BAD", null, null)));
        session.get().rejectType("BAD");
        service.act(CODE, HOST, HOST_FLIP);

        botTasks.latest().run();

        assertThat(session.get().actions()).containsExactly(HOST_FLIP, new GameAction("AUTO", null, null));
    }

    @Test
    void R21_자동_행동도_거절되면_조용히_멈추고_시간_초과_처리에_맡긴다() {
        brain.planner = situation -> Optional.of(BotPlan.act(Duration.ofMillis(800), new GameAction("BAD", null, null)));
        brain.fallbackAction = new GameAction("BAD", null, null);
        session.get().rejectType("BAD");
        service.act(CODE, HOST, HOST_FLIP);

        botTasks.latest().run();

        assertThat(session.get().actions()).containsExactly(HOST_FLIP);
    }

    @Test
    void R16_컴퓨터_판단의_입력은_그_컴퓨터_자리_화면뿐이다() {
        assertThat(brain.observed).containsOnly("view--1", "view--2");
        assertThat(brain.situations).extracting(BotSituation::view).containsExactly("view--1", "view--2");
    }

    @Test
    void 신호_걸음은_상태를_바꾸지_않고_같은_번호로_다음_걸음을_예약한다() {
        GameAction peek = new GameAction("PEEK", null, null, null, null, null, 2);
        GameAction draw = new GameAction("DRAW", null, null, null, null, null, 2);
        brain.planner = situation -> Optional.of(BotPlan.of(
                BotStep.signal(Duration.ofMillis(800), peek), BotStep.act(Duration.ofMillis(300), draw)));
        session.get().replySignal("lift");
        service.act(CODE, HOST, HOST_FLIP);
        int before = botTasks.tasks().size();

        botTasks.tasks().get(before - 2).run();

        verify(notifier).gameSignal(HOST, "lift");
        verify(notifier, never()).gameSignal(eq(BOT), any());
        assertThat(botTasks.tasks()).hasSize(before + 1);
        assertThat(botTasks.latest().startTime()).isEqualTo(T0.plusMillis(300));
        botTasks.latest().run();
        assertThat(session.get().actors()).containsExactly(HOST, BOT);
        assertThat(session.get().actions()).endsWith(draw);
    }

    @Test
    void 사람끼리_하는_판은_아무것도_예약하지_않는다() {
        FakeTaskScheduler before = botTasks;
        int scheduled = before.tasks().size();
        RoomService humans = serviceWith(new RoomRegistry());
        humans.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("방", GameType.PAPER_SAFARI, 4, null));
        humans.join(CODE, new LoginMember(2L, "밥"), null);
        humans.setReady(CODE, 2L, true);

        humans.start(CODE, HOST);
        humans.act(CODE, HOST, HOST_FLIP);

        assertThat(botTasks.tasks()).hasSize(scheduled);
    }
}
