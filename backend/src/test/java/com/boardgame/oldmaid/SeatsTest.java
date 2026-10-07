package com.boardgame.oldmaid;

import static com.boardgame.oldmaid.OldMaidFixtures.A;
import static com.boardgame.oldmaid.OldMaidFixtures.B;
import static com.boardgame.oldmaid.OldMaidFixtures.C;
import static com.boardgame.oldmaid.OldMaidFixtures.D;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class SeatsTest {

    private final Seats seats = new Seats(List.of(A, B, C, D));

    @Test
    void R5_정한_사람부터_시계_방향으로_한_바퀴() {
        assertThat(seats.inOrderFrom(C)).containsExactly(C, D, A, B);
    }

    @Test
    void R11_다음_자리부터_조건에_맞는_첫_사람이고_자기_자신은_보지_않는다() {
        assertThat(seats.nextAfter(A, player -> true)).contains(B);
        assertThat(seats.nextAfter(D, player -> !player.equals(A))).contains(B);
        assertThat(seats.nextAfter(A, player -> player.equals(A))).isEmpty();
    }
}
