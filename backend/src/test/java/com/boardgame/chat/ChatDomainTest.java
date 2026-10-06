package com.boardgame.chat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.boardgame.chat.domain.ChatAuthor;
import com.boardgame.chat.domain.ChatBody;
import com.boardgame.chat.domain.ChatLog;
import com.boardgame.chat.domain.ChatMessage;
import com.boardgame.chat.domain.ChatRateLimiter;
import com.boardgame.chat.domain.ChatText;
import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class ChatDomainTest {

    @Test
    void 빈_글_공백뿐인_글_201자는_거부한다() {
        assertThatThrownBy(() -> new ChatText("")).isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).errorCode()).isEqualTo(ErrorCode.INVALID_CHAT_MESSAGE);
        assertThatThrownBy(() -> new ChatText("   ")).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> new ChatText(null)).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> new ChatText("a".repeat(201))).isInstanceOf(BusinessException.class);
    }

    @Test
    void 앞뒤_공백을_제거한_200자는_받는다() {
        assertThatCode(() -> new ChatText("a".repeat(200))).doesNotThrowAnyException();
        assertThat(new ChatText("  안녕  ").value()).isEqualTo("안녕");
    }

    @Test
    void 로그는_마지막_100개만_오래된_순으로_보관한다() {
        ChatLog log = new ChatLog();
        for (long id = 1; id <= 101; id++) {
            log.append(new ChatMessage(id, new ChatAuthor(1, "닉"), new ChatBody(new ChatText("m"), Instant.EPOCH)));
        }

        assertThat(log.asList()).hasSize(100);
        assertThat(log.asList().get(0).id()).isEqualTo(2);
        assertThat(log.asList().get(99).id()).isEqualTo(101);
    }

    @Test
    void 일_초_안에_네_번째_메시지는_막고_일_초가_지나면_다시_보낼_수_있다() {
        MutableClock clock = new MutableClock(Instant.parse("2026-01-01T00:00:00Z"));
        ChatRateLimiter limiter = new ChatRateLimiter(clock);
        limiter.require(1);
        limiter.require(1);
        limiter.require(1);

        assertThatThrownBy(() -> limiter.require(1)).isInstanceOf(BusinessException.class)
                .extracting(e -> ((BusinessException) e).errorCode()).isEqualTo(ErrorCode.CHAT_TOO_FAST);
        assertThatCode(() -> limiter.require(2)).doesNotThrowAnyException();
        clock.advance(Duration.ofSeconds(1));
        assertThatCode(() -> limiter.require(1)).doesNotThrowAnyException();
    }
}
