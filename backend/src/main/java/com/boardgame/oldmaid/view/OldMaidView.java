package com.boardgame.oldmaid.view;

import com.boardgame.oldmaid.OldMaidStatus;
import java.util.List;

// 보는 사람마다 다른 화면(스펙 4.7). 남의 손패·덱·끼운 자리·조커 주인은 넣지 않는다.
public record OldMaidView(
        long viewerId,
        OldMaidStatus status,
        long startedAt,
        Long currentPlayerId,
        Long targetId,
        long turnSeq,
        List<Long> participantIds,
        List<OldMaidPlayerView> players,
        List<OldMaidCardView> hand,
        OldMaidPeekView peek,
        boolean canShuffle,
        int discardCount,
        List<List<OldMaidCardView>> recentPairs,
        List<OldMaidDiscardView> discards,
        OldMaidResultView result,
        Long winnerId,
        Long deadline,
        long serverNow,
        List<Long> lastAutoActorIds,
        long autoActSeq,
        List<OldMaidEventView> events) {
}
