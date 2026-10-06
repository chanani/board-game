package com.boardgame.common.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.boardgame.common.websocket.WebSocketSessions;
import com.boardgame.support.MutableClock;
import java.time.Instant;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;

class ActiveSessionsTest {

    private final ReplacedSessions replacedSessions =
            new ReplacedSessions(new MutableClock(Instant.parse("2026-10-06T00:00:00Z")));
    private final WebSocketSessions webSocketSessions = mock(WebSocketSessions.class);
    private final ActiveSessions activeSessions = new ActiveSessions(replacedSessions, webSocketSessions);

    @Test
    void 같은_회원의_새_세션이_오면_이전_세션을_끊는다() {
        MockHttpSession first = new MockHttpSession();
        MockHttpSession second = new MockHttpSession();
        activeSessions.replace(1L, first);

        activeSessions.replace(1L, second);

        assertThat(first.isInvalid()).isTrue();
        assertThat(second.isInvalid()).isFalse();
        assertThat(replacedSessions.contains(first.getId())).isTrue();
        assertThat(replacedSessions.contains(second.getId())).isFalse();
        verify(webSocketSessions).closeAll(first.getId());
    }

    @Test
    void WebSocket을_세션_무효화보다_먼저_닫는다() {
        MockHttpSession first = new MockHttpSession();
        AtomicBoolean invalidWhenClosing = new AtomicBoolean(true);
        doAnswer(invocation -> {
            invalidWhenClosing.set(first.isInvalid());
            return null;
        }).when(webSocketSessions).closeAll(first.getId());
        activeSessions.replace(1L, first);

        activeSessions.replace(1L, new MockHttpSession());

        assertThat(invalidWhenClosing.get()).isFalse();
    }

    @Test
    void 같은_세션으로_다시_로그인하면_아무것도_끊지_않는다() {
        MockHttpSession session = new MockHttpSession();
        activeSessions.replace(1L, session);

        activeSessions.replace(1L, session);

        assertThat(session.isInvalid()).isFalse();
        verify(webSocketSessions, never()).closeAll(anyString());
    }

    @Test
    void 다른_회원의_세션은_건드리지_않는다() {
        MockHttpSession alice = new MockHttpSession();
        activeSessions.replace(1L, alice);

        activeSessions.replace(2L, new MockHttpSession());

        assertThat(alice.isInvalid()).isFalse();
    }

    @Test
    void 이미_만료된_이전_세션이어도_새_로그인은_성공한다() {
        MockHttpSession first = new MockHttpSession();
        activeSessions.replace(1L, first);
        first.invalidate();

        activeSessions.replace(1L, new MockHttpSession());

        verify(webSocketSessions).closeAll(first.getId());
    }

    @Test
    void 현재_세션을_잊으면_다음_로그인이_그_세션을_끊지_않는다() {
        MockHttpSession first = new MockHttpSession();
        activeSessions.replace(1L, first);

        activeSessions.forget(first);
        activeSessions.replace(1L, new MockHttpSession());

        assertThat(first.isInvalid()).isFalse();
        assertThat(replacedSessions.contains(first.getId())).isFalse();
    }

    @Test
    void 지난_세션을_잊어도_새_세션은_그대로_기억한다() {
        MockHttpSession first = new MockHttpSession();
        MockHttpSession second = new MockHttpSession();
        activeSessions.replace(1L, first);
        activeSessions.replace(1L, second);

        activeSessions.forget(first);
        activeSessions.replace(1L, new MockHttpSession());

        assertThat(second.isInvalid()).isTrue();
    }

    @Test
    void 세션이_없으면_잊을_것도_없다() {
        activeSessions.forget(null);
    }
}
