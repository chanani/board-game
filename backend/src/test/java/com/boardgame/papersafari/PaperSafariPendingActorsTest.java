package com.boardgame.papersafari;

import static com.boardgame.papersafari.Fixtures.ALICE;
import static com.boardgame.papersafari.Fixtures.BOB;
import static com.boardgame.papersafari.Fixtures.FIRST;
import static com.boardgame.papersafari.Fixtures.LOSER_HAND;
import static com.boardgame.papersafari.Fixtures.WINNER_HAND;
import static com.boardgame.papersafari.Fixtures.stack;
import static com.boardgame.papersafari.Fixtures.zeros;
import static com.boardgame.papersafari.GameFixtures.roundWonBy;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.PendingActor;
import java.util.List;
import org.junit.jupiter.api.Test;

class PaperSafariPendingActorsTest {

    @Test
    void R18_처음_뒤집기는_아직_안_뒤집은_모두가_함께_기다리고_그다음은_차례인_사람이다() {
        PaperSafariRound round = Fixtures.round(List.of(ALICE, BOB),
                stack(List.of(WINNER_HAND, LOSER_HAND), Card.number(7), zeros(10)));

        assertThat(round.pendingActors()).containsExactly(PendingActor.together(1L), PendingActor.together(2L));
        round.flipInitial(ALICE, FIRST);
        assertThat(round.pendingActors()).containsExactly(PendingActor.together(2L));
        round.flipInitial(BOB, FIRST);
        assertThat(round.pendingActors()).containsExactly(PendingActor.turn(1L));
        round.drawFromDeck(ALICE);
        assertThat(round.pendingActors()).containsExactly(PendingActor.turn(1L));
    }

    @Test
    void R18_끝난_게임은_기다리는_사람이_없다() {
        PaperSafariSession session = new PaperSafariSession(List.of(1L, 2L),
                new RoundFactory(StackedShuffler.rounds(List.of(roundWonBy(ALICE))), count -> 0));
        assertThat(session.pendingActors()).hasSize(2);

        session.forfeit(2L);

        assertThat(session.isFinished()).isTrue();
        assertThat(session.pendingActors()).isEmpty();
    }
}
