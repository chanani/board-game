package com.boardgame.room.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameType;
import com.boardgame.game.PendingActor;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class RoomPendingActorsTest {

    @Test
    void R18_게임_중에만_세션이_알려_준_기다리는_사람을_돌려준다() {
        RoomSettings settings = new RoomSettings(GameType.UNO, Capacity.max(GameType.UNO), RoomLock.open());
        Room room = Room.open(new RoomProfile(new RoomCode("ABCDEF"), new RoomName("방"), settings), new Participant(1L, "앨리스"));
        room.join(new Participant(2L, "밥"), null, new FakeRoomPasswordHasher());
        room.setReady(2L, true);
        assertThat(room.pendingActors()).isEmpty();

        room.start(1L, ids -> {
            FakeGameSession session = new FakeGameSession(ids);
            session.awaitActors(List.of(PendingActor.turn(2L)));
            return session;
        }, "m", Instant.parse("2026-10-08T10:00:00Z"));

        assertThat(room.pendingActors()).containsExactly(PendingActor.turn(2L));
    }
}
