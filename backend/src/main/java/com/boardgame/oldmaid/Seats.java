package com.boardgame.oldmaid;

import java.util.List;
import java.util.Optional;
import java.util.function.Predicate;
import java.util.stream.IntStream;

// R4: 처음 참가자 자리 순서(기권해도 빠지지 않는다). 시계 방향 = 자리 +1.
public class Seats {

    private final List<PlayerId> seats;

    public Seats(List<PlayerId> seats) {
        this.seats = List.copyOf(seats);
    }

    public int size() {
        return seats.size();
    }

    public PlayerId at(int index) {
        return seats.get(index);
    }

    public boolean contains(PlayerId player) {
        return seats.contains(player);
    }

    public List<PlayerId> all() {
        return seats;
    }

    public List<PlayerId> inOrderFrom(PlayerId start) {
        int from = seats.indexOf(start);
        return IntStream.range(0, seats.size())
                .mapToObj(step -> seats.get((from + step) % seats.size()))
                .toList();
    }

    // R11·R15: from 다음 자리부터 시계 방향으로 조건에 맞는 첫 사람. from 자신은 보지 않는다.
    public Optional<PlayerId> nextAfter(PlayerId from, Predicate<PlayerId> eligible) {
        return inOrderFrom(from).stream()
                .skip(1)
                .filter(eligible)
                .findFirst();
    }
}
