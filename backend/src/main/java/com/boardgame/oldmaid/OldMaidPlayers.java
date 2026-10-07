package com.boardgame.oldmaid;

import java.util.List;
import java.util.Optional;
import java.util.function.Predicate;

// 자리와 등수 묶음.
public class OldMaidPlayers {

    private final Seats seats;
    private final Standings standings = new Standings();

    public OldMaidPlayers(Seats seats) {
        this.seats = seats;
    }

    List<PlayerId> seats() {
        return seats.all();
    }

    List<PlayerId> inOrderFrom(PlayerId start) {
        return seats.inOrderFrom(start);
    }

    boolean isSeated(PlayerId player) {
        return seats.contains(player);
    }

    // R9: from부터(자기 포함) 조건에 맞는 첫 사람.
    PlayerId firstHolderFrom(PlayerId from, Predicate<PlayerId> holds) {
        return seats.inOrderFrom(from)
                .stream()
                .filter(holds)
                .findFirst()
                .orElseThrow();
    }

    PlayerId nextHolder(PlayerId from, Predicate<PlayerId> holds) {
        return seats.nextAfter(from, holds).orElseThrow();
    }

    Optional<PlayerId> nextHolderIfAny(PlayerId from, Predicate<PlayerId> holds) {
        return seats.nextAfter(from, holds);
    }

    FinishRank finish(PlayerId player) {
        return standings.finish(player);
    }

    void forfeit(PlayerId player) {
        standings.forfeit(player);
    }

    boolean isOut(PlayerId player) {
        return standings.isOut(player);
    }

    boolean hasForfeited(PlayerId player) {
        return standings.hasForfeited(player);
    }

    Optional<FinishRank> rankOf(PlayerId player) {
        return standings.rankOf(player);
    }

    Ranking rank(PlayerId lastHolder) {
        return standings.rank(lastHolder);
    }
}
