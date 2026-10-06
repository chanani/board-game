package com.boardgame.uno;

import java.util.List;

// +4 도전 대기: 낸 사람, 낼 때 합법이었는지(R11), +4를 낸 직후의 손패(R22 공개용).
public record FourCharge(PlayerId by, boolean legal, List<UnoCard> handAfter) {

    public FourCharge {
        handAfter = List.copyOf(handAfter);
    }

    public boolean isBy(PlayerId player) {
        return by.equals(player);
    }
}
