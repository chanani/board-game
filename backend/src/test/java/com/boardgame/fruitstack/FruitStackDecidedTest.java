package com.boardgame.fruitstack;

import static com.boardgame.fruitstack.FruitStackFixtures.A;
import static com.boardgame.fruitstack.FruitStackFixtures.B;
import static com.boardgame.fruitstack.FruitStackFixtures.C;
import static com.boardgame.fruitstack.FruitStackFixtures.clock;
import static com.boardgame.fruitstack.FruitStackFixtures.game;
import static com.boardgame.fruitstack.FruitStackFixtures.score;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.ResultType;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import org.junit.jupiter.api.Test;

// R26 (나): 살아 있는 사람이 한 명이고 그 점수가 다른 겨루는 사람 모두보다 엄격히 높으면 그 순간 끝난다.
class FruitStackDecidedTest {

    private final MutableClock clock = clock();

    private FruitStackEndReason reasonOf(FruitStackGame game) {
        return game.result().orElseThrow().reason();
    }

    @Test
    void R26_상대가_탈락해_혼자_남는_순간_내_점수가_더_높으면_DECIDED로_끝나고_내가_이긴다() {
        FruitStackGame game = game(clock, A, B);
        game.report(B, score(50));

        game.out(A, score(30));

        assertThat(game.isFinished()).isTrue();
        assertThat(reasonOf(game)).isEqualTo(FruitStackEndReason.DECIDED);
        assertThat(game.result().orElseThrow().standings().winner()).contains(B);
        assertThat(game.stateOf(B)).isEqualTo(PlayerState.PLAYING);
    }

    @Test
    void R26_혼자_남았어도_점수가_같거나_낮으면_이어진다() {
        FruitStackGame tied = game(clock, A, B);
        tied.report(B, score(30));
        tied.out(A, score(30));
        assertThat(tied.isFinished()).isFalse();

        FruitStackGame behind = game(clock, A, B);
        behind.report(B, score(10));
        behind.out(A, score(30));
        assertThat(behind.isFinished()).isFalse();
    }

    @Test
    void R26_이어지다_점수_보고로_엄격히_높아지는_순간_DECIDED로_끝난다() {
        FruitStackGame game = game(clock, A, B);
        game.out(A, score(30));

        game.report(B, score(30));
        assertThat(game.isFinished()).isFalse();
        game.report(B, score(31));

        assertThat(reasonOf(game)).isEqualTo(FruitStackEndReason.DECIDED);
        assertThat(game.result().orElseThrow().standings().winner()).contains(B);
    }

    @Test
    void R26_세_명에서_첫_탈락_때는_두_명이_살아_있어_끝나지_않고_두_번째_탈락_때_판정한다() {
        FruitStackGame game = game(clock, A, B, C);
        game.report(C, score(60));
        game.out(A, score(40));
        assertThat(game.isFinished()).isFalse();

        game.out(B, score(50));

        assertThat(reasonOf(game)).isEqualTo(FruitStackEndReason.DECIDED);
        assertThat(game.result().orElseThrow().standings().winner()).contains(C);
    }

    @Test
    void R26_탈락한_사람들_가운데_가장_높은_점수를_넘어야_끝난다() {
        FruitStackGame game = game(clock, A, B, C);
        game.report(C, score(45));
        game.out(A, score(40));
        game.out(B, score(50));
        assertThat(game.isFinished()).isFalse();

        game.report(C, score(51));

        assertThat(reasonOf(game)).isEqualTo(FruitStackEndReason.DECIDED);
    }

    @Test
    void R26_기권한_사람의_점수는_견주지_않는다() {
        FruitStackGame game = game(clock, A, B, C);
        game.report(A, score(90));
        game.report(C, score(20));
        game.out(B, score(10));
        assertThat(game.isFinished()).isFalse();

        game.forfeit(A);

        assertThat(reasonOf(game)).isEqualTo(FruitStackEndReason.DECIDED);
        assertThat(game.result().orElseThrow().standings().winner()).contains(C);
    }

    @Test
    void R26_넘지_못하고_탈락하면_ALL_OUT이고_상한이면_TIME_UP이다() {
        FruitStackGame out = game(clock, A, B);
        out.out(A, score(30));
        out.out(B, score(20));
        assertThat(reasonOf(out)).isEqualTo(FruitStackEndReason.ALL_OUT);
        assertThat(out.result().orElseThrow().standings().winner()).contains(A);

        FruitStackGame late = game(clock, A, B);
        late.out(A, score(30));
        clock.advance(Duration.ofMinutes(10));
        assertThat(late.timeUp()).isTrue();
        assertThat(reasonOf(late)).isEqualTo(FruitStackEndReason.TIME_UP);
        assertThat(late.result().orElseThrow().standings().entries().get(0).result()).isEqualTo(ResultType.WIN);
    }
}
