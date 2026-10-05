package com.boardgame.papersafari;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

public class Tokens {

    private static final TokenCount WINNING_COUNT = new TokenCount(3);

    private final Map<PlayerId, TokenCount> counts;

    private Tokens(Map<PlayerId, TokenCount> counts) {
        this.counts = counts;
    }

    public static Tokens forPlayers(Seats seats) {
        Map<PlayerId, TokenCount> counts = new LinkedHashMap<>();
        seats.asList().forEach(player -> counts.put(player, TokenCount.ZERO));
        return new Tokens(counts);
    }

    public void award(PlayerId player) {
        counts.computeIfPresent(player, (key, count) -> count.next());
    }

    public TokenCount countOf(PlayerId player) {
        return counts.getOrDefault(player, TokenCount.ZERO);
    }

    public Optional<PlayerId> champion() {
        return counts.entrySet().stream()
                .filter(entry -> entry.getValue().hasReached(WINNING_COUNT))
                .map(Map.Entry::getKey)
                .findFirst();
    }

    public Map<Long, Integer> toView() {
        Map<Long, Integer> view = new LinkedHashMap<>();
        counts.forEach((player, count) -> view.put(player.value(), count.value()));
        return view;
    }
}
