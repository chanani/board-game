package com.boardgame.uno;

import java.util.Optional;

// R11: +4 합법 판정의 기준. 고른 색이 아니라 +4를 내기 직전의 색(previousColor)을 낸 사람이 갖고 있었는지로 정한다.
// 직전 색은 모두가 본 공개 정보라 화면과 기록에 실어 판정 이유를 보여 준다.
public record FourBasis(UnoColor previousColor, boolean legal) {

    private static final FourBasis NO_COLOR = new FourBasis(null, true);

    public static FourBasis noColor() {
        return NO_COLOR;
    }

    public Optional<UnoColor> previous() {
        return Optional.ofNullable(previousColor);
    }
}
