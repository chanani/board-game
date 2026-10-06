package com.boardgame.common.websocket;

import java.util.Map;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketHandler;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.WebSocketHandlerDecorator;
import org.springframework.web.socket.server.support.HttpSessionHandshakeInterceptor;

/** 연결이 열리면 핸드셰이크 때의 HTTP 세션 ID로 등록하고, 닫히면 지운다. */
class TrackedWebSocketHandler extends WebSocketHandlerDecorator {

    private final WebSocketSessions webSocketSessions;

    TrackedWebSocketHandler(WebSocketHandler delegate, WebSocketSessions webSocketSessions) {
        super(delegate);
        this.webSocketSessions = webSocketSessions;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        registerByHttpSession(session);
        super.afterConnectionEstablished(session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus closeStatus) throws Exception {
        webSocketSessions.unregister(session);
        super.afterConnectionClosed(session, closeStatus);
    }

    private void registerByHttpSession(WebSocketSession session) {
        Map<String, Object> attributes = session.getAttributes();
        Object httpSessionId = attributes.get(HttpSessionHandshakeInterceptor.HTTP_SESSION_ID_ATTR_NAME);
        if (httpSessionId == null) {
            return;
        }
        webSocketSessions.register(httpSessionId.toString(), session);
    }
}
