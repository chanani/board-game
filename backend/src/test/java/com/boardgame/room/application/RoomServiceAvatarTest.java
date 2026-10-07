package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameType;
import com.boardgame.game.GameSessionFactories;
import com.boardgame.member.application.AvatarLookup;
import com.boardgame.papersafari.PaperSafariSessionFactory;
import com.boardgame.member.domain.Avatar;
import com.boardgame.room.api.CreateRoomRequest;
import com.boardgame.room.api.RoomResponse;
import com.boardgame.room.domain.FakeRoomPasswordHasher;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomRegistry;
import com.boardgame.support.FakeTaskScheduler;
import com.boardgame.support.FixedRandom;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;

// 프로필 그림 DB 조회는 방에 들어올 때 잠금 밖에서 한 번만 하고, 방송(잠금 안)은 메모리만 읽는다.
class RoomServiceAvatarTest {

    private static final String CODE = "ABCDEF";

    private final RoomNotifier notifier = mock(RoomNotifier.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final Clock clock = Clock.systemUTC();
    private final CountingLookup lookup = new CountingLookup();
    private final RoomService service = new RoomService(new RoomRegistry(), () -> new RoomCode(CODE),
            new GameSessionFactories(List.of(new PaperSafariSessionFactory(clock))), notifier,
            new OutcomePublisher(events), events, clock, new PresenceTracker(), new FakeRoomPasswordHasher(),
            new TurnTimer(new FakeTaskScheduler()), new FixedRandom(0), new RoomAvatars(lookup));

    private final class CountingLookup implements AvatarLookup {

        private final List<Boolean> heldLock = new ArrayList<>();

        @Override
        public Avatar avatarOf(long memberId) {
            heldLock.add(Thread.holdsLock(service));
            return Avatar.PANDA;
        }
    }

    private void fillRoom() {
        service.create(new LoginMember(1L, "앨리스"), new CreateRoomRequest("방", GameType.PAPER_SAFARI, 4, null));
        service.join(CODE, new LoginMember(2L, "밥"), null);
        service.setReady(CODE, 2L, true);
        service.start(CODE, 1L);
        service.watch(CODE, new LoginMember(3L, "캐롤"));
    }

    @Test
    void 만들기_참가_관전에서만_잠금_밖에서_한_번씩_그림을_읽는다() {
        fillRoom();

        assertThat(lookup.heldLock).containsExactly(false, false, false);
    }

    @Test
    void 방송과_조회는_DB를_읽지_않고_메모리_그림을_싣는다() {
        fillRoom();
        int loaded = lookup.heldLock.size();

        service.presenceChanged(1L);
        RoomResponse seen = service.get(CODE, 3L);

        assertThat(lookup.heldLock).hasSize(loaded);
        assertThat(seen.members()).extracting(member -> member.avatar()).containsExactly("PANDA", "PANDA");
        assertThat(seen.spectators()).extracting(spectator -> spectator.avatar()).containsExactly("PANDA");
    }

    @Test
    void 그림을_바꾸면_그_사람의_방에_새_그림으로_다시_알린다() {
        fillRoom();
        clearInvocations(notifier);

        service.avatarChanged(2L, Avatar.TIGER);

        ArgumentCaptor<RoomResponse> sent = ArgumentCaptor.forClass(RoomResponse.class);
        verify(notifier, atLeastOnce()).roomUpdated(sent.capture());
        assertThat(sent.getValue().members()).extracting(member -> member.avatar()).containsExactly("PANDA", "TIGER");
    }

    @Test
    void 방에_없는_사람의_그림_변경은_방송하지_않는다() {
        service.avatarChanged(9L, Avatar.FOX);

        verify(notifier, org.mockito.Mockito.never()).roomUpdated(any());
    }
}
