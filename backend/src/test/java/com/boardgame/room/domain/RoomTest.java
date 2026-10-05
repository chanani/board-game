package com.boardgame.room.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameType;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class RoomTest {

    private static final Instant NOW = Instant.parse("2026-10-05T10:00:00Z");
    private final Participant alice = new Participant(1L, "앨리스");
    private final Participant bob = new Participant(2L, "밥");
    private final Participant carol = new Participant(3L, "캐롤");
    private final AtomicReference<FakeGameSession> created = new AtomicReference<>();

    private Room openRoom() {
        return Room.open(new RoomProfile(new RoomCode("ABCDEF"), new RoomName("방"), GameType.PAPER_SAFARI), alice);
    }

    private RoomGame start(Room room, long requester) {
        return room.start(requester, ids -> {
            FakeGameSession session = new FakeGameSession(ids);
            created.set(session);
            return session;
        }, "match-1", NOW);
    }

    @Test
    void 방을_열면_만든_사람이_방장이고_대기_중이다() {
        Room room = openRoom();

        assertThat(room.hostId()).isEqualTo(1L);
        assertThat(room.status()).isEqualTo(RoomStatus.WAITING);
        assertThat(room.codeValue()).isEqualTo("ABCDEF");
        assertThat(room.nameValue()).isEqualTo("방");
        assertThat(room.participants()).containsExactly(alice);
        assertThat(room.isWaitingFor(GameType.PAPER_SAFARI)).isTrue();
        assertThat(room.isWaitingFor(null)).isTrue();
    }

    @Test
    void 참가하면_순서대로_들어오고_이미_있으면_무시한다() {
        Room room = openRoom();

        room.join(bob);
        room.join(bob);

        assertThat(room.memberIds()).containsExactly(1L, 2L);
    }

    @Test
    void 최대_인원을_넘으면_ROOM_FULL() {
        Room room = openRoom();
        room.join(new Participant(2L, "둘"));
        room.join(new Participant(3L, "셋"));
        room.join(new Participant(4L, "넷"));
        room.join(new Participant(5L, "다섯"));

        assertError(() -> room.join(new Participant(6L, "여섯")), ErrorCode.ROOM_FULL);
    }

    @Test
    void 방장이_나가면_다음_사람이_방장이다() {
        Room room = openRoom();
        room.join(bob);

        room.leave(1L);

        assertThat(room.hostId()).isEqualTo(2L);
        assertThat(room.contains(1L)).isFalse();
    }

    @Test
    void 참가자가_아니면_NOT_IN_ROOM() {
        Room room = openRoom();

        assertError(() -> room.leave(9L), ErrorCode.NOT_IN_ROOM);
        assertError(() -> room.act(9L, new GameAction("DRAW_DECK", null, null)), ErrorCode.NOT_IN_ROOM);
        assertError(() -> start(room, 9L), ErrorCode.NOT_IN_ROOM);
    }

    @Test
    void 방장만_시작할_수_있고_혼자서는_시작할_수_없다() {
        Room room = openRoom();
        assertError(() -> start(room, 1L), ErrorCode.NOT_ENOUGH_PLAYERS);
        room.join(bob);

        assertError(() -> start(room, 2L), ErrorCode.NOT_ROOM_HOST);
    }

    @Test
    void 시작하면_진행_중이고_새로운_사람은_참가할_수_없다() {
        Room room = openRoom();
        room.join(bob);

        RoomGame game = start(room, 1L);

        assertThat(game.matchKey()).isEqualTo("match-1");
        assertThat(game.startedAt()).isEqualTo(NOW);
        assertThat(room.status()).isEqualTo(RoomStatus.PLAYING);
        assertThat(room.isWaitingFor(GameType.PAPER_SAFARI)).isFalse();
        assertThat(room.isPlaying(2L)).isTrue();
        assertThat(room.viewFor(2L)).contains("view-2");
        room.join(bob);
        assertError(() -> room.join(carol), ErrorCode.ROOM_ALREADY_PLAYING);
        assertError(() -> start(room, 1L), ErrorCode.ROOM_ALREADY_PLAYING);
    }

    @Test
    void 시작_전에는_게임_행동을_할_수_없다() {
        Room room = openRoom();

        assertError(() -> room.act(1L, new GameAction("DRAW_DECK", null, null)), ErrorCode.GAME_NOT_STARTED);
        assertThat(room.viewFor(1L)).isEmpty();
    }

    @Test
    void 진행_중_행동은_세션으로_전달된다() {
        Room room = openRoom();
        room.join(bob);
        start(room, 1L);

        room.act(2L, new GameAction("DRAW_DECK", null, null));

        assertThat(created.get().actions()).containsExactly(new GameAction("DRAW_DECK", null, null));
    }

    @Test
    void 진행_중에_나가면_기권_처리되고_결과를_돌려준다() {
        Room room = openRoom();
        room.join(bob);
        start(room, 1L);

        assertThat(room.leave(2L)).containsExactly(new GameCompleted(List.of()));
        assertThat(room.status()).isEqualTo(RoomStatus.WAITING);
        assertThat(room.memberIds()).containsExactly(1L);
        assertThat(created.get().forfeitCalls()).containsExactly(2L);
        assertError(() -> room.leave(2L), ErrorCode.NOT_IN_ROOM);
    }

    @Test
    void 게임이_끝나면_대기_상태로_돌아가_다시_시작할_수_있다() {
        Room room = openRoom();
        room.join(bob);
        start(room, 1L);
        created.get().finish();

        assertThat(room.status()).isEqualTo(RoomStatus.WAITING);
        assertThat(room.leave(2L)).isEmpty();
        room.join(carol);
        RoomGame second = start(room, 1L);

        assertThat(second.session()).isSameAs(created.get());
        assertThat(room.currentGame()).isSameAs(second);
    }
}
