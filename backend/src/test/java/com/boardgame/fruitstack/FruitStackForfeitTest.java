package com.boardgame.fruitstack;

import static com.boardgame.fruitstack.FruitStackFixtures.A;
import static com.boardgame.fruitstack.FruitStackFixtures.B;
import static com.boardgame.fruitstack.FruitStackFixtures.C;
import static com.boardgame.fruitstack.FruitStackFixtures.clock;
import static com.boardgame.fruitstack.FruitStackFixtures.game;
import static com.boardgame.fruitstack.FruitStackFixtures.score;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.support.MutableClock;
import org.junit.jupiter.api.Test;

class FruitStackForfeitTest {

    private final MutableClock clock = clock();

    @Test
    void R26_둘이서_한_명이_기권하면_FORFEIT으로_끝나고_남은_사람이_이긴다() {
        FruitStackGame game = game(clock, A, B);
        game.report(A, score(50));

        game.forfeit(A);

        assertThat(game.result().orElseThrow().reason()).isEqualTo(FruitStackEndReason.FORFEIT);
        assertThat(game.result().orElseThrow().standings().winner()).contains(B);
        assertThat(game.stateOf(A)).isEqualTo(PlayerState.FORFEITED);
    }

    @Test
    void R26_셋이_모두_0점일_때_한_명이_기권하면_이어진다() {
        FruitStackGame game = game(clock, A, B, C);

        game.forfeit(A);

        assertThat(game.isFinished()).isFalse();
        assertThat(game.isPlaying(A)).isFalse();
        assertThat(game.isPlaying(B)).isTrue();
    }

    @Test
    void R26_탈락한_사람보다_낮은_남은_한_명이_기권하면_ALL_OUT으로_끝나고_탈락한_사람이_이긴다() {
        FruitStackGame game = game(clock, A, B);
        game.out(A, score(30));
        game.report(B, score(10));

        game.forfeit(B);

        assertThat(game.result().orElseThrow().reason()).isEqualTo(FruitStackEndReason.ALL_OUT);
        assertThat(game.result().orElseThrow().standings().winner()).contains(A);
    }

    @Test
    void R29_탈락한_사람의_기권은_아무것도_바꾸지_않는다() {
        FruitStackGame game = game(clock, A, B, C);
        game.out(A, score(30));

        game.forfeit(A);

        assertThat(game.stateOf(A)).isEqualTo(PlayerState.OUT);
        assertThat(game.isFinished()).isFalse();
    }

    @Test
    void 참가자가_아닌_사람과_끝난_뒤의_기권은_조용히_넘어간다() {
        FruitStackGame game = game(clock, A, B);
        game.forfeit(new PlayerId(99));
        assertThat(game.isFinished()).isFalse();

        game.forfeit(A);
        game.forfeit(B);

        assertThat(game.stateOf(B)).isEqualTo(PlayerState.PLAYING);
    }
}
