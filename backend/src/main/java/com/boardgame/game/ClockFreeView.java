package com.boardgame.game;

// R19: 컴퓨터의 결정이 그대로인지 비교할 때 쓰는 화면. 서버 시각(serverNow)처럼 상태와 무관하게 흐르는 값을 뺀다.
// 마감(deadline)은 상태가 바뀔 때만 바뀌므로 그대로 둔다.
public interface ClockFreeView {

    /** 서버 시각을 0으로 고정한 같은 화면. */
    Object withoutClock();

    /** 화면이 ClockFreeView면 시각을 뺀 화면, 아니면 그대로. */
    static Object of(Object view) {
        if (view instanceof ClockFreeView clockFree) {
            return clockFree.withoutClock();
        }
        return view;
    }
}
