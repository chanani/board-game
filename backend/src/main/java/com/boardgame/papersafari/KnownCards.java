package com.boardgame.papersafari;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class KnownCards {

    private final Map<PlayerId, Set<Position>> known = new HashMap<>();

    public void remember(PlayerId player, Position position) {
        known.computeIfAbsent(player, key -> new HashSet<>()).add(position);
    }

    public void forget(PlayerId player, Position position) {
        known.getOrDefault(player, new HashSet<>()).remove(position);
    }

    public boolean knows(PlayerId player, Position position) {
        return known.getOrDefault(player, Set.of()).contains(position);
    }
}
