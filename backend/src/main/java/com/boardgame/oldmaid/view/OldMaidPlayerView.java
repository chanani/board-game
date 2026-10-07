package com.boardgame.oldmaid.view;

// 자리 순서의 처음 참가자. 조커 여부는 넣지 않는다. rank: 끝냈으면(끝나면 모두) 등수, 아니면 null.
public record OldMaidPlayerView(long playerId, int cardCount, Integer rank, boolean forfeited) {
}
