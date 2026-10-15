package com.boardgame.fruitstack;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static com.boardgame.fruitstack.FruitStackFixtures.A;
import static com.boardgame.fruitstack.FruitStackFixtures.B;
import static com.boardgame.fruitstack.FruitStackFixtures.T0;
import static com.boardgame.fruitstack.FruitStackFixtures.clock;
import static com.boardgame.fruitstack.FruitStackFixtures.game;
import static com.boardgame.fruitstack.FruitStackFixtures.score;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.ResultType;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import org.junit.jupiter.api.Test;

// 혼자 하기(스펙 12장 S#): 한 명이 시작한 게임.
class FruitStackSoloTest {

    private static final String BOARD = "WAAAAGAPqA";

    private final MutableClock clock = clock();

    @Test
    void S1_한_명이면_혼자_하기로_시작하고_두_명부터는_대결이다() {
        FruitStackGame solo = game(clock, A);

        assertThat(solo.isSolo()).isTrue();
        assertThat(solo.isPlaying(A)).isTrue();
        assertThat(solo.isFinished()).isFalse();
        assertThat(game(clock, A, B).isSolo()).isFalse();
    }

    @Test
    void S1_참가자가_없으면_시작하지_못한다() {
        assertError(() -> FruitStackGame.start(java.util.List.of(), new Seed(1), clock),
                ErrorCode.FRUIT_STACK_INVALID_PLAYER_COUNT);
    }

    @Test
    void S2_혼자_남아도_견줄_사람이_없다고_끝나지_않고_점수를_계속_받는다() {
        FruitStackGame game = game(clock, A);
        clock.advance(Duration.ofSeconds(30));

        game.report(A, score(40));
        game.report(A, score(90));

        assertThat(game.isFinished()).isFalse();
        assertThat(game.scoreOf(A)).isEqualTo(score(90));
    }

    @Test
    void S2_내_판이_가득_차면_ALL_OUT으로_끝나고_점수가_남는다() {
        FruitStackGame game = game(clock, A);
        clock.advance(Duration.ofSeconds(30));
        game.report(A, score(40));

        game.out(A, score(55));

        FruitStackResult result = game.result().orElseThrow();
        assertThat(result.reason()).isEqualTo(FruitStackEndReason.ALL_OUT);
        assertThat(game.scoreOf(A)).isEqualTo(score(55));
        assertThat(result.standings().inSeatOrder().get(0).result()).isEqualTo(ResultType.WIN);
    }

    @Test
    void S3_10분_상한이_없어_10분이_지나도_보고가_오면_끝나지_않는다() {
        FruitStackGame game = game(clock, A);
        for (int minute = 1; minute <= 12; minute++) {
            clock.advance(Duration.ofMinutes(1));
            game.report(A, score(minute * 10));
        }

        assertThat(game.expire()).isFalse();
        assertThat(game.isFinished()).isFalse();
        assertThat(game.isTimed()).isFalse();
        assertThat(game(clock, A, B).isTimed()).isTrue();
    }

    @Test
    void S3_점수_상한은_그대로_적용된다() {
        FruitStackGame game = game(clock, A);

        assertError(() -> game.report(A, score(111)), ErrorCode.FRUIT_STACK_SCORE_REJECTED);
        assertThat(game.scoreOf(A)).isEqualTo(Score.ZERO);
    }

    @Test
    void S4_마감은_마지막으로_받아_준_보고나_판_신호에서_5분_뒤다() {
        FruitStackGame game = game(clock, A);
        assertThat(game.limitAt()).isEqualTo(T0.plus(Duration.ofMinutes(5)));

        clock.advance(Duration.ofMinutes(2));
        game.report(A, score(10));
        assertThat(game.limitAt()).isEqualTo(T0.plus(Duration.ofMinutes(7)));

        clock.advance(Duration.ofMinutes(3));
        game.relay(A, BOARD);
        assertThat(game.limitAt()).isEqualTo(T0.plus(Duration.ofMinutes(10)));
    }

    @Test
    void S4_거절된_보고와_버린_신호는_마감을_늦추지_않는다() {
        FruitStackGame game = game(clock, A);
        clock.advance(Duration.ofMinutes(1));

        assertError(() -> game.report(A, score(100_000)), ErrorCode.FRUIT_STACK_SCORE_REJECTED);
        game.relay(A, "WAA");

        assertThat(game.limitAt()).isEqualTo(T0.plus(Duration.ofMinutes(5)));
    }

    @Test
    void S4_5분_동안_아무것도_오지_않으면_지금_점수로_ABANDONED로_끝나고_그_전에는_그대로다() {
        FruitStackGame game = game(clock, A);
        clock.advance(Duration.ofMinutes(1));
        game.report(A, score(30));

        clock.advance(Duration.ofSeconds(299));
        assertThat(game.expire()).isFalse();
        assertThat(game.isFinished()).isFalse();

        clock.advance(Duration.ofSeconds(1));
        assertThat(game.expire()).isTrue();
        assertThat(game.result().orElseThrow().reason()).isEqualTo(FruitStackEndReason.ABANDONED);
        assertThat(game.scoreOf(A)).isEqualTo(score(30));
        assertThat(game.expire()).isFalse();
    }

    @Test
    void S5_게임_중에_나가거나_기권하면_그때까지의_점수로_FORFEIT으로_끝난다() {
        FruitStackGame game = game(clock, A);
        clock.advance(Duration.ofSeconds(30));
        game.report(A, score(70));

        game.forfeit(A);

        assertThat(game.result().orElseThrow().reason()).isEqualTo(FruitStackEndReason.FORFEIT);
        assertThat(game.scoreOf(A)).isEqualTo(score(70));
        assertThat(game.stateOf(A)).isEqualTo(PlayerState.FORFEITED);
    }
}
