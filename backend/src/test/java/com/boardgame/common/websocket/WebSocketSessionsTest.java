package com.boardgame.common.websocket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.server.support.HttpSessionHandshakeInterceptor;

class WebSocketSessionsTest {

    private final WebSocketSessions webSocketSessions = new WebSocketSessions();

    @Test
    void 그_HTTP_세션의_연결만_4001로_닫는다() throws Exception {
        WebSocketSession first = mock(WebSocketSession.class);
        WebSocketSession second = mock(WebSocketSession.class);
        WebSocketSession other = mock(WebSocketSession.class);
        webSocketSessions.register("A", first);
        webSocketSessions.register("A", second);
        webSocketSessions.register("B", other);

        webSocketSessions.closeAll("A");

        ArgumentCaptor<CloseStatus> status = ArgumentCaptor.forClass(CloseStatus.class);
        verify(first).close(status.capture());
        verify(second).close(any(CloseStatus.class));
        verify(other, never()).close(any(CloseStatus.class));
        assertThat(status.getValue().getCode()).isEqualTo(4001);
        assertThat(status.getValue().getReason()).isEqualTo("SESSION_REPLACED");
    }

    @Test
    void 닫힌_연결은_다시_닫지_않는다() throws Exception {
        WebSocketSession session = mock(WebSocketSession.class);
        webSocketSessions.register("A", session);

        webSocketSessions.unregister(session);
        webSocketSessions.closeAll("A");

        verify(session, never()).close(any(CloseStatus.class));
    }

    @Test
    void 닫다가_오류가_나도_나머지를_닫는다() throws Exception {
        WebSocketSession broken = mock(WebSocketSession.class);
        WebSocketSession healthy = mock(WebSocketSession.class);
        doThrow(new IOException("boom")).when(broken).close(any(CloseStatus.class));
        webSocketSessions.register("A", broken);
        webSocketSessions.register("A", healthy);

        webSocketSessions.closeAll("A");

        verify(healthy).close(any(CloseStatus.class));
    }

    @Test
    void 장식한_핸들러는_연결될_때_등록하고_끊기면_지운다() throws Exception {
        WebSocketHandler delegate = mock(WebSocketHandler.class);
        WebSocketHandler handler = webSocketSessions.decorate(delegate);
        WebSocketSession session = mock(WebSocketSession.class);
        Map<String, Object> attributes = new HashMap<>();
        attributes.put(HttpSessionHandshakeInterceptor.HTTP_SESSION_ID_ATTR_NAME, "A");
        when(session.getAttributes()).thenReturn(attributes);

        handler.afterConnectionEstablished(session);
        handler.afterConnectionClosed(session, CloseStatus.NORMAL);
        webSocketSessions.closeAll("A");

        verify(delegate).afterConnectionEstablished(session);
        verify(delegate).afterConnectionClosed(session, CloseStatus.NORMAL);
        verify(session, never()).close(any(CloseStatus.class));
    }

    @Test
    void 장식한_핸들러로_연결된_세션을_닫는다() throws Exception {
        WebSocketHandler handler = webSocketSessions.decorate(mock(WebSocketHandler.class));
        WebSocketSession session = mock(WebSocketSession.class);
        Map<String, Object> attributes = new HashMap<>();
        attributes.put(HttpSessionHandshakeInterceptor.HTTP_SESSION_ID_ATTR_NAME, "A");
        when(session.getAttributes()).thenReturn(attributes);

        handler.afterConnectionEstablished(session);
        webSocketSessions.closeAll("A");

        verify(session).close(any(CloseStatus.class));
    }
}
