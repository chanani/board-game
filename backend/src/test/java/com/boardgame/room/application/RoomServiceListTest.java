package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.boardgame.game.GameType;
import com.boardgame.room.api.RoomSummaryResponse;
import com.boardgame.room.domain.Capacity;
import com.boardgame.room.domain.FakeGameSession;
import com.boardgame.room.domain.Participant;
import com.boardgame.room.domain.Room;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomLock;
import com.boardgame.room.domain.RoomName;
import com.boardgame.room.domain.RoomProfile;
import com.boardgame.room.domain.RoomRegistry;
import com.boardgame.room.domain.RoomSettings;
import java.time.Clock;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class RoomServiceListTest {

    private final RoomRegistry registry = new RoomRegistry();
    private final RoomService service = new RoomService(registry, null, null, mock(RoomNotifier.class), null,
            null, Clock.systemUTC(), null, null, null, null);

    private Room open(String code, long hostId) {
        RoomSettings settings = new RoomSettings(GameType.PAPER_SAFARI, Capacity.max(GameType.PAPER_SAFARI),
                RoomLock.open());
        Room room = Room.open(new RoomProfile(new RoomCode(code), new RoomName("방"), settings),
                new Participant(hostId, "host" + hostId));
        registry.save(room);
        return room;
    }

    private void play(Room room, long guestId) {
        room.join(new Participant(guestId, "guest" + guestId), null, null);
        room.setReady(guestId, true);
        room.start(room.hostId(), FakeGameSession::new, "m-" + guestId, Instant.now());
    }

    @Test
    void 대기_중인_방이_먼저_나오고_각_묶음은_코드_순이다() {
        open("BBBBBB", 1L);
        play(open("AAAAAA", 2L), 20L);
        open("CCCCCC", 3L);
        play(open("DDDDDD", 4L), 40L);

        List<String> codes = service.rooms(GameType.PAPER_SAFARI).stream().map(RoomSummaryResponse::code).toList();

        assertThat(codes).containsExactly("BBBBBB", "CCCCCC", "AAAAAA", "DDDDDD");
    }
}
