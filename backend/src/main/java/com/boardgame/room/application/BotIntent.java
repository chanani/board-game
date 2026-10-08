package com.boardgame.room.application;

import com.boardgame.game.PendingKind;

// 컴퓨터 한 명이 지금 정해 둔 결정: 예약 번호(epoch), 결정 종류, 그때 본 자기 자리 화면.
record BotIntent(long epoch, PendingKind kind, Object view) {

    // 결정이 그대로인가: 종류가 같고, 동시 단계(자기 카드만 정한다)이거나 자기 화면이 그대로다.
    boolean stillHolds(PendingKind currentKind, Object currentView) {
        if (kind != currentKind) {
            return false;
        }
        return kind == PendingKind.TOGETHER || view.equals(currentView);
    }
}
