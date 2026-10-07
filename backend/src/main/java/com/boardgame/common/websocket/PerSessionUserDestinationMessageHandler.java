package com.boardgame.common.websocket;

import java.util.Set;
import org.springframework.messaging.Message;
import org.springframework.messaging.SubscribableChannel;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.user.UserDestinationMessageHandler;
import org.springframework.messaging.simp.user.UserDestinationResolver;
import org.springframework.messaging.simp.user.UserDestinationResult;
import org.springframework.messaging.support.MessageBuilder;

/**
 * 한 회원의 연결이 여럿이면 개인 큐 메시지를 연결마다 따로 만들어 넘긴다.
 *
 * <p>수신 순서 보장(setPreserveReceiveOrder)을 켜면 Spring의 UserDestinationMessageHandler는
 * 연결별 순서 채널로 같은 메시지 객체를 차례로 보낸다. 첫 연결로 보내는 순간 헤더가 잠기므로
 * 두 번째 연결부터는 "Expected mutable SimpMessageHeaderAccessor"로 전송이 버려진다.
 * 세션 ID를 박은 복사본을 연결마다 넘기면 매번 대상이 하나뿐이라 헤더가 잠길 일이 없다.
 */
class PerSessionUserDestinationMessageHandler extends UserDestinationMessageHandler {

    private static final int SINGLE_SESSION = 1;

    PerSessionUserDestinationMessageHandler(SubscribableChannel clientInboundChannel,
                                            SubscribableChannel brokerChannel,
                                            UserDestinationResolver destinationResolver) {
        super(clientInboundChannel, brokerChannel, destinationResolver);
    }

    @Override
    public void handleMessage(Message<?> message) {
        Set<String> sessionIds = targetSessionIds(message);
        if (sessionIds.size() <= SINGLE_SESSION) {
            super.handleMessage(message);
            return;
        }
        sessionIds.forEach(sessionId -> super.handleMessage(forSession(message, sessionId)));
    }

    private Set<String> targetSessionIds(Message<?> message) {
        UserDestinationResolver resolver = getUserDestinationResolver();
        UserDestinationResult result = resolver.resolveDestination(message);
        if (result == null) {
            return Set.of();
        }
        return result.getSessionIds();
    }

    private static Message<?> forSession(Message<?> message, String sessionId) {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.wrap(message);
        accessor.setSessionId(sessionId);
        return MessageBuilder.createMessage(message.getPayload(), accessor.getMessageHeaders());
    }
}
