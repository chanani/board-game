package com.boardgame.room.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameType;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class GameOccupanciesTest {

    private Room room(String code, long... memberIds) {
        RoomProfile profile = new RoomProfile(new RoomCode(code), new RoomName("방"), new RoomSettings(GameType.PAPER_SAFARI, Capacity.max(GameType.PAPER_SAFARI), RoomLock.open()));
        Room room = Room.open(profile, new Participant(memberIds[0], "회원" + memberIds[0]));
        for (int i = 1; i < memberIds.length; i++) {
            room.join(new Participant(memberIds[i], "회원" + memberIds[i]), null, new FakeRoomPasswordHasher());
        }
        return room;
    }

    private Room playing(String code, long... memberIds) {
        Room room = room(code, memberIds);
        room.start(memberIds[0], FakeGameSession::new, "match-" + code, Instant.parse("2026-10-06T10:00:00Z"));
        return room;
    }

    private GameOccupancy only(GameOccupancies occupancies) {
        assertThat(occupancies.asList()).hasSize(GameType.values().length);
        return occupancies.asList().get(0);
    }

    @Test
    void 방이_없어도_모든_게임을_0명으로_보여준다() {
        GameOccupancy occupancy = only(GameOccupancies.of(List.of()));

        assertThat(occupancy.gameType()).isEqualTo(GameType.PAPER_SAFARI);
        assertThat(occupancy.waiting()).isEqualTo(PlayerCount.zero());
        assertThat(occupancy.playing()).isEqualTo(PlayerCount.zero());
    }

    @Test
    void 대기_방과_진행_방의_인원을_나눠_더한다() {
        List<Room> rooms = List.of(room("AAAAAA", 1L, 2L), room("BBBBBB", 3L), playing("CCCCCC", 4L, 5L, 6L));

        GameOccupancy occupancy = only(GameOccupancies.of(rooms));

        assertThat(occupancy.waiting()).isEqualTo(PlayerCount.of(3));
        assertThat(occupancy.playing()).isEqualTo(PlayerCount.of(3));
    }

    @Test
    void 진행_방만_있으면_대기는_0명이다() {
        GameOccupancy occupancy = only(GameOccupancies.of(List.of(playing("CCCCCC", 4L, 5L))));

        assertThat(occupancy.waiting()).isEqualTo(PlayerCount.zero());
        assertThat(occupancy.playing()).isEqualTo(PlayerCount.of(2));
    }
}
