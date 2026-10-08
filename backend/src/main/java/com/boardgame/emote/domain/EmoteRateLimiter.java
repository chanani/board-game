package com.boardgame.emote.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

// 감정 표현을 잇달아 누르지 못하게, 보낸 뒤 잠깐(COOLDOWN)은 같은 사람의 다음 표현을 막는다.
// 화면도 1초 동안 표정 버튼을 잠그므로, 네트워크 지연으로 조금 일찍 도착해도 막히지 않게 1초보다 살짝 짧게 둔다.
public class EmoteRateLimiter {

    public static final Duration COOLDOWN = Duration.ofMillis(900);

    private final Clock clock;
    private final Map<Long, Instant> lastSentAt = new HashMap<>();

    public EmoteRateLimiter(Clock clock) {
        this.clock = clock;
    }

    public synchronized void require(long memberId) {
        Instant now = clock.instant();
        lastSentAt.values().removeIf(sentAt -> !isCoolingDown(sentAt, now));
        if (lastSentAt.containsKey(memberId)) {
            throw new BusinessException(ErrorCode.EMOTE_TOO_FAST);
        }
        lastSentAt.put(memberId, now);
    }

    private boolean isCoolingDown(Instant sentAt, Instant now) {
        return sentAt.plus(COOLDOWN).isAfter(now);
    }
}
