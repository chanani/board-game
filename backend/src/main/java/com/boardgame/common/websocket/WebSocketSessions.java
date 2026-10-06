package com.boardgame.common.websocket;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.WebSocketHandlerDecoratorFactory;

/** 열린 WebSocket 연결을 HTTP 세션 ID별로 기억했다가, 세션이 교체되면 한꺼번에 닫는다. */
@Component
public class WebSocketSessions implements WebSocketHandlerDecoratorFactory {

    private static final CloseStatus SESSION_REPLACED = new CloseStatus(4001, "SESSION_REPLACED");

    private final Map<String, Set<WebSocketSession>> sessionsByHttpSession = new ConcurrentHashMap<>();

    @Override
    public WebSocketHandler decorate(WebSocketHandler handler) {
        return new TrackedWebSocketHandler(handler, this);
    }

    public void register(String httpSessionId, WebSocketSession session) {
        sessionsByHttpSession.compute(httpSessionId, (id, sessions) -> withSession(sessions, session));
    }

    public void unregister(WebSocketSession session) {
        sessionsByHttpSession.forEach((httpSessionId, ignored) -> sessionsByHttpSession.computeIfPresent(
                httpSessionId, (id, sessions) -> withoutSession(sessions, session)));
    }

    public void closeAll(String httpSessionId) {
        Set<WebSocketSession> sessions = sessionsByHttpSession.remove(httpSessionId);
        if (sessions == null) {
            return;
        }
        sessions.forEach(this::closeQuietly);
    }

    private Set<WebSocketSession> withSession(Set<WebSocketSession> sessions, WebSocketSession session) {
        Set<WebSocketSession> target = sessions;
        if (target == null) {
            target = ConcurrentHashMap.newKeySet();
        }
        target.add(session);
        return target;
    }

    private Set<WebSocketSession> withoutSession(Set<WebSocketSession> sessions, WebSocketSession session) {
        sessions.remove(session);
        if (sessions.isEmpty()) {
            return null;
        }
        return sessions;
    }

    private void closeQuietly(WebSocketSession session) {
        try {
            session.close(SESSION_REPLACED);
        } catch (IOException alreadyBroken) {
            // 이미 끊긴 연결이면 닫을 것이 없다
        }
    }
}
