package com.boardgame.uno.view;

import com.boardgame.uno.UnoColor;

// +4 합법 여부는 넣지 않는다(숨은 정보). previousColor는 +4를 내기 직전의 색(모두가 본 공개 정보)으로 도전 판정 기준이다.
public record UnoChallengeView(long byId, long targetId, UnoColor previousColor) {
}
