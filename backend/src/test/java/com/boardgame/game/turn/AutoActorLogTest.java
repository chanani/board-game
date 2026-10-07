package com.boardgame.game.turn;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class AutoActorLogTest {

    @Test
    void 자동_행동마다_순번이_오르고_사람이_행동하면_대상만_비운다() {
        AutoActorLog log = new AutoActorLog();

        log.replaceWith(List.of(7L));
        log.replaceWith(List.of(12L));
        log.clear();

        assertThat(log.sequence()).isEqualTo(2L);
        assertThat(log.ids()).isEmpty();
    }

    @Test
    void 대상_목록은_바깥에서_바꿀_수_없다() {
        AutoActorLog log = new AutoActorLog();
        log.replaceWith(List.of(7L));

        assertThat(log.ids()).containsExactly(7L);
        org.assertj.core.api.Assertions.assertThatThrownBy(() -> log.ids().add(1L))
                .isInstanceOf(UnsupportedOperationException.class);
    }
}
