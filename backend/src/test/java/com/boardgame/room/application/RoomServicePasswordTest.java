package com.boardgame.room.application;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.boardgame.member.domain.Avatar;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameType;
import com.boardgame.room.api.CreateRoomRequest;
import com.boardgame.room.domain.FakeRoomPasswordHasher;
import com.boardgame.room.domain.RawRoomPassword;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomPasswordHash;
import com.boardgame.room.domain.RoomPasswordHasher;
import com.boardgame.room.domain.RoomRegistry;
import com.boardgame.support.FakeTaskScheduler;
import com.boardgame.support.FixedRandom;
import java.time.Clock;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

// BCrypt는 느리므로 RoomService 전체 잠금을 잡은 채 해시·검증하지 않는다.
class RoomServicePasswordTest {

    private final RoomRegistry registry = new RoomRegistry();
    private final LockSpyHasher hasher = new LockSpyHasher();
    private final RoomService service = new RoomService(registry, () -> new RoomCode("ABCDEF"), null,
            mock(RoomNotifier.class), null, null, Clock.systemUTC(), new PresenceTracker(), hasher,
            new TurnTimer(new FakeTaskScheduler()), new FixedRandom(0), new RoomAvatars(Avatar::defaultFor));

    private final class LockSpyHasher implements RoomPasswordHasher {

        private final RoomPasswordHasher delegate = new FakeRoomPasswordHasher();
        private final List<Boolean> heldLock = new ArrayList<>();

        @Override
        public RoomPasswordHash hash(RawRoomPassword raw) {
            heldLock.add(Thread.holdsLock(service));
            return delegate.hash(raw);
        }

        @Override
        public boolean matches(RawRoomPassword raw, RoomPasswordHash hash) {
            heldLock.add(Thread.holdsLock(service));
            return delegate.matches(raw, hash);
        }
    }

    private void createLockedRoom() {
        service.create(new LoginMember(1L, "앨리스"), new CreateRoomRequest("방", GameType.PAPER_SAFARI, 4, "1234"));
    }

    @Test
    void 방을_만들_때_비밀번호_해시는_서비스_잠금_밖에서_한다() {
        createLockedRoom();

        assertThat(hasher.heldLock).containsExactly(false);
    }

    @Test
    void 참가할_때_비밀번호_검증은_서비스_잠금_밖에서_하고_결과는_그대로다() {
        createLockedRoom();
        hasher.heldLock.clear();

        assertError(() -> service.join("ABCDEF", new LoginMember(2L, "밥"), "9999"), ErrorCode.ROOM_PASSWORD_MISMATCH);
        service.join("ABCDEF", new LoginMember(2L, "밥"), "1234");

        assertThat(hasher.heldLock).containsExactly(false, false);
        assertThat(registry.get(new RoomCode("ABCDEF")).memberIds()).containsExactly(1L, 2L);
    }

    @Test
    void 이미_참가한_사람은_비밀번호_없이_다시_참가해도_그대로다() {
        createLockedRoom();

        service.join("ABCDEF", new LoginMember(1L, "앨리스"), null);

        assertThat(registry.get(new RoomCode("ABCDEF")).memberIds()).containsExactly(1L);
    }
}
