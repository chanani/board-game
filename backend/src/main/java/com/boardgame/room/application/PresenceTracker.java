package com.boardgame.room.application;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

@Component
public class PresenceTracker {

    private final Map<Long, Set<String>> sessions = new HashMap<>();
    private final Map<Long, Instant> disconnectedAt = new HashMap<>();

    public synchronized void connected(long memberId, String sessionId) {
        sessions.computeIfAbsent(memberId, id -> new HashSet<>()).add(sessionId);
        disconnectedAt.remove(memberId);
    }

    public synchronized void disconnected(long memberId, String sessionId, Instant at) {
        Set<String> open = sessions.get(memberId);
        if (open == null || !open.remove(sessionId)) {
            return;
        }
        if (!open.isEmpty()) {
            return;
        }
        sessions.remove(memberId);
        disconnectedAt.put(memberId, at);
    }

    public synchronized boolean isConnected(long memberId) {
        return sessions.containsKey(memberId);
    }

    public synchronized Duration offlineFor(long memberId, Instant now) {
        Instant since = disconnectedAt.get(memberId);
        if (since == null) {
            return Duration.ZERO;
        }
        return Duration.between(since, now);
    }

    public synchronized boolean isOfflineAtLeast(long memberId, Instant now, Duration grace) {
        return !isConnected(memberId) && offlineFor(memberId, now).compareTo(grace) >= 0;
    }
}
