package com.boardgame.uno.view;

import com.boardgame.uno.Direction;
import com.boardgame.uno.UnoColor;
import com.boardgame.uno.UnoStage;
import com.boardgame.uno.UnoStatus;
import java.util.List;

// 보는 사람마다 다른 화면(스펙 4.5). 남의 손패·뽑을 더미 순서·남의 drawnCardId는 넣지 않는다.
public record UnoView(
        long viewerId,
        UnoStatus status,
        long startedAt,
        UnoStage stage,
        Long currentPlayerId,
        Direction direction,
        UnoColor currentColor,
        UnoCardView discardTop,
        int discardCount,
        int drawPileCount,
        List<Long> participantIds,
        List<UnoPlayerView> players,
        List<UnoCardView> hand,
        List<Integer> playableCardIds,
        Integer drawnCardId,
        boolean canCallUno,
        UnoCatchView unoCatch,
        boolean canCatch,
        UnoResultView result,
        Long winnerId,
        Long deadline,
        long serverNow,
        List<Long> lastAutoActorIds,
        long autoActSeq,
        List<UnoEventView> events) {

    // R19: 컴퓨터의 결정 비교용. 서버 시각만 0으로 고정한다.
    UnoView withoutClock() {
        return new UnoView(viewerId, status, startedAt, stage, currentPlayerId, direction, currentColor, discardTop,
                discardCount, drawPileCount, participantIds, players, hand, playableCardIds,
                drawnCardId, canCallUno, unoCatch, canCatch, result, winnerId, deadline, 0L,
                lastAutoActorIds, autoActSeq, events);
    }
}
