package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

public class Seats {

    public static final int MIN_PLAYERS = 2;
    public static final int MAX_PLAYERS = 5;

    private final List<PlayerId> order;
    private final List<PlayerId> seated;

    private Seats(List<PlayerId> order, List<PlayerId> seated) {
        this.order = order;
        this.seated = seated;
    }

    public static Seats of(List<PlayerId> players) {
        if (players.size() < MIN_PLAYERS || players.size() > MAX_PLAYERS) {
            throw new BusinessException(ErrorCode.INVALID_PLAYER_COUNT);
        }
        if (new HashSet<>(players).size() != players.size()) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        return new Seats(List.copyOf(players), new ArrayList<>(players));
    }

    public PlayerId next(PlayerId player) {
        int start = orderIndexOf(player);
        return IntStream.rangeClosed(1, order.size())
                .mapToObj(step -> order.get((start + step) % order.size()))
                .filter(seated::contains)
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_A_PLAYER));
    }

    public PlayerId leftOf(PlayerId player) {
        return next(player);
    }

    public PlayerId at(int index) {
        return seated.get(Math.floorMod(index, seated.size()));
    }

    public int size() {
        return seated.size();
    }

    public void requireSeated(PlayerId player) {
        indexOf(player);
    }

    public void remove(PlayerId player) {
        seated.remove(indexOf(player));
    }

    public Optional<PlayerId> soleSurvivor() {
        if (seated.size() != 1) {
            return Optional.empty();
        }
        return Optional.of(seated.get(0));
    }

    public List<PlayerId> asList() {
        return List.copyOf(seated);
    }

    private int orderIndexOf(PlayerId player) {
        int index = order.indexOf(player);
        if (index < 0) {
            throw new BusinessException(ErrorCode.NOT_A_PLAYER);
        }
        return index;
    }

    private int indexOf(PlayerId player) {
        int index = seated.indexOf(player);
        if (index < 0) {
            throw new BusinessException(ErrorCode.NOT_A_PLAYER);
        }
        return index;
    }
}
