package com.boardgame.oldmaid;

import java.time.Instant;
import java.util.List;

// 처음 참가자(자리 순서, 기권자 포함)와 시작 시각.
public record OldMaidMatch(List<PlayerId> participants, Instant startedAt) {

    public OldMaidMatch {
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
