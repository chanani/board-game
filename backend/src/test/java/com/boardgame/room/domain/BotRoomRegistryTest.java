package com.boardgame.room.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameType;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.member.domain.Avatar;
import org.junit.jupiter.api.Test;

class BotRoomRegistryTest {

    private Room roomWithBot() {
        RoomSettings settings = new RoomSettings(GameType.UNO, Capacity.max(GameType.UNO), RoomLock.open());
        Room room = Room.open(new RoomProfile(new RoomCode("ROBOTS"), new RoomName("방"), settings),
                new Participant(1L, "앨리스"));
        room.addBot(1L, BotDifficulty.EASY, Avatar.CAT);
        return room;
    }

    @Test
    void R7_회원의_방_찾기는_컴퓨터_번호를_무시한다() {
        RoomRegistry registry = new RoomRegistry();
        Room room = roomWithBot();

        registry.save(room);

        assertThat(registry.findByMember(1L)).contains(room);
        assertThat(registry.findByMember(-1L)).isEmpty();
    }

    @Test
    void R13_사람이_모두_나가면_컴퓨터가_남아도_방을_지운다() {
        RoomRegistry registry = new RoomRegistry();
        Room room = roomWithBot();
        registry.save(room);

        room.leave(1L);
        registry.save(room);

        assertThat(registry.exists(room.code())).isFalse();
        assertThat(registry.findByMember(1L)).isEmpty();
    }
}
