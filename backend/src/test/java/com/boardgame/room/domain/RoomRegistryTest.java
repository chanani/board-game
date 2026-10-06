package com.boardgame.room.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameType;
import org.junit.jupiter.api.Test;

class RoomRegistryTest {

    private final RoomRegistry registry = new RoomRegistry();

    private Room room(String code, long hostId) {
        RoomProfile profile = new RoomProfile(new RoomCode(code), new RoomName("방"), new RoomSettings(GameType.PAPER_SAFARI, Capacity.max(GameType.PAPER_SAFARI), RoomLock.open()));
        return Room.open(profile, new Participant(hostId, "호스트" + hostId));
    }

    @Test
    void 저장한_방을_코드와_회원으로_찾는다() {
        Room room = room("ABCDEF", 1L);
        room.join(new Participant(2L, "밥"), null, new FakeRoomPasswordHasher());

        registry.save(room);

        assertThat(registry.get(new RoomCode("ABCDEF"))).isSameAs(room);
        assertThat(registry.findByMember(2L)).containsSame(room);
        assertThat(registry.exists(new RoomCode("ABCDEF"))).isTrue();
        assertThat(registry.all()).containsExactly(room);
    }

    @Test
    void 나간_회원은_색인에서_빠지고_빈_방은_사라진다() {
        Room room = room("ABCDEF", 1L);
        room.join(new Participant(2L, "밥"), null, new FakeRoomPasswordHasher());
        registry.save(room);

        room.leave(2L);
        registry.save(room);
        assertThat(registry.findByMember(2L)).isEmpty();

        room.leave(1L);
        registry.save(room);
        assertThat(registry.exists(new RoomCode("ABCDEF"))).isFalse();
        assertThat(registry.findByMember(1L)).isEmpty();
    }

    @Test
    void 없는_코드는_ROOM_NOT_FOUND() {
        assertError(() -> registry.get(new RoomCode("ZZZZZZ")), ErrorCode.ROOM_NOT_FOUND);
    }

    @Test
    void 관전자도_색인되고_참가자가_모두_나가면_관전자_색인과_방이_사라진다() {
        Room room = room("ABCDEF", 1L);
        room.join(new Participant(2L, "밥"), null, new FakeRoomPasswordHasher());
        room.setReady(2L, true);
        room.start(1L, FakeGameSession::new, "match-1", java.time.Instant.EPOCH);
        room.watch(new Participant(9L, "구경꾼"));
        registry.save(room);
        assertThat(registry.findByMember(9L)).containsSame(room);

        room.leave(2L);
        assertThat(room.contains(9L)).isTrue();
        room.leave(1L);
        room.leave(9L);
        registry.save(room);

        assertThat(registry.findByMember(9L)).isEmpty();
        assertThat(registry.exists(new RoomCode("ABCDEF"))).isFalse();
    }

    @Test
    void 나간_관전자는_색인에서_빠진다() {
        Room room = room("ABCDEF", 1L);
        room.join(new Participant(2L, "밥"), null, new FakeRoomPasswordHasher());
        room.setReady(2L, true);
        room.start(1L, FakeGameSession::new, "match-1", java.time.Instant.EPOCH);
        room.watch(new Participant(9L, "구경꾼"));
        registry.save(room);

        room.leave(9L);
        registry.save(room);

        assertThat(registry.findByMember(9L)).isEmpty();
        assertThat(registry.findByMember(1L)).containsSame(room);
    }
}
