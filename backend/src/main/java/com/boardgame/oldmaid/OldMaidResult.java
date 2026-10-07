package com.boardgame.oldmaid;

// R16·R29·R30: 끝난 이유와 최종 등수.
public record OldMaidResult(OldMaidEndReason reason, Ranking ranking) {
}
