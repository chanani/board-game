package com.boardgame.papersafari;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public class RoundResult {

    private final Map<PlayerId, Score> scores;

    private RoundResult(Map<PlayerId, Score> scores) {
        this.scores = scores;
    }

    public static RoundResult of(Map<PlayerId, Score> scores) {
        return new RoundResult(new LinkedHashMap<>(scores));
    }

    public Optional<PlayerId> winner() {
        List<PlayerId> lowest = lowestPlayers();
        if (lowest.size() != 1) {
            return Optional.empty();
        }
        return Optional.of(lowest.get(0));
    }

    public boolean isDraw() {
        return winner().isEmpty();
    }

    public RoundOutcome outcomeOf(PlayerId player) {
        if (!lowestPlayers().contains(player)) {
            return RoundOutcome.LOSE;
        }
        if (isDraw()) {
            return RoundOutcome.DRAW;
        }
        return RoundOutcome.WIN;
    }

    public Score scoreOf(PlayerId player) {
        return scores.get(player);
    }

    private List<PlayerId> lowestPlayers() {
        Score lowest = Collections.min(scores.values());
        return scores.entrySet().stream()
                .filter(entry -> entry.getValue().equals(lowest))
                .map(Map.Entry::getKey)
                .toList();
    }
}
