// B/uno/UnoMatch.java
package com.boardgame.uno;

import java.time.Instant;
import java.util.List;

// 처음 참가자(자리 순서, 기권자 포함)와 시작 시각.
public record UnoMatch(List<PlayerId> participants, Instant startedAt) {

    public UnoMatch {
        participants = List.copyOf(participants);
    }

    public List<Long> participantIds() {
        return participants.stream()
                .map(PlayerId::value)
                .toList();
    }

    public long startedAtMillis() {
        return startedAt.toEpochMilli();
    }
}
