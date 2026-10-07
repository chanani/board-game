package com.boardgame.common.websocket;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.user.UserDestinationMessageHandler;
import org.springframework.messaging.simp.user.UserDestinationResolver;
import org.springframework.messaging.support.AbstractSubscribableChannel;
import org.springframework.web.socket.config.annotation.DelegatingWebSocketMessageBrokerConfiguration;

/**
 * {@code @EnableWebSocketMessageBroker} 대신 쓰는 STOMP 브로커 설정.
 * 다른 WebSocketMessageBrokerConfigurer 빈은 그대로 모아 적용하고,
 * 개인 큐 처리기만 연결마다 메시지를 따로 만드는 처리기로 바꾼다.
 * 브로드캐스트 목적지·단계 같은 기본 설정은 Spring이 만든 처리기에서 그대로 옮겨 온다.
 */
@Configuration(proxyBeanMethods = false)
public class PerSessionBrokerConfiguration extends DelegatingWebSocketMessageBrokerConfiguration {

    @Bean
    @Override
    public UserDestinationMessageHandler userDestinationMessageHandler(
            AbstractSubscribableChannel clientInboundChannel, AbstractSubscribableChannel clientOutboundChannel,
            AbstractSubscribableChannel brokerChannel, UserDestinationResolver userDestinationResolver) {
        UserDestinationMessageHandler defaults = super.userDestinationMessageHandler(
                clientInboundChannel, clientOutboundChannel, brokerChannel, userDestinationResolver);
        UserDestinationMessageHandler handler = new PerSessionUserDestinationMessageHandler(
                clientInboundChannel, brokerChannel, userDestinationResolver);
        handler.setBroadcastDestination(defaults.getBroadcastDestination());
        handler.setPhase(defaults.getPhase());
        return handler;
    }
}
