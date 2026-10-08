package com.boardgame.room.application;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.boardgame.common.error.ErrorCode;
import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameSessionFactories;
import com.boardgame.game.GameType;
import com.boardgame.member.domain.Avatar;
import com.boardgame.papersafari.PaperSafariSessionFactory;
import com.boardgame.room.api.BotDifficultyRequest;
import com.boardgame.room.api.CreateRoomRequest;
import com.boardgame.room.api.RoomMemberResponse;
import com.boardgame.room.api.RoomResponse;
import com.boardgame.room.api.RoomSummaryResponse;
import com.boardgame.room.domain.FakeRoomPasswordHasher;
import com.boardgame.room.domain.RoomClosedEvent;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomRegistry;
import com.boardgame.support.FakeTaskScheduler;
import com.boardgame.support.FixedRandom;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

class RoomServiceBotTest {

    private static final String CODE = "ROBOTS";
    private static final RoomCode ROOM_CODE = new RoomCode(CODE);
    private static final long HOST = 1L;
    private static final long BOT = -1L;
    private static final Instant T0 = Instant.parse("2026-10-08T00:00:00Z");

    private final MutableClock clock = new MutableClock(T0);
    private final RoomRegistry registry = new RoomRegistry();
    private final RoomNotifier notifier = mock(RoomNotifier.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final PresenceTracker presence = new PresenceTracker();
    private final RoomService service = new RoomService(registry, () -> ROOM_CODE,
            new GameSessionFactories(List.of(new PaperSafariSessionFactory(clock))), notifier,
            new OutcomePublisher(events), events, clock, presence, new FakeRoomPasswordHasher(),
            new TurnTimer(new FakeTaskScheduler()), new FixedRandom(0), new RoomAvatars(Avatar::defaultFor));

    @BeforeEach
    void openRoom() {
        service.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("방", GameType.PAPER_SAFARI, 4, null));
        presence.connected(HOST, "session-1");
    }

    private RoomResponse addBot(String difficulty) {
        return service.addBot(CODE, HOST, new BotDifficultyRequest(difficulty));
    }

    @Test
    void R4_R15_프로필_그림은_방_안_다른_사람과_겹치지_않게_고르고_응답에_컴퓨터로_나온다() {
        addBot("EASY");

        RoomResponse response = addBot("HARD");

        assertThat(response.members()).extracting(RoomMemberResponse::avatar).containsExactly("DOG", "CAT", "RABBIT");
        RoomMemberResponse bot = response.members().get(2);
        assertThat(bot.id()).isEqualTo(-2L);
        assertThat(bot.nickname()).isEqualTo("컴퓨터 2");
        assertThat(bot.bot()).isTrue();
        assertThat(bot.difficulty()).isEqualTo(com.boardgame.game.bot.BotDifficulty.HARD);
        assertThat(bot.ready()).isTrue();
        assertThat(bot.connected()).isTrue();
        assertThat(bot.offlineSeconds()).isZero();
        assertThat(bot.host()).isFalse();
        assertThat(response.members().get(0).bot()).isFalse();
        assertThat(response.members().get(0).difficulty()).isNull();
    }

    @Test
    void R8_R10_잘못된_난이도와_없는_본문은_INVALID_INPUT이고_없는_컴퓨터는_BOT_NOT_FOUND() {
        addBot("EASY");

        assertError(() -> addBot("SUPER"), ErrorCode.INVALID_INPUT);
        assertError(() -> service.addBot(CODE, HOST, null), ErrorCode.INVALID_INPUT);
        assertError(() -> service.changeBot(CODE, HOST, -9L, new BotDifficultyRequest("HARD")), ErrorCode.BOT_NOT_FOUND);

        RoomResponse changed = service.changeBot(CODE, HOST, BOT, new BotDifficultyRequest("HARD"));
        assertThat(changed.members().get(1).difficulty()).isEqualTo(com.boardgame.game.bot.BotDifficulty.HARD);
    }

    @Test
    void R6_오래_끊긴_사람을_찾는_확인은_컴퓨터를_기권시키지_않는다() {
        addBot("EASY");
        service.start(CODE, HOST);
        clock.advance(Duration.ofSeconds(120));

        service.forfeitLongDisconnected();

        assertThat(registry.get(ROOM_CODE).isPlaying(BOT)).isTrue();
    }

    @Test
    void R6_컴퓨터는_손으로_기권시킬_수_없다() {
        addBot("EASY");
        service.start(CODE, HOST);
        clock.advance(Duration.ofSeconds(120));

        assertError(() -> service.forfeitDisconnected(CODE, HOST, BOT), ErrorCode.INVALID_INPUT);
    }

    @Test
    void R13_게임_중_마지막_사람이_나가면_방을_닫는다() {
        addBot("EASY");
        service.start(CODE, HOST);

        service.leave(CODE, HOST);

        assertThat(registry.find(ROOM_CODE)).isEmpty();
        verify(events).publishEvent(new RoomClosedEvent(CODE));
    }

    @Test
    void R16_방송은_컴퓨터에게_화면을_보내지_않는다() {
        addBot("EASY");
        clearInvocations(notifier);

        service.start(CODE, HOST);

        verify(notifier).gameUpdated(eq(HOST), any());
        verify(notifier, never()).gameUpdated(eq(BOT), any());
    }

    @Test
    void R12_방_목록의_방장_이름은_컴퓨터가_아니라_첫_사람이다() {
        addBot("EASY");
        service.join(CODE, new LoginMember(2L, "밥"), null);
        service.leave(CODE, HOST);

        RoomSummaryResponse summary = service.rooms(GameType.PAPER_SAFARI).get(0);

        assertThat(summary.hostNickname()).isEqualTo("밥");
        assertThat(summary.playerCount()).isEqualTo(2);
    }
}
