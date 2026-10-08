package com.boardgame.papersafari.view;

import com.boardgame.papersafari.GameStatus;
import java.util.List;

// deadline·serverNow는 epoch ms. lastAutoActorId(들)은 마지막 변화가 시간 초과 자동 행동일 때만 채운다.
// autoActSeq는 자동 행동마다 1씩 오르므로, 클라이언트는 값이 바뀌었을 때만 "시간이 지나 …" 기록을 남긴다.
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
        List<Long> lastAutoActorIds,
        long autoActSeq) {

    // R19: 컴퓨터의 결정 비교용. 서버 시각만 0으로 고정한다.
    PaperSafariView withoutClock() {
        return new PaperSafariView(viewerId, status, roundNumber, round, lastRoundResult, winnerId, deadline, 0L, lastAutoActorId,
                lastAutoActorIds, autoActSeq);
    }
}
