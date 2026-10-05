package com.boardgame.papersafari;

public class RoundSequence {

    private final RoundFactory factory;
    private PaperSafariRound current;
    private RoundNumber number;

    private RoundSequence(RoundFactory factory, PaperSafariRound current, RoundNumber number) {
        this.factory = factory;
        this.current = current;
        this.number = number;
    }

    public static RoundSequence begin(RoundFactory factory, Seats seats) {
        return new RoundSequence(factory, factory.create(seats), RoundNumber.FIRST);
    }

    public void next(Seats seats) {
        number = number.next();
        current = factory.create(seats);
    }

    public PaperSafariRound current() {
        return current;
    }

    public RoundNumber number() {
        return number;
    }
}
