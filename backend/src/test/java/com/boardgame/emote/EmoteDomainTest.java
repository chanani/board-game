package com.boardgame.emote;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.emote.domain.Emote;
import com.boardgame.emote.domain.EmoteRateLimiter;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class EmoteDomainTest {

    @Test
    void 표정은_정확히_10가지이고_이름으로_찾는다() {
        assertThat(Emote.values()).hasSize(10);
        assertThat(Emote.from("HEART_EYES")).isEqualTo(Emote.HEART_EYES);
    }

    @Test
    void 없는_표정_소문자_null은_INVALID_EMOTE다() {
        assertThatThrownBy(() -> Emote.from("DANCE")).isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).errorCode()).isEqualTo(ErrorCode.INVALID_EMOTE);
        assertThatThrownBy(() -> Emote.from("smile")).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> Emote.from(null)).isInstanceOf(BusinessException.class);
    }

    @Test
    void 보낸_뒤_잠깐은_같은_사람의_다음_표현을_막고_다른_사람은_막지_않는다() {
        MutableClock clock = new MutableClock(Instant.parse("2026-01-01T00:00:00Z"));
        EmoteRateLimiter limiter = new EmoteRateLimiter(clock);
        limiter.require(1);

        clock.advance(EmoteRateLimiter.COOLDOWN.minusMillis(1));
        assertThatThrownBy(() -> limiter.require(1)).isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).errorCode()).isEqualTo(ErrorCode.EMOTE_TOO_FAST);
        assertThatCode(() -> limiter.require(2)).doesNotThrowAnyException();

        clock.advance(Duration.ofMillis(1));
        assertThatCode(() -> limiter.require(1)).doesNotThrowAnyException();
    }

    @Test
    void 막힌_시도는_잠금_시간을_늘리지_않는다() {
        MutableClock clock = new MutableClock(Instant.parse("2026-01-01T00:00:00Z"));
        EmoteRateLimiter limiter = new EmoteRateLimiter(clock);
        limiter.require(1);
        clock.advance(Duration.ofMillis(500));
        assertThatThrownBy(() -> limiter.require(1)).isInstanceOf(BusinessException.class);

        clock.advance(EmoteRateLimiter.COOLDOWN.minusMillis(500));

        assertThatCode(() -> limiter.require(1)).doesNotThrowAnyException();
    }
}
