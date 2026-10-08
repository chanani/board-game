package com.boardgame.room.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameType;
import org.junit.jupiter.api.Test;

class CapacityTest {

    @Test
    void 게임_인원_범위_안의_정원만_만든다() {
        assertThat(Capacity.of(GameType.PAPER_SAFARI, 3).value()).isEqualTo(3);
        assertError(() -> Capacity.of(GameType.PAPER_SAFARI, 1), ErrorCode.INVALID_CAPACITY);
        assertError(() -> Capacity.of(GameType.PAPER_SAFARI, 6), ErrorCode.INVALID_CAPACITY);
        assertThat(Capacity.max(GameType.PAPER_SAFARI).value()).isEqualTo(5);
    }

    @Test
    void 정원이_찼는지_안다() {
        Capacity capacity = Capacity.of(GameType.PAPER_SAFARI, 3);
        assertThat(capacity.isFull(2)).isFalse();
        assertThat(capacity.isFull(3)).isTrue();
    }

    @Test
    void 인원보다_작은지_안다() {
        Capacity three = Capacity.of(GameType.PAPER_SAFARI, 3);

        assertThat(three.isBelow(4)).isTrue();
        assertThat(three.isBelow(3)).isFalse();
    }

    @Test
    void R9_게임_최대_인원보다_작으면_하나_늘리고_최대면_ROOM_FULL() {
        assertThat(Capacity.of(GameType.UNO, 4).grownFor(GameType.UNO)).isEqualTo(new Capacity(5));
        assertError(() -> Capacity.of(GameType.UNO, 5).grownFor(GameType.UNO), ErrorCode.ROOM_FULL);
        assertThat(Capacity.of(GameType.OLD_MAID, 5).grownFor(GameType.OLD_MAID)).isEqualTo(new Capacity(6));
    }
}
