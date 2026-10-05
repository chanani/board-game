package com.boardgame.room.application;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class PresenceTracker {

    private final Map<Long, Integer> connections = new ConcurrentHashMap<>();
    private final Map<Long, Instant> disconnectedAt = new ConcurrentHashMap<>();

    public void connected(long memberId) {
        connections.merge(memberId, 1, Integer::sum);
        disconnectedAt.remove(memberId);
    }

    public void disconnected(long memberId, Instant at) {
        int remaining = connections.merge(memberId, -1, Integer::sum);
        if (remaining > 0) {
            return;
        }
        connections.remove(memberId);
        disconnectedAt.put(memberId, at);
    }

    public boolean isConnected(long memberId) {
        return connections.getOrDefault(memberId, 0) > 0;
    }

    public Duration offlineFor(long memberId, Instant now) {
        Instant since = disconnectedAt.get(memberId);
        if (since == null) {
            return Duration.ZERO;
        }
        return Duration.between(since, now);
    }
}
