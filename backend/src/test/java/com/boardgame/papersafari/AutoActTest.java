package com.boardgame.papersafari;

import static com.boardgame.papersafari.Fixtures.ALICE;
import static com.boardgame.papersafari.Fixtures.BOB;
import static com.boardgame.papersafari.Fixtures.FIRST;
import static com.boardgame.papersafari.Fixtures.LOSER_HAND;
import static com.boardgame.papersafari.Fixtures.WINNER_HAND;
import static com.boardgame.papersafari.Fixtures.flipFirst;
import static com.boardgame.papersafari.Fixtures.round;
import static com.boardgame.papersafari.Fixtures.stack;
import static com.boardgame.papersafari.Fixtures.zeros;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.support.FixedRandom;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

// 시간 초과 때 서버가 대신 하는 행동. 칸 순서는 Position.all()(윗줄 왼→오, 아랫줄 왼→오)이다.
class AutoActTest {

    private static final List<PlayerId> TWO = List.of(ALICE, BOB);
    private static final Position MIDDLE_BOTTOM = new Position(1, 1);

    // ALICE 판 1~6, BOB 판 9,9,9,8,8,8, 버린 카드 7, 덱은 deck 순서
    private PaperSafariRound started(List<Card> deck) {
        return round(TWO, stack(List.of(WINNER_HAND, LOSER_HAND), Card.number(7), deck));
    }

    @Test
    void 시작_뒤집기에서는_아직_안_뒤집은_사람마다_무작위_한_장을_뒤집는다() {
        PaperSafariRound round = started(zeros(10));
        round.flipInitial(ALICE, FIRST);

        List<PlayerId> actors = round.autoAct(new FixedRandom(4));

        assertThat(actors).containsExactly(BOB);
        assertThat(round.boardOf(BOB).isFaceDown(MIDDLE_BOTTOM)).isFalse();
        assertThat(round.boardOf(ALICE).isFaceDown(MIDDLE_BOTTOM)).isTrue();
        assertThat(round.phase()).isEqualTo(TurnPhase.DRAW);
    }

    @Test
    void 시작_뒤집기에서_아무도_안_뒤집었으면_모두_뒤집는다() {
        PaperSafariRound round = started(zeros(10));

        List<PlayerId> actors = round.autoAct(new FixedRandom(0));

        assertThat(actors).containsExactly(ALICE, BOB);
        assertThat(round.boardOf(ALICE).isFaceDown(FIRST)).isFalse();
        assertThat(round.boardOf(BOB).isFaceDown(FIRST)).isFalse();
        assertThat(round.phase()).isEqualTo(TurnPhase.DRAW);
    }

    @Test
    void 가져오기에서는_버린_카드_맨_위를_가져와_무작위_칸과_바꾼다() {
        PaperSafariRound round = started(zeros(10));
        flipFirst(round, TWO);
        int deckBefore = round.deckSize();

        List<PlayerId> actors = round.autoAct(new FixedRandom(4));

        assertThat(actors).containsExactly(ALICE);
        assertThat(round.boardOf(ALICE).cardAt(MIDDLE_BOTTOM)).isEqualTo(Card.number(7));
        assertThat(round.discardTop()).contains(Card.number(5));
        assertThat(round.deckSize()).isEqualTo(deckBefore);
        assertThat(round.currentPlayer()).isEqualTo(BOB);
        assertThat(round.phase()).isEqualTo(TurnPhase.DRAW);
    }

    @Test
    void 놓기에서는_들고_있는_카드를_무작위_칸과_바꾼다() {
        PaperSafariRound round = started(zeros(10));
        flipFirst(round, TWO);
        round.drawFromDeck(ALICE);

        round.autoAct(new FixedRandom(2));

        assertThat(round.boardOf(ALICE).cardAt(new Position(2, 0))).isEqualTo(Card.number(0));
        assertThat(round.discardTop()).contains(Card.number(3));
        assertThat(round.currentPlayer()).isEqualTo(BOB);
    }

    @Test
    void 엿보기에서는_뒷면_칸_중_무작위_한_장을_엿본다() {
        PaperSafariRound round = started(List.of(Card.elephant(), Card.number(0), Card.number(0)));
        flipFirst(round, TWO);
        round.drawFromDeck(ALICE);
        round.swapAt(ALICE, new Position(1, 0));

        List<PlayerId> actors = round.autoAct(new FixedRandom(0));

        assertThat(actors).containsExactly(ALICE);
        assertThat(round.knows(ALICE, new Position(2, 0))).isTrue();
        assertThat(round.currentPlayer()).isEqualTo(BOB);
        assertThat(round.phase()).isEqualTo(TurnPhase.DRAW);
    }

    @Test
    void 자동_행동으로_마지막_칸이_열리면_라운드가_끝난다() {
        PaperSafariRound round = started(zeros(10));
        flipFirst(round, TWO);
        List<Position> rest = new ArrayList<>(Fixtures.REST);
        Position last = rest.remove(rest.size() - 1);
        rest.forEach(position -> playTurn(round, position));

        round.autoAct(new FixedRandom(Position.all().indexOf(last)));

        assertThat(round.isOver()).isTrue();
    }

    @Test
    void 거부된_행동은_자동_행동_표시를_지우지_않고_자동_행동마다_순번이_오른다() {
        PaperSafariGame game = PaperSafariGame.start(TWO,
                new RoundFactory(StackedShuffler.of(stack(List.of(WINNER_HAND, LOSER_HAND), Card.number(7),
                        zeros(10))), count -> 0));
        game.autoAct(new FixedRandom(0));

        try {
            game.drawFromDeck(BOB);
        } catch (RuntimeException ignored) {
            // ALICE 차례라 거부된다.
        }

        assertThat(game.viewFor(ALICE).lastAutoActorIds()).containsExactly(ALICE.value(), BOB.value());
        game.autoAct(new FixedRandom(0));
        assertThat(game.viewFor(ALICE).autoActSeq()).isEqualTo(2L);
        assertThat(game.viewFor(ALICE).lastAutoActorIds()).containsExactly(ALICE.value());
    }

    private void playTurn(PaperSafariRound round, Position position) {
        round.drawFromDeck(ALICE);
        round.swapAt(ALICE, position);
        round.drawFromDeck(BOB);
        round.discardDrawn(BOB);
    }

    @Test
    void 게임은_마지막_자동_행동을_한_사람을_기억하고_사람이_행동하면_지운다() {
        PaperSafariGame game = PaperSafariGame.start(TWO,
                new RoundFactory(StackedShuffler.of(stack(List.of(WINNER_HAND, LOSER_HAND), Card.number(7),
                        zeros(10))), count -> 0));
        game.flipInitial(ALICE, FIRST);

        game.autoAct(new FixedRandom(4));

        assertThat(game.viewFor(ALICE).lastAutoActorId()).isEqualTo(BOB.value());
        assertThat(game.viewFor(ALICE).lastAutoActorIds()).containsExactly(BOB.value());

        assertThat(game.viewFor(ALICE).autoActSeq()).isEqualTo(1L);
        assertThat(game.viewFor(BOB).autoActSeq()).isEqualTo(1L);

        game.drawFromDeck(ALICE);

        assertThat(game.viewFor(ALICE).autoActSeq()).isEqualTo(1L);
        assertThat(game.viewFor(ALICE).lastAutoActorId()).isNull();
        assertThat(game.viewFor(ALICE).lastAutoActorIds()).isEmpty();
    }
}
