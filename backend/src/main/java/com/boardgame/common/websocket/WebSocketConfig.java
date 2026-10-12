package com.boardgame.common.websocket;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.web.socket.server.support.HttpSessionHandshakeInterceptor;

@Configuration
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    // Spring이 STOMP 브로커용으로 이미 만들어 두는 예약기. 턴 타이머·컴퓨터 예약기와 이름이 겹치지 않고 따로 돈다.
    static final String HEARTBEAT_SCHEDULER = "messageBrokerTaskScheduler";
    // 서버가 보내는 간격, 클라이언트에게 바라는 간격(ms). 클라이언트(Realtime.ts)도 같은 값을 쓴다.
    // 브로커는 이 간격마다 "그동안 아무것도 안 보냈으면" 하트비트를 보내므로 실제 공백은 최대 두 배(5초)다.
    // 클라이언트는 7.5초(3배) 넘게 조용하면 끊긴 것으로 보고 다시 연결하고, 서버도 7.5초 넘게 조용한 연결을 닫는다.
    static final long[] HEARTBEAT = {2500, 2500};

    private final String[] allowedOriginPatterns;
    private final InboundDestinationGuard destinationGuard;
    private final RoomTopicGuard roomTopicGuard;
    private final TaskScheduler heartbeatScheduler;

    // 예약기 빈은 이 설정을 모아 쓰는 브로커 설정 안에 있어, 바로 받으면 서로를 기다린다. 처음 쓸 때 받는다(@Lazy).
    public WebSocketConfig(@Value("${app.websocket.allowed-origin-patterns}") String[] allowedOriginPatterns,
                           InboundDestinationGuard destinationGuard, RoomTopicGuard roomTopicGuard,
                           @Lazy @Qualifier(HEARTBEAT_SCHEDULER) TaskScheduler heartbeatScheduler) {
        this.allowedOriginPatterns = allowedOriginPatterns;
        this.destinationGuard = destinationGuard;
        this.roomTopicGuard = roomTopicGuard;
        this.heartbeatScheduler = heartbeatScheduler;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOriginPatterns)
                .addInterceptors(new HttpSessionHandshakeInterceptor());
        registry.setPreserveReceiveOrder(true);
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // 하트비트가 없으면 멈춘 연결(모바일 전파 끊김 등)을 양쪽 모두 알아채지 못한다.
        registry.enableSimpleBroker("/topic", "/queue")
                .setTaskScheduler(heartbeatScheduler)
                .setHeartbeatValue(HEARTBEAT);
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
        // 한 사람에게 잇달아 보낸 화면이 보낸 순서대로 닿게 한다(늦게 나간 옛 화면이 새 화면을 덮지 않게).
        registry.setPreservePublishOrder(true);
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(destinationGuard, roomTopicGuard);
    }
}
