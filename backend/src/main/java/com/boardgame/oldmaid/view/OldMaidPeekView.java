package com.boardgame.oldmaid.view;

// index: 뽑는 사람이 고르는 상대 손패 자리(null = 고르지 않음). seq: 바뀔 때마다 오르는 순번(D16).
public record OldMaidPeekView(Integer index, long seq) {
}
