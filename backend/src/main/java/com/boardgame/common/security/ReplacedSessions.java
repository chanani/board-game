package com.boardgame.common.security;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Set;
import org.springframework.stereotype.Component;

/**
 * 다른 곳에서 새로 로그인해서 끊긴 HTTP 세션 ID를 잠시 기억한다.
 * 30분이 지난 기록은 무시하고 지우며, 최대 1,000개까지만 오래된 순으로 남긴다.
 */
@Component
public class ReplacedSessions {

    private static final Duration RETENTION = Duration.ofMinutes(30);
    private static final int MAX_ENTRIES = 1000;

    private final Clock clock;
    private final LinkedHashMap<String, Instant> replacedAt = new LinkedHashMap<>();

    public ReplacedSessions(Clock clock) {
        this.clock = clock;
    }

    public void record(String sessionId) {
        record(sessionId, clock.instant());
    }

    public synchronized void record(String sessionId, Instant at) {
        replacedAt.remove(sessionId);
        replacedAt.put(sessionId, at);
        prune(at);
    }

    public boolean contains(String sessionId) {
        return contains(sessionId, clock.instant());
    }

    public synchronized boolean contains(String sessionId, Instant now) {
        prune(now);
        Instant at = replacedAt.get(sessionId);
        return at != null && isFresh(at, now);
    }

    private void prune(Instant now) {
        Set<Map.Entry<String, Instant>> entries = replacedAt.entrySet();
        Iterator<Map.Entry<String, Instant>> oldestFirst = entries.iterator();
        while (oldestFirst.hasNext() && shouldDrop(oldestFirst.next(), now)) {
            oldestFirst.remove();
        }
    }

    private boolean shouldDrop(Map.Entry<String, Instant> oldest, Instant now) {
        return replacedAt.size() > MAX_ENTRIES || !isFresh(oldest.getValue(), now);
    }

    private boolean isFresh(Instant at, Instant now) {
        return at.plus(RETENTION).isAfter(now);
    }
}
