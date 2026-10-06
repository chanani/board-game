package com.boardgame.chat.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HashMap;
import java.util.Map;

// 한 사람이 1초 안에 3통까지만 보낼 수 있다.
public class ChatRateLimiter {

    private static final int MAX_MESSAGES = 3;
    private static final Duration WINDOW = Duration.ofSeconds(1);

    private final Clock clock;
    private final Map<Long, Deque<Instant>> sentAt = new HashMap<>();

    public ChatRateLimiter(Clock clock) {
        this.clock = clock;
    }

    public synchronized void require(long memberId) {
        Instant now = clock.instant();
        sentAt.values().removeIf(times -> isStale(times, now));
        Deque<Instant> times = sentAt.computeIfAbsent(memberId, id -> new ArrayDeque<>());
        times.removeIf(time -> !time.isAfter(now.minus(WINDOW)));
        if (times.size() >= MAX_MESSAGES) {
            throw new BusinessException(ErrorCode.CHAT_TOO_FAST);
        }
        times.addLast(now);
    }

    private boolean isStale(Deque<Instant> times, Instant now) {
        return times.stream().noneMatch(time -> time.isAfter(now.minus(WINDOW)));
    }
}
