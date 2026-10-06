// UnoChallengeView.java
package com.boardgame.uno.view;

// +4 합법 여부는 넣지 않는다(숨은 정보).
public record UnoChallengeView(long byId, long targetId) {
}
