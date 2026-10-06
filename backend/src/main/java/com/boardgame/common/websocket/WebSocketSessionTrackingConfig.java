package com.boardgame.common.websocket;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.config.annotation.WebSocketTransportRegistration;

/** STOMP 연결을 HTTP 세션 ID별로 기억하도록 WebSocket 핸들러를 장식한다. */
@Configuration
public class WebSocketSessionTrackingConfig implements WebSocketMessageBrokerConfigurer {

    private final WebSocketSessions webSocketSessions;

    public WebSocketSessionTrackingConfig(WebSocketSessions webSocketSessions) {
        this.webSocketSessions = webSocketSessions;
    }

    @Override
    public void configureWebSocketTransport(WebSocketTransportRegistration registration) {
        registration.addDecoratorFactory(webSocketSessions);
    }
}
