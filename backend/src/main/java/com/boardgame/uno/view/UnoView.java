package com.boardgame.uno.view;

import com.boardgame.uno.Direction;
import com.boardgame.uno.UnoColor;
import com.boardgame.uno.UnoStage;
import com.boardgame.uno.UnoStatus;
import java.util.List;

// 보는 사람마다 다른 화면(스펙 4.5). 남의 손패·뽑을 더미 순서·남의 drawnCardId·+4 합법 여부는 넣지 않는다.
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
        boolean wildDrawFourRisky,
        Integer drawnCardId,
        boolean canCallUno,
        UnoCatchView unoCatch,
        boolean canCatch,
        UnoChallengeView challenge,
        UnoRevealView reveal,
        UnoResultView result,
        Long winnerId,
        Long deadline,
        long serverNow,
        List<Long> lastAutoActorIds,
        long autoActSeq,
        List<UnoEventView> events) {
}
