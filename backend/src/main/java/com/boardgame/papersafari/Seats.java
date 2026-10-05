package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;

public class Seats {

    public static final int MIN_PLAYERS = 2;
    public static final int MAX_PLAYERS = 5;

    private final List<PlayerId> players;

    private Seats(List<PlayerId> players) {
        this.players = players;
    }

    public static Seats of(List<PlayerId> players) {
        if (players.size() < MIN_PLAYERS || players.size() > MAX_PLAYERS) {
            throw new BusinessException(ErrorCode.INVALID_PLAYER_COUNT);
        }
        if (new HashSet<>(players).size() != players.size()) {
            throw new IllegalArgumentException("중복된 플레이어가 있습니다.");
        }
        return new Seats(new ArrayList<>(players));
    }

    public PlayerId next(PlayerId player) {
        return at(indexOf(player) + 1);
    }

    public PlayerId leftOf(PlayerId player) {
        return next(player);
    }

    public PlayerId at(int index) {
        return players.get(Math.floorMod(index, players.size()));
    }

    public void requireSeated(PlayerId player) {
        indexOf(player);
    }

    public void remove(PlayerId player) {
        players.remove(indexOf(player));
    }

    public Optional<PlayerId> soleSurvivor() {
        if (players.size() != 1) {
            return Optional.empty();
        }
        return Optional.of(players.get(0));
    }

    public List<PlayerId> asList() {
        return List.copyOf(players);
    }

    private int indexOf(PlayerId player) {
        int index = players.indexOf(player);
        if (index < 0) {
            throw new BusinessException(ErrorCode.NOT_A_PLAYER);
        }
        return index;
    }
}
