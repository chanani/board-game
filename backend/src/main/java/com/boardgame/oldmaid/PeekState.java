package com.boardgame.oldmaid;

import java.time.Duration;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;

// R17~R21: 뽑는 사람이 지금 고르고 있는 자리(null = 고르지 않음)와 바뀔 때마다 오르는 순번.
public class PeekState {

    static final Duration MIN_GAP = Duration.ofMillis(50);

    private SlotIndex slot;
    private long seq;
    private Instant lastAt = Instant.EPOCH;

    // R19: 같은 자리이거나 마지막으로 받아 준 신호에서 50ms가 안 지났으면 버린다.
    boolean move(SlotIndex next, Instant now) {
        if (Objects.equals(slot, next) || now.isBefore(lastAt.plus(MIN_GAP))) {
            return false;
        }
        slot = next;
        seq++;
        lastAt = now;
        return true;
    }

    // R21: 고르던 자리가 있을 때만 지우고 순번을 올린다.
    void clear() {
        if (slot == null) {
            return;
        }
        slot = null;
        seq++;
    }

    Optional<SlotIndex> slot() {
        return Optional.ofNullable(slot);
    }

    long seq() {
        return seq;
    }
}
