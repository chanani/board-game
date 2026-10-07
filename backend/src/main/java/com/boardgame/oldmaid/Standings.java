package com.boardgame.oldmaid;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

// 손패를 비운 순서와 기권한 순서.
public class Standings {

    private final List<PlayerId> finished = new ArrayList<>();
    private final List<PlayerId> forfeited = new ArrayList<>();

    public FinishRank finish(PlayerId player) {
        finished.add(player);
        return new FinishRank(finished.size());
    }

    public void forfeit(PlayerId player) {
        forfeited.add(player);
    }

    public boolean isOut(PlayerId player) {
        return finished.contains(player) || forfeited.contains(player);
    }

    public boolean hasForfeited(PlayerId player) {
        return forfeited.contains(player);
    }

    public Optional<FinishRank> rankOf(PlayerId player) {
        int index = finished.indexOf(player);
        if (index < 0) {
            return Optional.empty();
        }
        return Optional.of(new FinishRank(index + 1));
    }

    // R30: 끝낸 순서 → 마지막까지 카드를 쥔 사람 → 기권한 사람(늦게 나간 사람이 위).
    public Ranking rank(PlayerId lastHolder) {
        List<RankedPlayer> ranked = new ArrayList<>();
        finished.forEach(player -> ranked.add(entry(player, ranked.size(), Placement.FINISHED)));
        ranked.add(entry(lastHolder, ranked.size(), Placement.lastHolder(!finished.isEmpty())));
        latestFirst(forfeited).forEach(player -> ranked.add(entry(player, ranked.size(), Placement.FORFEITED)));
        return new Ranking(ranked);
    }

    private static RankedPlayer entry(PlayerId player, int above, Placement placement) {
        return new RankedPlayer(player, new FinishRank(above + 1), placement);
    }

    private static List<PlayerId> latestFirst(List<PlayerId> players) {
        List<PlayerId> copy = new ArrayList<>(players);
        Collections.reverse(copy);
        return copy;
    }
}
