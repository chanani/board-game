package com.boardgame.papersafari;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

final class Fixtures {

    static final PlayerId ALICE = new PlayerId(1L);
    static final PlayerId BOB = new PlayerId(2L);
    static final PlayerId CAROL = new PlayerId(3L);

    static final Position FIRST = new Position(0, 0);
    static final List<Position> REST = List.of(
            new Position(1, 0), new Position(2, 0),
            new Position(0, 1), new Position(1, 1), new Position(2, 1));

    // 열 쌍: (1,4) (2,5) (3,6)
    static final List<Card> WINNER_HAND = numbers(1, 2, 3, 4, 5, 6);
    // 열 쌍: (9,8) (9,8) (9,8) → 51점
    static final List<Card> LOSER_HAND = numbers(9, 9, 9, 8, 8, 8);

    private Fixtures() {
    }

    static List<Card> numbers(int... values) {
        return Arrays.stream(values).mapToObj(Card::number).toList();
    }

    static List<Card> zeros(int count) {
        return Collections.nCopies(count, Card.number(0));
    }

    static List<Card> stack(List<List<Card>> hands, Card discardTop, List<Card> deck) {
        List<Card> cards = new ArrayList<>();
        hands.forEach(cards::addAll);
        cards.add(discardTop);
        cards.addAll(deck);
        return cards;
    }

    static PaperSafariRound round(List<PlayerId> players, List<Card> stacked) {
        return PaperSafariRound.start(Seats.of(players), players.get(0), StackedShuffler.of(stacked));
    }

    static void flipFirst(PaperSafariRound round, List<PlayerId> players) {
        players.forEach(player -> round.flipInitial(player, FIRST));
    }
}
