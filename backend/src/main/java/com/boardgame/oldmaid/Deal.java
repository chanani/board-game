package com.boardgame.oldmaid;

// 나눈 직후: 첫 사람과 손패(짝은 아직 버리지 않았다, R36).
public record Deal(PlayerId first, Hands hands) {

    private static final int MIN_HOLDERS = 2;

    // R7·D18: 모두가 짝을 다 버렸다고 미리 셈해 카드를 가진 사람이 2명 이상이어야 이 나눔으로 시작한다.
    public boolean isPlayable() {
        return hands.holderCountAfterPairs() >= MIN_HOLDERS;
    }
}
