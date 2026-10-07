package com.boardgame.oldmaid.view;

// 자리 순서의 처음 참가자. 조커 여부는 넣지 않는다. rank: 끝냈으면(끝나면 모두) 등수, 아니면 null.
// openingDone: 처음 버리기 단계에서 손에 짝이 남지 않았는지("다 버림", D19). 다른 단계에서는 늘 true.
public record OldMaidPlayerView(long playerId, int cardCount, Integer rank, boolean forfeited, boolean openingDone) {
}
