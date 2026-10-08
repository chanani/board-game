package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameSessionFactories;
import com.boardgame.game.GameType;
import com.boardgame.game.PendingKind;
import com.boardgame.game.bot.BotBrains;
import com.boardgame.game.bot.BotPlan;
import com.boardgame.game.bot.BotSituation;
import com.boardgame.member.domain.Avatar;
import com.boardgame.room.api.BotDifficultyRequest;
import com.boardgame.room.api.CreateRoomRequest;
import com.boardgame.room.domain.FakeRoomPasswordHasher;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomRegistry;
import com.boardgame.support.FakeTaskScheduler;
import com.boardgame.support.FakeTaskScheduler.ScheduledTask;
import com.boardgame.support.FixedRandom;
import com.boardgame.support.MutableClock;
import com.boardgame.uno.UnoEventType;
import com.boardgame.uno.UnoSessionFactory;
import com.boardgame.uno.view.UnoSessionView;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

// 진짜 우노 세션과 흐르는 시계로 구동기의 "결정이 그대로면 예약을 그대로 둔다"(R19)를 본다.
// 화면에는 서버 시각(serverNow)이 실리므로, 시각을 빼고 비교하지 않으면 방송마다 예약이 다시 시작된다.
class BotDriverClockTest {

    private static final String CODE = "CLOCKS";
    private static final long HOST = 1L;
    private static final long BOT = -1L;
    private static final GameAction DRAW = new GameAction("DRAW", null, null);

    private final MutableClock clock = new MutableClock(Instant.parse("2026-10-08T00:00:00Z"));
    private final FakeTaskScheduler botTasks = new FakeTaskScheduler();
    private final ScriptedBrain brain = new ScriptedBrain(GameType.UNO);
    private RoomService service;

    @BeforeEach
    void startWithBotToMove() {
        brain.planner = situation -> Optional.of(BotPlan.act(Duration.ofMillis(800), DRAW));
        // 덱을 그대로 두면 처음 카드가 리버스다. 세 번째 자리에서 시작해 방향이 바뀌므로 두 번째 자리(컴퓨터 1)가 먼저 한다.
        UnoSessionFactory uno = new UnoSessionFactory(clock, cards -> new ArrayList<>(cards), count -> 2);
        ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
        BotDriver driver = new BotDriver(new BotScheduler(botTasks, clock, 1.0), new BotBrains(List.of(brain)),
                new FixedRandom(0));
        service = new RoomService(new RoomRegistry(), () -> new RoomCode(CODE),
                new GameSessionFactories(List.of(uno)), mock(RoomNotifier.class), new OutcomePublisher(events),
                events, clock, new PresenceTracker(), new FakeRoomPasswordHasher(),
                new TurnTimer(new FakeTaskScheduler()), new FixedRandom(0), new RoomAvatars(Avatar::defaultFor),
                driver);
        service.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("방", GameType.UNO, 4, null));
        service.addBot(CODE, HOST, new BotDifficultyRequest("EASY"));
        service.addBot(CODE, HOST, new BotDifficultyRequest("HARD"));
        service.start(CODE, HOST);
    }

    @Test
    void R19_시계가_흐른_뒤_관전자가_들어와도_차례인_컴퓨터의_예약은_그대로다() {
        assertThat(brain.situations).extracting(BotSituation::kind).containsExactly(PendingKind.TURN);
        assertThat(brain.situations.get(0).view()).isInstanceOf(UnoSessionView.class);
        ScheduledTask original = botTasks.latest();
        int scheduled = botTasks.tasks().size();

        clock.advance(Duration.ofMillis(300));
        service.watch(CODE, new LoginMember(3L, "관전자"));

        assertThat(brain.situations).hasSize(1);
        assertThat(botTasks.tasks()).hasSize(scheduled);
        original.run();
        UnoSessionView seen = (UnoSessionView) brain.observed.get(brain.observed.size() - 1);
        assertThat(seen.game().events()).anySatisfy(event -> {
            assertThat(event.type()).isEqualTo(UnoEventType.DRAW);
            assertThat(event.actorId()).isEqualTo(BOT);
        });
    }
}
