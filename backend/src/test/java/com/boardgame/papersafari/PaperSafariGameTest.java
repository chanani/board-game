package com.boardgame.papersafari;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static com.boardgame.papersafari.Fixtures.ALICE;
import static com.boardgame.papersafari.Fixtures.BOB;
import static com.boardgame.papersafari.Fixtures.CAROL;
import static com.boardgame.papersafari.Fixtures.FIRST;
import static com.boardgame.papersafari.Fixtures.LOSER_HAND;
import static com.boardgame.papersafari.Fixtures.WINNER_HAND;
import static com.boardgame.papersafari.Fixtures.stack;
import static com.boardgame.papersafari.Fixtures.zeros;
import static com.boardgame.papersafari.GameFixtures.game;
import static com.boardgame.papersafari.GameFixtures.playRound;
import static com.boardgame.papersafari.GameFixtures.roundWonBy;
import static com.boardgame.papersafari.GameFixtures.tiedRound;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import java.util.List;
import org.junit.jupiter.api.Test;

class PaperSafariGameTest {

    private static final List<PlayerId> TWO = List.of(ALICE, BOB);
    private static final List<PlayerId> THREE = List.of(ALICE, BOB, CAROL);

    @Test
    void 누군가_6장을_모두_공개해_라운드가_끝나면_게임도_끝나고_최저점_단독이_승리한다() {
        PaperSafariGame game = game(TWO, List.of(roundWonBy(ALICE)));

        playRound(game, ALICE, BOB);

        assertThat(game.status()).isEqualTo(GameStatus.GAME_OVER);
        assertThat(game.winner()).contains(ALICE);
        assertThat(game.outcomeOf(ALICE)).isEqualTo(RoundOutcome.WIN);
        assertThat(game.outcomeOf(BOB)).isEqualTo(RoundOutcome.LOSE);
        assertThat(game.roundNumber()).isEqualTo(RoundNumber.FIRST);
        assertThat(game.lastRoundResult()).hasValueSatisfying(result ->
                assertThat(result.winner()).contains(ALICE));
    }

    @Test
    void 최저점이_같으면_승자_없이_전원_무승부로_게임이_끝난다() {
        PaperSafariGame game = game(TWO, List.of(tiedRound()));

        playRound(game, ALICE, BOB);

        assertThat(game.status()).isEqualTo(GameStatus.GAME_OVER);
        assertThat(game.winner()).isEmpty();
        assertThat(game.outcomeOf(ALICE)).isEqualTo(RoundOutcome.DRAW);
        assertThat(game.outcomeOf(BOB)).isEqualTo(RoundOutcome.DRAW);
        assertThat(game.lastRoundResult()).hasValueSatisfying(result -> {
            assertThat(result.outcomeOf(ALICE)).isEqualTo(RoundOutcome.DRAW);
            assertThat(result.outcomeOf(BOB)).isEqualTo(RoundOutcome.DRAW);
        });
    }

    @Test
    void 게임이_끝나면_어떤_행동도_할_수_없다() {
        PaperSafariGame game = game(TWO, List.of(roundWonBy(ALICE)));
        playRound(game, ALICE, BOB);

        assertError(() -> game.drawFromDeck(BOB), ErrorCode.GAME_ALREADY_OVER);
        assertError(() -> game.drawFromDiscard(BOB), ErrorCode.GAME_ALREADY_OVER);
        assertError(() -> game.cancelDraw(BOB), ErrorCode.GAME_ALREADY_OVER);
        assertError(() -> game.forfeit(ALICE), ErrorCode.GAME_ALREADY_OVER);
    }

    @Test
    void 무승부로_끝난_게임도_더_이상_진행할_수_없다() {
        PaperSafariGame game = game(TWO, List.of(tiedRound()));
        playRound(game, ALICE, BOB);

        assertError(() -> game.drawFromDeck(BOB), ErrorCode.GAME_ALREADY_OVER);
    }

    @Test
    void 기권해서_한_명만_남으면_남은_사람이_승리한다() {
        PaperSafariGame game = game(TWO, List.of(roundWonBy(ALICE)));

        game.forfeit(BOB);

        assertThat(game.status()).isEqualTo(GameStatus.GAME_OVER);
        assertThat(game.winner()).contains(ALICE);
        assertThat(game.outcomeOf(ALICE)).isEqualTo(RoundOutcome.WIN);
        assertThat(game.outcomeOf(BOB)).isEqualTo(RoundOutcome.LOSE);
        assertThat(game.lastRoundResult()).isEmpty();
        assertError(() -> game.flipInitial(ALICE, FIRST), ErrorCode.GAME_ALREADY_OVER);
    }

    @Test
    void 세_명_중_두_명이_기권하면_마지막_남은_사람이_승리한다() {
        PaperSafariGame game = game(THREE, List.of(
                stack(List.of(WINNER_HAND, LOSER_HAND, LOSER_HAND), Card.number(7), zeros(5))));

        game.forfeit(ALICE);
        assertThat(game.status()).isEqualTo(GameStatus.IN_ROUND);
        game.forfeit(CAROL);

        assertThat(game.status()).isEqualTo(GameStatus.GAME_OVER);
        assertThat(game.winner()).contains(BOB);
    }

    @Test
    void 기권한_사람은_차례_순환에서_빠진다() {
        PaperSafariGame game = game(THREE, List.of(
                stack(List.of(WINNER_HAND, LOSER_HAND, LOSER_HAND), Card.number(7), zeros(5))));
        THREE.forEach(player -> game.flipInitial(player, FIRST));
        game.drawFromDeck(ALICE);

        game.forfeit(ALICE);

        assertThat(game.status()).isEqualTo(GameStatus.IN_ROUND);
        assertThat(game.currentPlayer()).isEqualTo(BOB);
        assertThat(game.phase()).isEqualTo(TurnPhase.DRAW);
        game.drawFromDeck(BOB);
        game.discardDrawn(BOB);
        assertThat(game.currentPlayer()).isEqualTo(CAROL);
        game.drawFromDeck(CAROL);
        game.discardDrawn(CAROL);
        assertThat(game.currentPlayer()).isEqualTo(BOB);
    }

    @Test
    void 버린_더미에서_가져온_카드를_되돌리면_다시_뽑기_단계가_된다() {
        PaperSafariGame game = game(TWO, List.of(roundWonBy(ALICE)));
        game.flipInitial(ALICE, FIRST);
        game.flipInitial(BOB, FIRST);
        game.drawFromDiscard(ALICE);

        game.cancelDraw(ALICE);

        assertThat(game.phase()).isEqualTo(TurnPhase.DRAW);
        assertThat(game.currentPlayer()).isEqualTo(ALICE);
    }

    @Test
    void 참가자가_아니면_기권할_수_없다() {
        PaperSafariGame game = game(TWO, List.of(roundWonBy(ALICE)));

        assertError(() -> game.forfeit(CAROL), ErrorCode.NOT_A_PLAYER);
    }
}
