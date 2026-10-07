package com.boardgame.uno;

import java.util.List;
import java.util.Optional;

// +4 도전 대기: 낸 사람, 판정 기준(직전 색과 합법 여부, R11), +4를 낸 직후의 손패(R22 공개용).
public record FourCharge(PlayerId by, FourBasis basis, List<UnoCard> handAfter) {

    public FourCharge {
        handAfter = List.copyOf(handAfter);
    }

    public boolean legal() {
        return basis.legal();
    }

    public Optional<UnoColor> previousColor() {
        return basis.previous();
    }

    public boolean isBy(PlayerId player) {
        return by.equals(player);
    }
}
