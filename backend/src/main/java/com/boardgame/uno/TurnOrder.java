package com.boardgame.uno;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;

// 남은 참가자 자리 순서 + 방향 + 지금 차례인 사람(R4).
public class TurnOrder {

    private final List<PlayerId> seats;
    private Direction direction = Direction.CLOCKWISE;
    private PlayerId current;

    public TurnOrder(List<PlayerId> seats, PlayerId starter) {
        this.seats = new ArrayList<>(seats);
        this.current = starter;
    }

    public PlayerId current() {
        return current;
    }

    public Direction direction() {
        return direction;
    }

    public PlayerId nextOf(PlayerId player) {
        int index = seats.indexOf(player);
        return seats.get(Math.floorMod(index + direction.step(), seats.size()));
    }

    public void advance(int steps) {
        IntStream.range(0, steps).forEach(step -> current = nextOf(current));
    }

    public void reverse() {
        direction = direction.reversed();
    }

    // R36: 차례인 사람이 빠지면 진행 방향의 다음 사람이 차례가 된다.
    public void remove(PlayerId player) {
        if (player.equals(current)) {
            current = nextOf(player);
        }
        seats.remove(player);
    }

    public int size() {
        return seats.size();
    }

    public boolean contains(PlayerId player) {
        return seats.contains(player);
    }

    public List<PlayerId> seats() {
        return List.copyOf(seats);
    }
}
