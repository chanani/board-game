package com.boardgame.oldmaid.view;

import com.boardgame.oldmaid.OldMaidStage;
import com.boardgame.oldmaid.OldMaidStatus;
import java.util.List;

// 보는 사람마다 다른 화면(스펙 4.7). 남의 손패·덱·끼운 자리·조커 주인은 넣지 않는다.
// stage: 게임 중 단계(끝나면 null). 처음 버리기 단계에는 currentPlayerId·targetId·peek이 null이고 turnSeq = 0.
// canDiscard: 보는 사람이 지금 짝을 골라 버릴 수 있는지(자기 화면에만 의미, 남의 손 정보는 아니다).
public record OldMaidView(
        long viewerId,
        OldMaidStatus status,
        OldMaidStage stage,
        long startedAt,
        Long currentPlayerId,
        Long targetId,
        long turnSeq,
        List<Long> participantIds,
        List<OldMaidPlayerView> players,
        List<OldMaidCardView> hand,
        OldMaidPeekView peek,
        boolean canShuffle,
        boolean canDiscard,
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
