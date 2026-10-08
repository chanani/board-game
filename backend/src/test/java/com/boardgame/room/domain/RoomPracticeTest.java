package com.boardgame.room.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameType;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.member.domain.Avatar;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class RoomPracticeTest {

    private static final Instant NOW = Instant.parse("2026-10-08T10:00:00Z");

    private Room room() {
        RoomSettings settings = new RoomSettings(GameType.UNO, Capacity.max(GameType.UNO), RoomLock.open());
        return Room.open(new RoomProfile(new RoomCode("ABCDEF"), new RoomName("방"), settings), new Participant(1L, "앨리스"));
    }

    @Test
    void R37_D8_컴퓨터가_있으면_시작할_때_연습_경기로_정하고_끝나도_유지한다() {
        Room room = room();
        room.addBot(1L, BotDifficulty.EASY, Avatar.CAT);
        assertThat(room.isPractice()).isFalse();

        room.start(1L, FakeGameSession::new, "m", NOW);
        assertThat(room.isPractice()).isTrue();

        ((FakeGameSession) room.currentGame().session()).finish();
        assertThat(room.status()).isEqualTo(RoomStatus.WAITING);
        assertThat(room.isPractice()).isTrue();
    }

    @Test
    void R37_사람끼리면_연습_경기가_아니다() {
        Room room = room();
        room.join(new Participant(2L, "밥"), null, new FakeRoomPasswordHasher());
        room.setReady(2L, true);

        room.start(1L, FakeGameSession::new, "m", NOW);

        assertThat(room.isPractice()).isFalse();
    }
}
