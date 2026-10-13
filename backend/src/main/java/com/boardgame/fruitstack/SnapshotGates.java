package com.boardgame.fruitstack;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.OptionalLong;

// R24: 사람마다 하나씩인 판 신호 문.
public class SnapshotGates {

    private final Map<PlayerId, SnapshotGate> gates = new HashMap<>();

    OptionalLong tryPass(PlayerId player, Instant now) {
        SnapshotGate gate = gates.computeIfAbsent(player, ignored -> new SnapshotGate());
        return gate.tryPass(now);
    }
}
