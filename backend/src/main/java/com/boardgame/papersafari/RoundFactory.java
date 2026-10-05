package com.boardgame.papersafari;

import java.util.concurrent.ThreadLocalRandom;
import java.util.function.IntUnaryOperator;

public class RoundFactory {

    private final CardShuffler shuffler;
    private final IntUnaryOperator firstStarterPicker;
    private PlayerId lastStarter;

    public RoundFactory(CardShuffler shuffler, IntUnaryOperator firstStarterPicker) {
        this.shuffler = shuffler;
        this.firstStarterPicker = firstStarterPicker;
    }

    public static RoundFactory random() {
        return new RoundFactory(new RandomCardShuffler(), count -> ThreadLocalRandom.current().nextInt(count));
    }

    public PaperSafariRound create(Seats seats) {
        PlayerId starter = starterFor(seats);
        lastStarter = starter;
        return PaperSafariRound.start(seats, starter, shuffler);
    }

    private PlayerId starterFor(Seats seats) {
        if (lastStarter == null) {
            return seats.at(firstStarterPicker.applyAsInt(seats.size()));
        }
        return seats.next(lastStarter);
    }
}
