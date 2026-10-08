package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameSessionFactories;
import com.boardgame.game.GameType;
import com.boardgame.game.bot.BotBrain;
import com.boardgame.game.bot.BotBrains;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.game.bot.BotMind;
import com.boardgame.game.bot.BotPlan;
import com.boardgame.game.bot.BotSituation;
import com.boardgame.member.domain.Avatar;
import com.boardgame.papersafari.PaperSafariSessionFactory;
import com.boardgame.papersafari.view.BoardView;
import com.boardgame.papersafari.view.PaperSafariSessionView;
import com.boardgame.papersafari.view.PaperSafariView;
import com.boardgame.papersafari.view.SlotView;
import com.boardgame.room.api.BotDifficultyRequest;
import com.boardgame.room.api.CreateRoomRequest;
import com.boardgame.room.domain.FakeRoomPasswordHasher;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomRegistry;
import com.boardgame.support.FakeTaskScheduler;
import com.boardgame.support.FixedRandom;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

// R22: 실제 페이퍼 사파리 세션에서 컴퓨터의 행동이 "시간이 지나 자동으로…" 기록(AutoActorLog)에 남지 않는다.
class BotAutoActorLogTest {

    private static final String CODE = "ROBOTS";
    private static final RoomCode ROOM_CODE = new RoomCode(CODE);
    private static final long HOST = 1L;
    private static final long BOT = -1L;

    // 자기 판의 첫 뒷면 칸을 뒤집는 머리.
    private static final class FlipFirstBrain implements BotBrain {
        @Override
        public GameType type() {
            return GameType.PAPER_SAFARI;
        }

        @Override
        public BotMind mind(BotDifficulty difficulty) {
            return new BotMind() {
                @Override
                public Optional<BotPlan> plan(BotSituation situation) {
                    return firstFaceDown(situation.view())
                            .map(slot -> BotPlan.act(Duration.ofMillis(800), new GameAction("FLIP", slot.column(), slot.row())));
                }

                @Override
                public Optional<GameAction> fallback(Object view, Random random) {
                    return Optional.empty();
                }
            };
        }

        private static Optional<SlotView> firstFaceDown(Object view) {
            PaperSafariView game = ((PaperSafariSessionView) view).game();
            return game.round().boards().stream()
                    .filter(board -> board.playerId() == game.viewerId())
                    .map(BoardView::slots)
                    .flatMap(List::stream)
                    .filter(slot -> !slot.faceUp())
                    .findFirst();
        }
    }

    @Test
    void R22_컴퓨터의_행동은_자동_행동_기록에_남지_않는다() {
        MutableClock clock = new MutableClock(Instant.parse("2026-10-08T00:00:00Z"));
        RoomRegistry registry = new RoomRegistry();
        FakeTaskScheduler botTasks = new FakeTaskScheduler();
        ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
        BotDriver driver = new BotDriver(new BotScheduler(botTasks, clock, 1.0),
                new BotBrains(List.of(new FlipFirstBrain())), new FixedRandom(0));
        RoomService service = new RoomService(registry, () -> ROOM_CODE,
                new GameSessionFactories(List.of(new PaperSafariSessionFactory(clock))), mock(RoomNotifier.class),
                new OutcomePublisher(events), events, clock, new PresenceTracker(), new FakeRoomPasswordHasher(),
                new TurnTimer(new FakeTaskScheduler()), new FixedRandom(0), new RoomAvatars(Avatar::defaultFor), driver);
        service.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("방", GameType.PAPER_SAFARI, 4, null));
        service.addBot(CODE, HOST, new BotDifficultyRequest("EASY"));
        service.start(CODE, HOST);

        botTasks.latest().run();

        PaperSafariView view = ((PaperSafariSessionView) registry.get(ROOM_CODE).viewFor(HOST).orElseThrow()).game();
        BoardView botBoard = view.round().boards().stream().filter(board -> board.playerId() == BOT).findFirst().orElseThrow();
        assertThat(botBoard.slots()).filteredOn(SlotView::faceUp).hasSize(1);
        assertThat(view.lastAutoActorIds()).isEmpty();
        assertThat(view.autoActSeq()).isZero();
    }
}
