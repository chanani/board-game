package com.boardgame.common.websocket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageDeliveryException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;

class InboundDestinationGuardTest {

    private final InboundDestinationGuard guard = new InboundDestinationGuard();

    private Message<?> message(StompCommand command, String destination) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setDestination(destination);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    @Test
    void 클라이언트가_topic으로_직접_SEND하면_거부한다() {
        assertThatThrownBy(() -> guard.preSend(message(StompCommand.SEND, "/topic/rooms/ABCDEF"), null))
                .isInstanceOf(MessageDeliveryException.class);
    }

    @Test
    void 클라이언트가_queue로_직접_SEND하면_거부한다() {
        assertThatThrownBy(() -> guard.preSend(message(StompCommand.SEND, "/queue/game"), null))
                .isInstanceOf(MessageDeliveryException.class);
    }

    @Test
    void 다른_사용자의_queue를_직접_구독하면_거부한다() {
        assertThatThrownBy(() -> guard.preSend(message(StompCommand.SUBSCRIBE, "/queue/game-user123"), null))
                .isInstanceOf(MessageDeliveryException.class);
    }

    @Test
    void 애플리케이션_목적지로의_SEND는_허용한다() {
        Message<?> message = message(StompCommand.SEND, "/app/rooms/ABCDEF/actions");

        assertThat(guard.preSend(message, null)).isSameAs(message);
    }

    @Test
    void user_queue와_topic_구독은_허용한다() {
        Message<?> mine = message(StompCommand.SUBSCRIBE, "/user/queue/game");
        Message<?> room = message(StompCommand.SUBSCRIBE, "/topic/rooms/ABCDEF");

        assertThat(guard.preSend(mine, null)).isSameAs(mine);
        assertThat(guard.preSend(room, null)).isSameAs(room);
    }
}
