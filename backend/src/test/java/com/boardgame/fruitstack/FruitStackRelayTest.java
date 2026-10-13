package com.boardgame.fruitstack;

import static com.boardgame.fruitstack.FruitStackFixtures.A;
import static com.boardgame.fruitstack.FruitStackFixtures.B;
import static com.boardgame.fruitstack.FruitStackFixtures.C;
import static com.boardgame.fruitstack.FruitStackFixtures.clock;
import static com.boardgame.fruitstack.FruitStackFixtures.game;
import static com.boardgame.fruitstack.FruitStackFixtures.score;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.support.MutableClock;
import java.time.Duration;
import org.junit.jupiter.api.Test;

class FruitStackRelayTest {

    private static final String BOARD = "WAAAAGAPqA";

    private final MutableClock clock = clock();

    @Test
    void R24_형식이_맞는_판은_받아_주고_사람마다_순번이_1씩_오른다() {
        FruitStackGame game = game(clock, A, B, C);

        assertThat(game.relay(A, BOARD)).hasValue(1);
        assertThat(game.relay(B, BOARD)).hasValue(1);
        clock.advance(Duration.ofMillis(200));
        assertThat(game.relay(A, BOARD)).hasValue(2);
    }

    @Test
    void R24_마지막으로_받아_준_신호에서_200ms가_안_지났으면_버리고_순번도_그대로다() {
        FruitStackGame game = game(clock, A, B, C);
        game.relay(A, BOARD);

        clock.advance(Duration.ofMillis(199));
        assertThat(game.relay(A, BOARD)).isEmpty();
        clock.advance(Duration.ofMillis(1));

        assertThat(game.relay(A, BOARD)).hasValue(2);
    }

    @Test
    void R24_형식이_어긋난_판은_버린다() {
        FruitStackGame game = game(clock, A, B, C);

        assertThat(game.relay(A, null)).isEmpty();
        assertThat(game.relay(A, "")).isEmpty();
        assertThat(game.relay(A, "WAAA")).isEmpty();
        assertThat(game.relay(A, "WAAAAG")).isEmpty();
        assertThat(game.relay(A, "WAAA+")).isEmpty();
        assertThat(game.relay(A, "WAAA ")).isEmpty();
        assertThat(game.relay(A, "A".repeat(1205))).isEmpty();
        assertThat(game.relay(A, "A".repeat(1200))).hasValue(1);
    }

    @Test
    void R24_버려진_신호는_간격_시계를_건드리지_않는다() {
        FruitStackGame game = game(clock, A, B, C);

        assertThat(game.relay(A, "WAAA")).isEmpty();
        assertThat(game.relay(A, BOARD)).hasValue(1);
    }

    @Test
    void R24_탈락한_사람의_판은_받고_기권한_사람과_참가자가_아닌_사람의_판은_버린다() {
        FruitStackGame game = game(clock, A, B, C);
        game.out(A, score(10));
        game.forfeit(B);

        assertThat(game.relay(A, BOARD)).hasValue(1);
        assertThat(game.relay(B, BOARD)).isEmpty();
        assertThat(game.relay(new PlayerId(99), BOARD)).isEmpty();
    }

    @Test
    void R24_끝난_게임의_판은_버리고_신호는_점수와_상태를_바꾸지_않는다() {
        FruitStackGame game = game(clock, A, B);
        game.report(A, score(10));
        game.relay(A, BOARD);
        assertThat(game.scoreOf(A)).isEqualTo(score(10));
        assertThat(game.stateOf(A)).isEqualTo(PlayerState.PLAYING);
        assertThat(game.limitAt()).isEqualTo(FruitStackFixtures.T0.plusSeconds(600));

        game.forfeit(B);

        assertThat(game.isFinished()).isTrue();
        clock.advance(Duration.ofSeconds(1));
        assertThat(game.relay(A, BOARD)).isEmpty();
    }
}
