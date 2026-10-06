package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameType;
import com.boardgame.game.MatchEntry;
import com.boardgame.game.ResultType;
import com.boardgame.game.RoundCompleted;
import com.boardgame.game.RoundEntry;
import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.game.event.RoundCompletedEvent;
import com.boardgame.room.domain.Capacity;
import com.boardgame.room.domain.FakeGameSession;
import com.boardgame.room.domain.FakeRoomPasswordHasher;
import com.boardgame.room.domain.RoomLock;
import com.boardgame.room.domain.RoomSettings;
import com.boardgame.room.domain.Participant;
import com.boardgame.room.domain.Room;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomName;
import com.boardgame.room.domain.RoomProfile;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class OutcomePublisherTest {

    private static final Instant STARTED = Instant.parse("2026-10-05T10:00:00Z");
    private static final Instant NOW = Instant.parse("2026-10-05T10:20:00Z");

    private final List<Object> published = new ArrayList<>();
    private final OutcomePublisher publisher = new OutcomePublisher(published::add);

    private Room startedRoom() {
        Room room = Room.open(new RoomProfile(new RoomCode("ABCDEF"), new RoomName("방"), new RoomSettings(GameType.PAPER_SAFARI, Capacity.max(GameType.PAPER_SAFARI), RoomLock.open())),
                new Participant(1L, "앨리스"));
        room.join(new Participant(2L, "밥"), null, new FakeRoomPasswordHasher());
        room.start(1L, FakeGameSession::new, "match-1", STARTED);
        return room;
    }

    @Test
    void 결과가_없으면_아무것도_발행하지_않는다() {
        publisher.publish(startedRoom(), List.of(), NOW);

        assertThat(published).isEmpty();
    }

    @Test
    void 라운드와_게임_결과를_매치_키와_함께_순서대로_발행한다() {
        RoundCompleted round = new RoundCompleted(3, List.of(new RoundEntry(1L, ResultType.WIN, 1)));
        GameCompleted game = new GameCompleted(List.of(new MatchEntry(1L, ResultType.WIN, 3, 0)));

        publisher.publish(startedRoom(), List.of(round, game), NOW);

        assertThat(published).containsExactly(
                new RoundCompletedEvent("match-1", GameType.PAPER_SAFARI, round),
                new GameCompletedEvent("match-1", GameType.PAPER_SAFARI, STARTED, NOW, game));
    }
}
