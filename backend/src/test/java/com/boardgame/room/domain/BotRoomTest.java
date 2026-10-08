package com.boardgame.room.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameType;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.member.domain.Avatar;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class BotRoomTest {

    private static final Instant NOW = Instant.parse("2026-10-08T10:00:00Z");
    private final Participant alice = new Participant(1L, "앨리스");
    private final Participant bob = new Participant(2L, "밥");

    private Room room(GameType type, int capacity) {
        RoomSettings settings = new RoomSettings(type, Capacity.of(type, capacity), RoomLock.open());
        return Room.open(new RoomProfile(new RoomCode("ABCDEF"), new RoomName("방"), settings), alice);
    }

    private Participant addBot(Room room, BotDifficulty difficulty) {
        return room.addBot(1L, difficulty, Avatar.CAT);
    }

    private void join(Room room, Participant participant) {
        room.join(participant, null, new FakeRoomPasswordHasher());
    }

    @Test
    void R2_R3_컴퓨터는_음수_번호와_컴퓨터_n_이름으로_앉는다() {
        Room room = room(GameType.UNO, 4);

        Participant first = addBot(room, BotDifficulty.EASY);
        Participant second = addBot(room, BotDifficulty.HARD);

        assertThat(first.memberId()).isEqualTo(-1L);
        assertThat(second.memberId()).isEqualTo(-2L);
        assertThat(first.nickname()).isEqualTo("컴퓨터 1");
        assertThat(second.nickname()).isEqualTo("컴퓨터 2");
        assertThat(second.isBot()).isTrue();
        assertThat(second.bot().difficulty()).isEqualTo(BotDifficulty.HARD);
        assertThat(second.bot().avatar()).isEqualTo(Avatar.CAT);
        assertThat(room.memberIds()).containsExactly(1L, -1L, -2L);
        assertThat(room.humanIds()).containsExactly(1L);
        assertThat(room.bots()).containsExactly(first, second);
        assertThat(room.isBot(-1L)).isTrue();
        assertThat(room.isBot(1L)).isFalse();
    }

    @Test
    void R2_R3_내보낸_번호는_다시_쓰지_않고_이름은_가장_작은_빈_번호를_쓴다() {
        Room room = room(GameType.UNO, 4);
        addBot(room, BotDifficulty.EASY);
        addBot(room, BotDifficulty.EASY);
        room.kick(1L, -1L);

        Participant third = addBot(room, BotDifficulty.MEDIUM);

        assertThat(third.memberId()).isEqualTo(-3L);
        assertThat(third.nickname()).isEqualTo("컴퓨터 1");
    }

    @Test
    void R8_방장만_대기_중에만_추가할_수_있다() {
        Room room = room(GameType.UNO, 4);
        join(room, bob);

        assertError(() -> room.addBot(2L, BotDifficulty.EASY, Avatar.CAT), ErrorCode.NOT_ROOM_HOST);
        assertError(() -> room.addBot(9L, BotDifficulty.EASY, Avatar.CAT), ErrorCode.NOT_IN_ROOM);
        room.setReady(2L, true);
        room.start(1L, FakeGameSession::new, "m", NOW);
        assertError(() -> addBot(room, BotDifficulty.EASY), ErrorCode.ROOM_ALREADY_PLAYING);
    }

    @Test
    void R9_꽉_차면_정원을_하나씩_늘려_앉히고_게임_최대_인원이면_ROOM_FULL() {
        Room room = room(GameType.UNO, 2);
        addBot(room, BotDifficulty.EASY);

        addBot(room, BotDifficulty.EASY);
        addBot(room, BotDifficulty.EASY);
        addBot(room, BotDifficulty.EASY);

        assertThat(room.capacity()).isEqualTo(5);
        assertThat(room.participants()).hasSize(5);
        assertError(() -> addBot(room, BotDifficulty.EASY), ErrorCode.ROOM_FULL);
        assertThat(room.capacity()).isEqualTo(5);
        assertThat(room.participants()).hasSize(5);
    }

    @Test
    void R10_난이도를_바꾸고_없는_컴퓨터나_사람이면_BOT_NOT_FOUND() {
        Room room = room(GameType.OLD_MAID, 6);
        join(room, bob);
        addBot(room, BotDifficulty.EASY);

        room.changeBot(1L, -1L, BotDifficulty.HARD);

        Participant changed = room.participants().get(2);
        assertThat(changed.bot().difficulty()).isEqualTo(BotDifficulty.HARD);
        assertThat(changed.nickname()).isEqualTo("컴퓨터 1");
        assertThat(changed.bot().avatar()).isEqualTo(Avatar.CAT);
        assertError(() -> room.changeBot(1L, -7L, BotDifficulty.EASY), ErrorCode.BOT_NOT_FOUND);
        assertError(() -> room.changeBot(1L, 2L, BotDifficulty.EASY), ErrorCode.BOT_NOT_FOUND);
        assertError(() -> room.changeBot(2L, -1L, BotDifficulty.EASY), ErrorCode.NOT_ROOM_HOST);
    }

    @Test
    void R11_방장은_컴퓨터를_내보낸다() {
        Room room = room(GameType.UNO, 4);
        addBot(room, BotDifficulty.EASY);

        room.kick(1L, -1L);

        assertThat(room.memberIds()).containsExactly(1L);
    }

    @Test
    void R5_R44_방장과_컴퓨터만_있어도_준비_없이_시작한다() {
        Room room = room(GameType.PAPER_SAFARI, 4);
        addBot(room, BotDifficulty.MEDIUM);

        room.start(1L, FakeGameSession::new, "m", NOW);

        assertThat(room.status()).isEqualTo(RoomStatus.PLAYING);
    }

    @Test
    void R5_사람_손님이_준비하지_않으면_컴퓨터가_있어도_시작할_수_없다() {
        Room room = room(GameType.PAPER_SAFARI, 4);
        addBot(room, BotDifficulty.MEDIUM);
        join(room, bob);

        assertError(() -> room.start(1L, FakeGameSession::new, "m", NOW), ErrorCode.PLAYERS_NOT_READY);
    }

    @Test
    void R12_방장이_나가면_컴퓨터를_건너뛰고_다음_사람이_방장이다() {
        Room room = room(GameType.UNO, 4);
        addBot(room, BotDifficulty.EASY);
        join(room, bob);

        room.leave(1L);

        assertThat(room.hostId()).isEqualTo(2L);
        assertThat(room.host()).isEqualTo(bob);
        assertThat(room.memberIds()).containsExactly(-1L, 2L);
    }

    @Test
    void R13_사람이_모두_나가면_컴퓨터가_남아도_빈_방이다() {
        Room room = room(GameType.UNO, 4);
        addBot(room, BotDifficulty.EASY);
        assertThat(room.isEmpty()).isFalse();

        room.leave(1L);

        assertThat(room.isEmpty()).isTrue();
        assertThat(room.memberIds()).containsExactly(-1L);
    }

    @Test
    void R14_컴퓨터를_포함한_인원보다_적게_줄일_수_없다() {
        Room room = room(GameType.UNO, 4);
        addBot(room, BotDifficulty.EASY);
        addBot(room, BotDifficulty.EASY);

        assertError(() -> room.reconfigure(1L, Capacity.of(GameType.UNO, 2), RoomTheme.WOOD),
                ErrorCode.CAPACITY_BELOW_PLAYERS);
    }

    @Test
    void R7_사람_방_사람_목록에_컴퓨터는_없고_관전자는_있다() {
        Room room = room(GameType.UNO, 2);
        join(room, bob);
        room.setReady(2L, true);
        room.start(1L, FakeGameSession::new, "m", NOW);
        room.watch(new Participant(3L, "캐롤"));

        assertThat(room.humanOccupantIds()).containsExactly(1L, 2L, 3L);
    }
}
