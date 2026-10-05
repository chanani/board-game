package com.boardgame.papersafari;

import java.util.concurrent.ThreadLocalRandom;

public class RoundFactory {

    private final CardShuffler shuffler;
    private final int starterOffset;

    public RoundFactory(CardShuffler shuffler, int starterOffset) {
        this.shuffler = shuffler;
        this.starterOffset = starterOffset;
    }

    public static RoundFactory random() {
        int offset = ThreadLocalRandom.current().nextInt(Seats.MAX_PLAYERS);
        return new RoundFactory(new RandomCardShuffler(), offset);
    }

    public PaperSafariRound create(Seats seats, RoundNumber number) {
        PlayerId starter = seats.at(starterOffset + number.index());
        return PaperSafariRound.start(seats, starter, shuffler);
    }
}
