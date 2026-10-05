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
    void 라운드_승자는_토큰을_하나_받는다() {
        PaperSafariGame game = game(TWO, List.of(roundWonBy(ALICE)));

        playRound(game, ALICE, BOB);

        assertThat(game.status()).isEqualTo(GameStatus.ROUND_OVER);
        assertThat(game.tokensOf(ALICE)).isEqualTo(new TokenCount(1));
        assertThat(game.tokensOf(BOB)).isEqualTo(TokenCount.ZERO);
        assertThat(game.lastRoundResult()).hasValueSatisfying(result ->
                assertThat(result.winner()).contains(ALICE));
    }

    @Test
    void 최저점이_같으면_라운드_무승부로_아무도_토큰을_받지_않는다() {
        PaperSafariGame game = game(TWO, List.of(tiedRound()));

        playRound(game, ALICE, BOB);

        assertThat(game.tokensOf(ALICE)).isEqualTo(TokenCount.ZERO);
        assertThat(game.tokensOf(BOB)).isEqualTo(TokenCount.ZERO);
        assertThat(game.lastRoundResult()).hasValueSatisfying(result -> {
            assertThat(result.outcomeOf(ALICE)).isEqualTo(RoundOutcome.DRAW);
            assertThat(result.outcomeOf(BOB)).isEqualTo(RoundOutcome.DRAW);
        });
    }

    @Test
    void 다음_라운드는_다음_좌석부터_시작한다() {
        PaperSafariGame game = game(TWO, List.of(roundWonBy(ALICE), roundWonBy(ALICE)));
        playRound(game, ALICE, BOB);

        game.startNextRound();

        assertThat(game.roundNumber()).isEqualTo(new RoundNumber(2));
        assertThat(game.currentPlayer()).isEqualTo(BOB);
        assertThat(game.phase()).isEqualTo(TurnPhase.SETUP_FLIP);
        assertThat(game.status()).isEqualTo(GameStatus.IN_ROUND);
        assertThat(game.lastRoundResult()).isEmpty();
    }

    @Test
    void 라운드가_끝나기_전에는_다음_라운드를_시작할_수_없다() {
        PaperSafariGame game = game(TWO, List.of(roundWonBy(ALICE)));

        assertError(game::startNextRound, ErrorCode.ROUND_NOT_OVER);
    }

    @Test
    void 토큰_3개를_먼저_모으면_게임에서_승리하고_더_이상_진행할_수_없다() {
        PaperSafariGame game = game(TWO, List.of(
                roundWonBy(ALICE), roundWonBy(BOB), roundWonBy(ALICE), roundWonBy(ALICE)));

        playRound(game, ALICE, BOB);
        game.startNextRound();
        playRound(game, BOB, ALICE);
        game.startNextRound();
        playRound(game, ALICE, BOB);
        game.startNextRound();
        playRound(game, ALICE, BOB);

        assertThat(game.status()).isEqualTo(GameStatus.GAME_OVER);
        assertThat(game.winner()).contains(ALICE);
        assertThat(game.tokensOf(ALICE)).isEqualTo(new TokenCount(3));
        assertThat(game.tokensOf(BOB)).isEqualTo(new TokenCount(1));
        assertError(game::startNextRound, ErrorCode.GAME_ALREADY_OVER);
        assertError(() -> game.forfeit(BOB), ErrorCode.GAME_ALREADY_OVER);
    }

    @Test
    void 기권해서_한_명만_남으면_남은_사람이_승리한다() {
        PaperSafariGame game = game(TWO, List.of(roundWonBy(ALICE)));

        game.forfeit(BOB);

        assertThat(game.status()).isEqualTo(GameStatus.GAME_OVER);
        assertThat(game.winner()).contains(ALICE);
        assertError(() -> game.flipInitial(ALICE, FIRST), ErrorCode.GAME_ALREADY_OVER);
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
    void 참가자가_아니면_기권할_수_없다() {
        PaperSafariGame game = game(TWO, List.of(roundWonBy(ALICE)));

        assertError(() -> game.forfeit(CAROL), ErrorCode.NOT_A_PLAYER);
    }
}
