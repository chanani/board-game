package com.boardgame.oldmaid.view;

// /user/queue/signal로 방의 모두에게 가는 신호(스펙 4.3). index = null이면 "고르지 않음".
public record OldMaidPeekSignal(String gameType, String type, long startedAt, long turnSeq, long drawerId,
                                long targetId, Integer index, long seq) {

    public static OldMaidPeekSignal of(long startedAt, long turnSeq, long drawerId, long targetId, Integer index,
                                       long seq) {
        return new OldMaidPeekSignal(OldMaidSessionView.GAME_TYPE, "PEEK", startedAt, turnSeq, drawerId, targetId,
                index, seq);
    }
}
