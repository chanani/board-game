package com.boardgame.fruitstack;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static com.boardgame.fruitstack.FruitStackFixtures.A;
import static com.boardgame.fruitstack.FruitStackFixtures.B;
import static com.boardgame.fruitstack.FruitStackFixtures.C;
import static com.boardgame.fruitstack.FruitStackFixtures.clock;
import static com.boardgame.fruitstack.FruitStackFixtures.game;
import static com.boardgame.fruitstack.FruitStackFixtures.score;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.boardgame.common.error.ErrorCode;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;

class FruitStackReportTest {

    private final MutableClock clock = clock();

    @Test
    void 시작하면_모두_0점으로_살아_있고_상한은_10분_뒤다() {
        FruitStackGame game = game(clock, A, B);

        assertThat(game.participants()).containsExactly(A, B);
        assertThat(game.scoreOf(A)).isEqualTo(Score.ZERO);
        assertThat(game.stateOf(B)).isEqualTo(PlayerState.PLAYING);
        assertThat(game.isPlaying(A)).isTrue();
        assertThat(game.isFinished()).isFalse();
        assertThat(game.limitAt()).isEqualTo(FruitStackFixtures.T0.plusSeconds(600));
        assertThat(game.seed()).isEqualTo(new Seed(12345));
    }

    @Test
    void 두_명보다_적거나_다섯_명보다_많으면_시작하지_못한다() {
        assertError(() -> game(clock, A), ErrorCode.FRUIT_STACK_INVALID_PLAYER_COUNT);
        assertError(() -> FruitStackGame.start(List.of(A, B, C, new PlayerId(4), new PlayerId(5), new PlayerId(6)),
                new Seed(1), clock), ErrorCode.FRUIT_STACK_INVALID_PLAYER_COUNT);
    }

    @Test
    void R19_오르는_점수와_같은_점수는_받아들인다() {
        FruitStackGame game = game(clock, A, B, C);

        game.report(A, score(10));
        game.report(A, score(10));
        game.report(A, score(31));

        assertThat(game.scoreOf(A)).isEqualTo(score(31));
        assertThat(game.scoreOf(B)).isEqualTo(Score.ZERO);
    }

    @Test
    void R19_줄어든_점수는_거절하고_점수는_그대로다() {
        FruitStackGame game = game(clock, A, B, C);
        game.report(A, score(30));

        assertError(() -> game.report(A, score(29)), ErrorCode.FRUIT_STACK_SCORE_REJECTED);

        assertThat(game.scoreOf(A)).isEqualTo(score(30));
    }

    @Test
    void R19_상한을_넘는_점수는_거절하고_시간이_지나면_받아들인다() {
        FruitStackGame game = game(clock, A, B, C);

        assertError(() -> game.report(A, score(111)), ErrorCode.FRUIT_STACK_SCORE_REJECTED);
        assertThat(game.scoreOf(A)).isEqualTo(Score.ZERO);

        clock.advance(Duration.ofMillis(500));
        game.report(A, score(111));
        assertThat(game.scoreOf(A)).isEqualTo(score(111));
    }

    @Test
    void 음수_점수는_INVALID_INPUT이고_참가자가_아니면_NOT_A_PLAYER다() {
        FruitStackGame game = game(clock, A, B, C);

        assertError(() -> score(-1), ErrorCode.INVALID_INPUT);
        assertError(() -> game.report(new PlayerId(99), score(1)), ErrorCode.NOT_A_PLAYER);
    }

    @Test
    void R20_탈락은_점수를_받아들이고_그_사람을_탈락으로_바꾼다() {
        FruitStackGame game = game(clock, A, B, C);

        game.out(A, score(40));

        assertThat(game.scoreOf(A)).isEqualTo(score(40));
        assertThat(game.stateOf(A)).isEqualTo(PlayerState.OUT);
        assertThat(game.isPlaying(A)).isFalse();
        assertThat(game.isFinished()).isFalse();
    }

    @Test
    void R19_탈락한_사람의_보고와_또_한_번의_탈락은_거절한다() {
        FruitStackGame game = game(clock, A, B, C);
        game.out(A, score(40));

        assertError(() -> game.report(A, score(50)), ErrorCode.FRUIT_STACK_SCORE_REJECTED);
        assertError(() -> game.out(A, score(40)), ErrorCode.FRUIT_STACK_SCORE_REJECTED);

        assertThat(game.scoreOf(A)).isEqualTo(score(40));
    }

    @Test
    void R20_거절된_탈락_보고는_탈락시키지_않는다() {
        FruitStackGame game = game(clock, A, B, C);
        game.report(A, score(30));

        assertThatThrownBy(() -> game.out(A, score(20))).isNotNull();

        assertThat(game.stateOf(A)).isEqualTo(PlayerState.PLAYING);
    }

    @Test
    void R26_모두_탈락하면_ALL_OUT으로_끝나고_끝난_뒤에는_GAME_ALREADY_OVER다() {
        FruitStackGame game = game(clock, A, B);
        game.out(A, score(20));
        assertThat(game.isFinished()).isFalse();

        game.out(B, score(20));

        assertThat(game.isFinished()).isTrue();
        assertThat(game.result().orElseThrow().reason()).isEqualTo(FruitStackEndReason.ALL_OUT);
        assertThat(game.isPlaying(A)).isFalse();
        assertError(() -> game.report(B, score(30)), ErrorCode.GAME_ALREADY_OVER);
        assertError(() -> game.out(B, score(30)), ErrorCode.GAME_ALREADY_OVER);
    }

    @Test
    void R17_상한_전의_timeUp은_아무것도_하지_않고_상한이_지나면_TIME_UP으로_끝낸다() {
        FruitStackGame game = game(clock, A, B);
        clock.advance(Duration.ofSeconds(599));
        assertThat(game.timeUp()).isFalse();
        assertThat(game.isFinished()).isFalse();

        clock.advance(Duration.ofSeconds(1));

        assertThat(game.timeUp()).isTrue();
        assertThat(game.result().orElseThrow().reason()).isEqualTo(FruitStackEndReason.TIME_UP);
        assertThat(game.timeUp()).isFalse();
    }
}
