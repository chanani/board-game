// B/uno/UnoTiming.java
package com.boardgame.uno;

// 화면에 실을 마감(epoch ms, 끝났으면 null)과 서버 시각(epoch ms).
public record UnoTiming(Long deadline, long serverNow) {
}
