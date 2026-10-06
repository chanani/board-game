package com.boardgame.uno;

// 덱을 만들 때 매기는 0~107 번호(R2). 같은 그림 두 장도 이 번호로 구분한다.
public record CardId(int value) {
}
