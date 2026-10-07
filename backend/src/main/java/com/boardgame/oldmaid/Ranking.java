package com.boardgame.oldmaid;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.List;
import java.util.Optional;

// 최종 등수(1등부터).
public class Ranking {

    private final List<RankedPlayer> entries;

    public Ranking(List<RankedPlayer> entries) {
        this.entries = List.copyOf(entries);
    }

    public List<RankedPlayer> entries() {
        return entries;
    }

    public RankedPlayer winner() {
        return entries.get(0);
    }

    public RankedPlayer lastHolder() {
        return entries.stream()
                .filter(RankedPlayer::isLastHolder)
                .findFirst()
                .orElseThrow();
    }

    public Optional<PlayerId> thief() {
        return entries.stream()
                .filter(entry -> entry.placement() == Placement.THIEF)
                .map(RankedPlayer::player)
                .findFirst();
    }

    public RankedPlayer of(PlayerId player) {
        return entries.stream()
                .filter(entry -> entry.player().equals(player))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_A_PLAYER));
    }

    public FinishRank rankOf(PlayerId player) {
        return of(player).rank();
    }
}
