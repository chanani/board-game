package com.boardgame.papersafari.view;

import com.boardgame.papersafari.GameStatus;
import java.util.List;

// deadline·serverNow는 epoch ms. lastAutoActorId(들)은 마지막 변화가 시간 초과 자동 행동일 때만 채운다.
public record PaperSafariView(
        long viewerId,
        GameStatus status,
        int roundNumber,
        RoundView round,
        RoundResultView lastRoundResult,
        Long winnerId,
        Long deadline,
        long serverNow,
        Long lastAutoActorId,
        List<Long> lastAutoActorIds) {
}
