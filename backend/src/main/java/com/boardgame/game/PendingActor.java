package com.boardgame.game;

// R18: 지금 행동할 수 있는 참가자와 그 결정의 종류.
public record PendingActor(long memberId, PendingKind kind) {

    public static PendingActor turn(long memberId) {
        return new PendingActor(memberId, PendingKind.TURN);
    }

    public static PendingActor together(long memberId) {
        return new PendingActor(memberId, PendingKind.TOGETHER);
    }

    public static PendingActor reaction(long memberId) {
        return new PendingActor(memberId, PendingKind.REACTION);
    }
}
