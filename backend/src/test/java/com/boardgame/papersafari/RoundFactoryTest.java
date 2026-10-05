package com.boardgame.papersafari;

import static com.boardgame.papersafari.Fixtures.ALICE;
import static com.boardgame.papersafari.Fixtures.BOB;
import static com.boardgame.papersafari.Fixtures.CAROL;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class RoundFactoryTest {

    private final Seats seats = Seats.of(List.of(ALICE, BOB, CAROL));
    private final RoundFactory factory = new RoundFactory(StackedShuffler.rounds(List.of()), count -> 0);

    @Test
    void 첫_시작_플레이어는_현재_인원수_안에서_고른다() {
        List<Integer> received = new ArrayList<>();
        RoundFactory picking = new RoundFactory(StackedShuffler.rounds(List.of()), count -> {
            received.add(count);
            return 2;
        });

        PaperSafariRound round = picking.create(seats);

        assertThat(received).containsExactly(3);
        assertThat(round.currentPlayer()).isEqualTo(CAROL);
    }

    @Test
    void 다음_라운드는_이전_시작_플레이어의_다음_좌석부터_시작한다() {
        assertThat(factory.create(seats).currentPlayer()).isEqualTo(ALICE);
        assertThat(factory.create(seats).currentPlayer()).isEqualTo(BOB);
        assertThat(factory.create(seats).currentPlayer()).isEqualTo(CAROL);
        assertThat(factory.create(seats).currentPlayer()).isEqualTo(ALICE);
    }

    @Test
    void 이전_시작_플레이어가_떠나도_원래_순서상_다음_사람이_시작한다() {
        factory.create(seats);
        factory.create(seats);
        seats.remove(BOB);
        assertThat(factory.create(seats).currentPlayer()).isEqualTo(CAROL);
    }

    @Test
    void 첫_시작_플레이어가_떠나도_같은_사람이_두_번_시작하지_않는다() {
        factory.create(seats);
        factory.create(seats);
        seats.remove(ALICE);
        assertThat(factory.create(seats).currentPlayer()).isEqualTo(CAROL);
    }
}
