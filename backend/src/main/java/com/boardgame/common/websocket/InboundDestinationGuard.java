package com.boardgame.common.websocket;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.stereotype.Component;

@Component
public class InboundDestinationGuard implements ChannelInterceptor {

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        String destination = accessor.getDestination();
        if (isForbidden(accessor.getCommand(), destination)) {
            throw new MessageDeliveryException("허용되지 않는 목적지입니다: " + destination);
        }
        return message;
    }

    private boolean isForbidden(StompCommand command, String destination) {
        if (destination == null) {
            return false;
        }
        if (StompCommand.SEND.equals(command)) {
            return destination.startsWith("/topic/") || destination.startsWith("/queue/");
        }
        return StompCommand.SUBSCRIBE.equals(command) && destination.startsWith("/queue/");
    }
}
