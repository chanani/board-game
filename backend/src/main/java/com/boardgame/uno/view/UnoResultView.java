// UnoResultView.java
package com.boardgame.uno.view;

import com.boardgame.uno.UnoEndReason;
import java.util.List;

// players: 이긴 사람을 뺀 남은 참가자(자리 순서). 끝난 뒤에는 모두에게 손패를 공개한다(D27).
public record UnoResultView(UnoEndReason reason, long winnerId, int points, List<UnoResultPlayerView> players) {
}
