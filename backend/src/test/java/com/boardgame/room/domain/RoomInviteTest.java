package com.boardgame.room.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameType;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class RoomInviteTest {

    private static final Instant NOW = Instant.parse("2026-10-13T10:00:00Z");
    private final RoomPasswordHasher hasher = new FakeRoomPasswordHasher();
    private final Participant alice = new Participant(1L, "앨리스");
    private final Participant bob = new Participant(2L, "밥");
    private final Participant carol = new Participant(3L, "캐럴");

    private Room room(int capacity, RoomLock lock) {
        RoomSettings settings = new RoomSettings(GameType.PAPER_SAFARI,
                Capacity.of(GameType.PAPER_SAFARI, capacity), lock);
        return Room.open(new RoomProfile(new RoomCode("ABCDEF"), new RoomName("방"), settings), alice);
    }

    private Room lockedRoom() {
        return room(4, RoomLock.locked(hasher.hash(new RawRoomPassword("1234"))));
    }

    private Room countingDown() {
        Room room = room(4, RoomLock.open());
        room.join(bob, null, hasher);
        room.setReady(bob.memberId(), true);
        room.scheduleStart(alice.memberId(), NOW.plusSeconds(3));
        return room;
    }

    @Test
    void 방장이_아닌_참가자도_친구를_부를_수_있다() {
        Room room = room(4, RoomLock.open());
        room.join(bob, null, hasher);

        room.requireInvitable(bob.memberId(), carol.memberId());
        room.requireInvitable(alice.memberId(), carol.memberId());
    }

    @Test
    void 방에_앉아_있지_않은_사람은_부를_수_없다() {
        Room room = room(4, RoomLock.open());

        assertError(() -> room.requireInvitable(bob.memberId(), carol.memberId()), ErrorCode.NOT_IN_ROOM);
    }

    @Test
    void 이미_앉아_있는_사람은_부를_수_없다() {
        Room room = room(4, RoomLock.open());
        room.join(bob, null, hasher);

        assertError(() -> room.requireInvitable(alice.memberId(), bob.memberId()), ErrorCode.INVITE_ALREADY_IN_ROOM);
    }

    @Test
    void 자리가_없으면_부를_수_없다() {
        Room room = room(2, RoomLock.open());
        room.join(bob, null, hasher);

        assertError(() -> room.requireInvitable(alice.memberId(), carol.memberId()), ErrorCode.ROOM_FULL);
    }

    @Test
    void 시작_카운트다운_중에는_부를_수도_초대로_들어올_수도_없다() {
        Room room = countingDown();

        assertError(() -> room.requireInvitable(alice.memberId(), carol.memberId()), ErrorCode.GAME_STARTING);
        assertError(() -> room.admitInvited(carol, alice.memberId()), ErrorCode.GAME_STARTING);
    }

    @Test
    void 게임_중에는_부를_수도_초대로_들어올_수도_없다() {
        Room room = countingDown();
        room.kickOff(FakeGameSession::new, "match", NOW.plusSeconds(3));

        assertError(() -> room.requireInvitable(alice.memberId(), carol.memberId()), ErrorCode.ROOM_ALREADY_PLAYING);
        assertError(() -> room.admitInvited(carol, alice.memberId()), ErrorCode.ROOM_ALREADY_PLAYING);
    }

    @Test
    void 초대받은_사람은_비밀번호_없이_비공개방에_앉는다() {
        Room room = lockedRoom();
        assertError(() -> room.join(bob, null, hasher), ErrorCode.ROOM_PASSWORD_MISMATCH);

        room.admitInvited(bob, alice.memberId());

        assertThat(room.memberIds()).containsExactly(1L, 2L);
        assertThat(room.isLocked()).isTrue();
    }

    @Test
    void 초대한_사람이_방을_떠났으면_초대로_들어올_수_없다() {
        Room room = lockedRoom();
        room.admitInvited(bob, alice.memberId());
        room.leave(bob.memberId());

        assertError(() -> room.admitInvited(carol, bob.memberId()), ErrorCode.INVITE_EXPIRED);
    }

    @Test
    void 그사이_자리가_다_차면_초대로도_들어올_수_없다() {
        Room room = room(2, RoomLock.open());
        room.join(bob, null, hasher);

        assertError(() -> room.admitInvited(carol, alice.memberId()), ErrorCode.ROOM_FULL);
    }

    @Test
    void 이미_앉아_있는_사람이_초대를_받아들이면_그대로다() {
        Room room = room(4, RoomLock.open());
        room.join(bob, null, hasher);

        room.admitInvited(bob, alice.memberId());

        assertThat(room.memberIds()).containsExactly(1L, 2L);
    }
}
