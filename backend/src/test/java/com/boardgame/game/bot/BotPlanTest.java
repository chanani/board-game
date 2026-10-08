package com.boardgame.game.bot;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameAction;
import java.time.Duration;
import org.junit.jupiter.api.Test;

class BotPlanTest {

    @Test
    void 계획은_첫_걸음과_나머지로_나뉘고_전체_시간을_안다() {
        GameAction peek = new GameAction("PEEK", null, null, null, null, null, 2);
        GameAction draw = new GameAction("DRAW", null, null, null, null, null, 2);
        BotPlan plan = BotPlan.of(BotStep.signal(Duration.ofMillis(800), peek), BotStep.act(Duration.ofMillis(300), draw));

        assertThat(plan.first().isSignal()).isTrue();
        assertThat(plan.rest()).contains(BotPlan.act(Duration.ofMillis(300), draw));
        assertThat(plan.rest().orElseThrow().rest()).isEmpty();
        assertThat(plan.total()).isEqualTo(Duration.ofMillis(1100));
    }
}
