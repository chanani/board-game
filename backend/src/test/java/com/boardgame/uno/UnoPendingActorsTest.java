package com.boardgame.uno;

import static com.boardgame.uno.UnoColor.BLUE;
import static com.boardgame.uno.UnoColor.RED;
import static com.boardgame.uno.UnoFixtures.A;
import static com.boardgame.uno.UnoFixtures.B;
import static com.boardgame.uno.UnoFixtures.C;
import static com.boardgame.uno.UnoFixtures.filler;
import static com.boardgame.uno.UnoFixtures.game;
import static com.boardgame.uno.UnoFixtures.num;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.PendingActor;
import java.util.List;
import org.junit.jupiter.api.Test;

class UnoPendingActorsTest {

    private static final UnoCard FIRST = num(RED, 5);
    private static final List<List<UnoCard>> HANDS = List.of(
            List.of(num(RED, 1), num(RED, 2)),
            List.of(num(RED, 3), num(BLUE, 8)),
            List.of(num(RED, 4), num(BLUE, 9)));

    @Test
    void R18_차례인_사람과_잡기_창이_열리면_나머지_남은_사람이_반응을_기다린다() {
        UnoGame game = game(List.of(A, B, C), HANDS, FIRST, filler(20));
        assertThat(game.pendingActors()).containsExactly(PendingActor.turn(1L));

        game.play(A, num(RED, 1).id(), ChosenColor.none());

        assertThat(game.catchTarget()).contains(A);
        assertThat(game.pendingActors()).containsExactly(
                PendingActor.turn(2L), PendingActor.reaction(1L), PendingActor.reaction(3L));
    }

    @Test
    void R18_끝난_게임은_기다리는_사람이_없다() {
        UnoGame game = game(List.of(A, B), List.of(HANDS.get(0), HANDS.get(1)), FIRST, filler(20));

        game.forfeit(B);

        assertThat(game.isFinished()).isTrue();
        assertThat(game.pendingActors()).isEmpty();
    }
}
