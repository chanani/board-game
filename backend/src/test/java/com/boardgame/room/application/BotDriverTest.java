package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.doThrow;
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
import com.boardgame.game.bot.BotMind;
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
    private static final long BOT_2 = -2L;
    private static final GameAction BOT_FLIP = new GameAction("FLIP", 0, 0);
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

    // 사람이 행동한 뒤 두 컴퓨터의 결정이 동시 단계에서 차례 행동으로 바뀐다(결정이 바뀌므로 둘 다 새로 계획한다).
    private void hostMovesAndBotsTakeTurns() {
        session.get().awaitActors(List.of(PendingActor.turn(BOT), PendingActor.turn(BOT_2)));
        service.act(CODE, HOST, HOST_FLIP);
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
        // 행동한 컴퓨터만 새로 계획한다. 다른 컴퓨터의 동시 단계 결정은 그대로라 예약도 그대로 둔다.
        assertThat(botTasks.tasks()).hasSize(3);
    }

    @Test
    void R20_예약_뒤에_상태가_바뀌면_옛_예약은_아무것도_하지_않는다() {
        ScheduledTask stale = botTasks.tasks().get(1);

        hostMovesAndBotsTakeTurns();
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
        hostMovesAndBotsTakeTurns();

        botTasks.latest().run();

        assertThat(session.get().actions()).containsExactly(HOST_FLIP, new GameAction("AUTO", null, null));
    }

    @Test
    void R21_서버가_거절하면_자동_행동을_한_번_시도한다() {
        brain.planner = situation -> Optional.of(BotPlan.act(Duration.ofMillis(800), new GameAction("BAD", null, null)));
        session.get().rejectType("BAD");
        hostMovesAndBotsTakeTurns();

        botTasks.latest().run();

        assertThat(session.get().actions()).containsExactly(HOST_FLIP, new GameAction("AUTO", null, null));
    }

    @Test
    void R21_자동_행동도_거절되면_조용히_멈추고_시간_초과_처리에_맡긴다() {
        brain.planner = situation -> Optional.of(BotPlan.act(Duration.ofMillis(800), new GameAction("BAD", null, null)));
        brain.fallbackAction = new GameAction("BAD", null, null);
        session.get().rejectType("BAD");
        hostMovesAndBotsTakeTurns();

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
        hostMovesAndBotsTakeTurns();
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

    @Test
    void R19_동시_단계에서_다른_사람이_행동해도_컴퓨터의_예약은_그대로다() {
        ScheduledTask original = botTasks.tasks().get(1);

        service.act(CODE, HOST, HOST_FLIP);
        original.run();

        assertThat(botTasks.tasks()).hasSize(3);
        assertThat(session.get().actors()).containsExactly(HOST, BOT_2);
    }

    @Test
    void R19_관전자가_들어와도_결정이_그대로인_컴퓨터의_예약은_그대로다() {
        hostMovesAndBotsTakeTurns();
        int scheduled = botTasks.tasks().size();
        ScheduledTask original = botTasks.latest();
        int asked = brain.situations.size();

        service.watch(CODE, new LoginMember(3L, "관전자"));

        assertThat(brain.situations).hasSize(asked);
        assertThat(botTasks.tasks()).hasSize(scheduled);
        original.run();
        assertThat(session.get().actors()).containsExactly(HOST, BOT_2);
    }

    @Test
    void R18_차례_밖_행동을_하지_않기로_하면_예약하지_않고_같은_상태에서_다시_묻지_않는다() {
        brain.planner = situation -> Optional.empty();
        session.get().awaitActors(List.of(PendingActor.reaction(BOT), PendingActor.reaction(BOT_2)));
        service.act(CODE, HOST, HOST_FLIP);
        int scheduled = botTasks.tasks().size();
        int asked = brain.situations.size();

        service.watch(CODE, new LoginMember(3L, "관전자"));

        assertThat(scheduled).isEqualTo(2);
        assertThat(brain.situations).hasSize(asked);
        assertThat(botTasks.tasks()).hasSize(scheduled);
    }

    @Test
    void R21_관찰이_실패해도_사람의_행동은_성공하고_컴퓨터는_한_번만_행동한다() {
        brain.observer = view -> {
            throw new IllegalStateException("관찰 실패");
        };

        assertThatCode(() -> service.act(CODE, HOST, HOST_FLIP)).doesNotThrowAnyException();
        botTasks.tasks().get(0).run();

        assertThat(session.get().actors()).containsExactly(HOST, BOT);
        assertThat(session.get().actions()).containsExactly(HOST_FLIP, BOT_FLIP);
    }

    @Test
    void R21_마음을_만들지_못해도_게임은_시작되고_그_컴퓨터는_예약하지_않는다() {
        int scheduled = botTasks.tasks().size();
        brain.failMind = true;
        RoomService other = serviceWith(new RoomRegistry());
        other.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("방", GameType.PAPER_SAFARI, 4, null));
        other.addBot(CODE, HOST, new BotDifficultyRequest("EASY"));

        assertThatCode(() -> other.start(CODE, HOST)).doesNotThrowAnyException();
        assertThat(botTasks.tasks()).hasSize(scheduled);
    }

    @Test
    void R21_행동이_적용된_뒤의_실패로는_자동_행동을_하지_않는다() {
        doThrow(new IllegalStateException("방송 실패")).when(notifier).roomUpdated(any());

        botTasks.tasks().get(0).run();

        assertThat(session.get().actors()).containsExactly(BOT);
        assertThat(session.get().actions()).containsExactly(BOT_FLIP);
    }

    @Test
    void 새_게임마다_컴퓨터의_마음을_새로_만들고_지난_게임의_마음을_다시_쓰지_않는다() {
        List<BotMind> first = List.copyOf(brain.minds);
        session.get().finishOnAct();
        service.act(CODE, HOST, HOST_FLIP);
        service.changeBot(CODE, HOST, BOT, new BotDifficultyRequest("MEDIUM"));

        service.start(CODE, HOST);
        botTasks.latest().run();

        assertThat(brain.made).containsExactly(BotDifficulty.EASY, BotDifficulty.HARD, BotDifficulty.MEDIUM,
                BotDifficulty.HARD);
        assertThat(brain.minds).hasSize(4);
        assertThat(brain.minds.subList(2, 4)).doesNotContainAnyElementsOf(first);
    }
}
