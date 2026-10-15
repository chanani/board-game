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
import java.util.List;
import org.junit.jupiter.api.Test;

class StandingsTest {

    private final MutableClock clock = clock();

    private Standings timeUp(FruitStackGame game) {
        clock.advance(Duration.ofMinutes(10));
        game.expire();
        return game.result().orElseThrow().standings();
    }

    private List<ResultType> resultsInSeatOrder(Standings standings) {
        return standings.inSeatOrder().stream().map(Standing::result).toList();
    }

    private List<Integer> placesInSeatOrder(Standings standings) {
        return standings.inSeatOrder().stream().map(Standing::place).map(Place::value).toList();
    }

    @Test
    void R27_최고_점수_한_명이_이기고_나머지는_진다() {
        FruitStackGame game = game(clock, A, B, C);
        game.report(A, score(10));
        game.report(B, score(30));
        game.report(C, score(20));

        Standings standings = timeUp(game);

        assertThat(resultsInSeatOrder(standings)).containsExactly(ResultType.LOSE, ResultType.WIN, ResultType.LOSE);
        assertThat(placesInSeatOrder(standings)).containsExactly(3, 1, 2);
        assertThat(standings.entries().stream().map(Standing::player).toList()).containsExactly(B, C, A);
        assertThat(standings.winner()).contains(B);
    }

    @Test
    void R27_최고_점수가_같으면_그들끼리_비기고_나머지는_진다() {
        FruitStackGame game = game(clock, A, B, C);
        game.report(A, score(30));
        game.report(B, score(30));
        game.report(C, score(20));

        Standings standings = timeUp(game);

        assertThat(resultsInSeatOrder(standings)).containsExactly(ResultType.DRAW, ResultType.DRAW, ResultType.LOSE);
        assertThat(placesInSeatOrder(standings)).containsExactly(1, 1, 3);
        assertThat(standings.winner()).isEmpty();
    }

    @Test
    void R27_모두_0점이면_모두_비긴다() {
        Standings standings = timeUp(game(clock, A, B));

        assertThat(resultsInSeatOrder(standings)).containsExactly(ResultType.DRAW, ResultType.DRAW);
    }

    @Test
    void R27_기권한_사람은_최고_점수여도_지고_마지막_등수다() {
        FruitStackGame game = game(clock, A, B, C);
        game.report(A, score(90));
        game.report(B, score(30));
        game.forfeit(A);

        Standings standings = timeUp(game);

        assertThat(resultsInSeatOrder(standings)).containsExactly(ResultType.LOSE, ResultType.WIN, ResultType.LOSE);
        assertThat(placesInSeatOrder(standings)).containsExactly(3, 1, 2);
        assertThat(standings.contenders().stream().map(Standing::player).toList()).containsExactly(B, C);
        assertThat(standings.entries().get(2).state()).isEqualTo(PlayerState.FORFEITED);
        assertThat(standings.entries().get(2).score()).isEqualTo(score(90));
    }
}
