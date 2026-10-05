package com.boardgame.papersafari;

import static com.boardgame.papersafari.Fixtures.ALICE;
import static com.boardgame.papersafari.Fixtures.BOB;
import static com.boardgame.papersafari.Fixtures.FIRST;
import static com.boardgame.papersafari.Fixtures.LOSER_HAND;
import static com.boardgame.papersafari.Fixtures.REST;
import static com.boardgame.papersafari.Fixtures.WINNER_HAND;
import static com.boardgame.papersafari.Fixtures.numbers;
import static com.boardgame.papersafari.Fixtures.stack;
import static com.boardgame.papersafari.Fixtures.zeros;

import java.util.List;

final class GameFixtures {

    private GameFixtures() {
    }

    static PaperSafariGame game(List<PlayerId> players, List<List<Card>> roundStacks) {
        return PaperSafariGame.start(players, new RoundFactory(StackedShuffler.rounds(roundStacks), count -> 0));
    }

    // ALICE·BOB 2인 라운드: winner는 1점, 상대는 51점
    static List<Card> roundWonBy(PlayerId winner) {
        if (winner.equals(ALICE)) {
            return stack(List.of(WINNER_HAND, LOSER_HAND), Card.number(7), zeros(10));
        }
        return stack(List.of(LOSER_HAND, WINNER_HAND), Card.number(7), zeros(10));
    }

    // ALICE가 모두 공개해 1점, BOB도 1점 → 무승부
    static List<Card> tiedRound() {
        return stack(List.of(WINNER_HAND, numbers(1, 0, 0, 0, 0, 0)), Card.number(7), zeros(10));
    }

    // 2인 게임에서 finisher가 0으로 5칸을 채워 라운드를 끝낸다. other는 자기 차례에 뽑아서 버린다.
    static void playRound(PaperSafariGame game, PlayerId finisher, PlayerId other) {
        game.flipInitial(ALICE, FIRST);
        game.flipInitial(BOB, FIRST);
        for (Position position : REST) {
            passIfTurnOf(game, other);
            game.drawFromDeck(finisher);
            game.swapAt(finisher, position);
        }
    }

    private static void passIfTurnOf(PaperSafariGame game, PlayerId player) {
        if (!game.currentPlayer().equals(player)) {
            return;
        }
        game.drawFromDeck(player);
        game.discardDrawn(player);
    }
}
