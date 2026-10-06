package com.boardgame.papersafari;

import static com.boardgame.papersafari.Fixtures.ALICE;
import static com.boardgame.papersafari.Fixtures.BOB;
import static com.boardgame.papersafari.Fixtures.FIRST;
import static com.boardgame.papersafari.Fixtures.LOSER_HAND;
import static com.boardgame.papersafari.Fixtures.WINNER_HAND;
import static com.boardgame.papersafari.Fixtures.stack;
import static com.boardgame.papersafari.GameFixtures.game;
import static com.boardgame.papersafari.GameFixtures.playRound;
import static com.boardgame.papersafari.GameFixtures.roundWonBy;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.papersafari.view.BoardView;
import com.boardgame.papersafari.view.CardView;
import com.boardgame.papersafari.view.HeldView;
import com.boardgame.papersafari.view.PaperSafariView;
import com.boardgame.papersafari.view.PlayerResultView;
import com.boardgame.papersafari.view.SlotView;
import java.util.List;
import org.junit.jupiter.api.Test;

class PaperSafariViewTest {

    private static final List<PlayerId> TWO = List.of(ALICE, BOB);

    private PaperSafariGame startedGame(Card... deck) {
        PaperSafariGame game = game(TWO, List.of(
                stack(List.of(WINNER_HAND, LOSER_HAND), Card.number(7), List.of(deck))));
        game.flipInitial(ALICE, FIRST);
        game.flipInitial(BOB, FIRST);
        return game;
    }

    private SlotView slotOf(PaperSafariView view, PlayerId owner, Position position) {
        BoardView board = view.round().boards().stream()
                .filter(candidate -> candidate.playerId() == owner.value())
                .findFirst().orElseThrow();
        return board.slots().stream()
                .filter(slot -> slot.column() == position.column() && slot.row() == position.row())
                .findFirst().orElseThrow();
    }

    @Test
    void 뒷면_카드는_주인에게도_상대에게도_보이지_않는다() {
        PaperSafariGame game = startedGame(Card.number(0));

        PaperSafariView view = game.viewFor(ALICE);

        SlotView bobFirst = slotOf(view, BOB, FIRST);
        assertThat(bobFirst.faceUp()).isTrue();
        assertThat(bobFirst.card()).isEqualTo(new CardView(CardKind.NUMBER, 9));
        SlotView bobHidden = slotOf(view, BOB, new Position(1, 0));
        assertThat(bobHidden.faceUp()).isFalse();
        assertThat(bobHidden.card()).isNull();
        assertThat(slotOf(view, ALICE, new Position(1, 0)).card()).isNull();
    }

    @Test
    void 엿본_카드는_본인에게만_보인다() {
        PaperSafariGame game = startedGame(Card.elephant());
        Position peeked = new Position(2, 0);
        game.drawFromDeck(ALICE);
        game.swapAt(ALICE, new Position(1, 0));
        game.peekAt(ALICE, peeked);

        SlotView mine = slotOf(game.viewFor(ALICE), ALICE, peeked);
        SlotView theirs = slotOf(game.viewFor(BOB), ALICE, peeked);

        assertThat(mine.known()).isTrue();
        assertThat(mine.faceUp()).isFalse();
        assertThat(mine.card()).isEqualTo(new CardView(CardKind.NUMBER, 3));
        assertThat(theirs.known()).isFalse();
        assertThat(theirs.card()).isNull();
    }

    @Test
    void 들고_있는_카드는_본인에게만_보이고_상대에게는_출처만_보인다() {
        PaperSafariGame game = startedGame(Card.number(0));
        game.drawFromDeck(ALICE);

        HeldView mine = game.viewFor(ALICE).round().held();
        HeldView theirs = game.viewFor(BOB).round().held();

        assertThat(mine).isEqualTo(new HeldView(1L, DrawSource.DECK, new CardView(CardKind.NUMBER, 0)));
        assertThat(theirs).isEqualTo(new HeldView(1L, DrawSource.DECK, null));
    }

    @Test
    void 공통_정보는_모두에게_같다() {
        PaperSafariGame game = startedGame(Card.number(0), Card.number(0));

        PaperSafariView view = game.viewFor(BOB);

        assertThat(view.viewerId()).isEqualTo(2L);
        assertThat(view.status()).isEqualTo(GameStatus.IN_ROUND);
        assertThat(view.roundNumber()).isEqualTo(1);
        assertThat(view.round().phase()).isEqualTo(TurnPhase.DRAW);
        assertThat(view.round().currentPlayerId()).isEqualTo(1L);
        assertThat(view.round().deckSize()).isEqualTo(2);
        assertThat(view.round().discardTop()).isEqualTo(new CardView(CardKind.NUMBER, 7));
        assertThat(view.round().held()).isNull();
        assertThat(view.lastRoundResult()).isNull();
        assertThat(view.winnerId()).isNull();
    }

    @Test
    void 게임이_끝나면_모든_카드와_결과와_승자를_보여준다() {
        PaperSafariGame game = game(TWO, List.of(roundWonBy(ALICE)));
        playRound(game, ALICE, BOB);

        PaperSafariView view = game.viewFor(BOB);

        assertThat(view.status()).isEqualTo(GameStatus.GAME_OVER);
        assertThat(view.roundNumber()).isEqualTo(1);
        assertThat(view.winnerId()).isEqualTo(1L);
        assertThat(slotOf(view, ALICE, new Position(1, 1)).card()).isEqualTo(new CardView(CardKind.NUMBER, 0));
        assertThat(slotOf(view, BOB, new Position(2, 1)).card()).isEqualTo(new CardView(CardKind.NUMBER, 8));
        assertThat(view.lastRoundResult().players()).containsExactly(
                new PlayerResultView(1L, 1, RoundOutcome.WIN),
                new PlayerResultView(2L, 51, RoundOutcome.LOSE));
    }
}
