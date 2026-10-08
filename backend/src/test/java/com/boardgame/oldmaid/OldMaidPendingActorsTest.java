package com.boardgame.oldmaid;

import static com.boardgame.oldmaid.OldMaidFixtures.A;
import static com.boardgame.oldmaid.OldMaidFixtures.JOKER;
import static com.boardgame.oldmaid.OldMaidFixtures.c;
import static com.boardgame.oldmaid.OldMaidFixtures.d;
import static com.boardgame.oldmaid.OldMaidFixtures.game;
import static com.boardgame.oldmaid.OldMaidFixtures.h;
import static com.boardgame.oldmaid.OldMaidFixtures.hands;
import static com.boardgame.oldmaid.OldMaidFixtures.opening;
import static com.boardgame.oldmaid.OldMaidFixtures.s;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.PendingActor;
import java.util.List;
import org.junit.jupiter.api.Test;

class OldMaidPendingActorsTest {

    @Test
    void R18_처음_버리기는_짝이_남은_사람만_함께_기다리고_그다음은_뽑는_사람과_섞을_수_있는_사람이다() {
        OldMaidGame game = opening(A, hands(List.of(s(Rank.ACE), h(Rank.ACE), s(Rank.TWO)),
                List.of(d(Rank.TWO), c(Rank.THREE), JOKER)));
        assertThat(game.pendingActors()).containsExactly(PendingActor.together(1L));

        game.discardAll(A);

        assertThat(game.stage()).isEqualTo(OldMaidStage.DRAW);
        assertThat(game.pendingActors()).containsExactly(PendingActor.turn(1L), PendingActor.reaction(2L));
    }

    @Test
    void R18_끝난_게임은_기다리는_사람이_없다() {
        OldMaidGame game = game(A, hands(List.of(s(Rank.TWO)), List.of(d(Rank.TWO), JOKER)));

        game.draw(A, new SlotIndex(0));
        game.discardAll(A);

        assertThat(game.isFinished()).isTrue();
        assertThat(game.pendingActors()).isEmpty();
    }

    @Test
    void R18_뽑은_뒤_짝을_버리는_동안에도_뽑은_사람이_차례다() {
        OldMaidGame game = game(A, hands(List.of(s(Rank.FIVE), d(Rank.THREE)), List.of(h(Rank.FIVE), JOKER, c(Rank.SEVEN))));

        game.draw(A, new SlotIndex(0));

        assertThat(game.stage()).isEqualTo(OldMaidStage.DISCARD);
        assertThat(game.pendingActors()).contains(PendingActor.turn(1L));
        assertThat(game.pendingActors()).filteredOn(actor -> actor.memberId() == 1L).hasSize(1);
    }
}
