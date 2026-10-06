package com.boardgame.uno;

import static com.boardgame.uno.UnoFixtures.A;
import static com.boardgame.uno.UnoFixtures.B;
import static com.boardgame.uno.UnoFixtures.C;
import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class TurnOrderTest {

    @Test
    void R4_시계_방향은_자리_번호가_하나씩_는다() {
        TurnOrder order = new TurnOrder(List.of(A, B, C), A);

        assertThat(order.nextOf(A)).isEqualTo(B);
        assertThat(order.nextOf(C)).isEqualTo(A);
        assertThat(order.direction()).isEqualTo(Direction.CLOCKWISE);
    }

    @Test
    void 방향을_바꾸면_반대쪽이_다음_사람이다() {
        TurnOrder order = new TurnOrder(List.of(A, B, C), A);

        order.reverse();

        assertThat(order.direction()).isEqualTo(Direction.COUNTER_CLOCKWISE);
        assertThat(order.nextOf(A)).isEqualTo(C);
    }

    @Test
    void 두_칸_나아가면_한_사람을_건너뛴다() {
        TurnOrder order = new TurnOrder(List.of(A, B, C), A);

        order.advance(2);

        assertThat(order.current()).isEqualTo(C);
    }

    @Test
    void 차례인_사람이_빠지면_다음_사람이_차례가_된다() {
        TurnOrder order = new TurnOrder(List.of(A, B, C), B);

        order.remove(B);

        assertThat(order.current()).isEqualTo(C);
        assertThat(order.seats()).containsExactly(A, C);
    }

    @Test
    void 차례가_아닌_사람이_빠지면_차례는_그대로다() {
        TurnOrder order = new TurnOrder(List.of(A, B, C), A);

        order.remove(C);

        assertThat(order.current()).isEqualTo(A);
        assertThat(order.nextOf(A)).isEqualTo(B);
        assertThat(order.nextOf(B)).isEqualTo(A);
    }
}
