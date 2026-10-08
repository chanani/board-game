package com.boardgame.room.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.support.FixedRandom;
import java.util.ArrayList;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

class PlayOrderTest {

    private static final List<Long> SEATED = List.of(1L, 2L, -1L, 3L);

    @Test
    void 언제나_첫_후보를_고르면_자리_순서가_그대로다() {
        assertThat(PlayOrder.random(new FixedRandom(0)).arrange(SEATED)).containsExactly(1L, 2L, -1L, 3L);
    }

    @Test
    void 남은_사람_중에서_뽑힌_순서대로_플레이_순서가_된다() {
        // 1번째 → 2, [1,-1,3]의 1번째 → -1, [1,3]의 1번째 → 3, 남은 1
        assertThat(PlayOrder.random(new FixedRandom(1)).arrange(SEATED)).containsExactly(2L, -1L, 3L, 1L);
    }

    @Test
    void 사람과_컴퓨터_모두를_빠짐없이_한_번씩_세운다() {
        List<Long> order = PlayOrder.random(new Random(7L)).arrange(SEATED);

        assertThat(order).containsExactlyInAnyOrderElementsOf(SEATED);
    }

    @Test
    void 섞지_않으면_자리_순서_그대로다() {
        assertThat(PlayOrder.SEATED.arrange(SEATED)).containsExactly(1L, 2L, -1L, 3L);
    }

    @Test
    void 앉은_순서는_바꾸지_않는다() {
        List<Long> seated = new ArrayList<>(SEATED);

        PlayOrder.random(new FixedRandom(1)).arrange(seated);

        assertThat(seated).containsExactly(1L, 2L, -1L, 3L);
    }
}
