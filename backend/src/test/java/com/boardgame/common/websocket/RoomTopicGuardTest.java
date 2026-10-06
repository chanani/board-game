package com.boardgame.common.websocket;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.boardgame.common.security.LoginMember;
import com.boardgame.room.application.RoomService;
import java.security.Principal;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;

class RoomTopicGuardTest {

    private final RoomService roomService = mock(RoomService.class);
    private final RoomTopicGuard guard = new RoomTopicGuard(provider());

    @SuppressWarnings("unchecked")
    private ObjectProvider<RoomService> provider() {
        ObjectProvider<RoomService> provider = mock(ObjectProvider.class);
        when(provider.getObject()).thenReturn(roomService);
        return provider;
    }

    private Message<?> message(StompCommand command, String destination, Principal user) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setDestination(destination);
        accessor.setUser(user);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    @Test
    void 방의_참가자나_관전자는_방_토픽을_구독할_수_있다() {
        when(roomService.isOccupant("ABCDEF", 7L)).thenReturn(true);
        Message<?> message = message(StompCommand.SUBSCRIBE, "/topic/rooms/ABCDEF", new LoginMember(7L, "칠"));

        assertThat(guard.preSend(message, null)).isSameAs(message);
    }

    @Test
    void 방에_없는_사람의_방_토픽_구독은_연결을_끊지_않고_조용히_버린다() {
        when(roomService.isOccupant("ABCDEF", 8L)).thenReturn(false);
        Message<?> message = message(StompCommand.SUBSCRIBE, "/topic/rooms/ABCDEF", new LoginMember(8L, "팔"));

        assertThat(guard.preSend(message, null)).isNull();
    }

    @Test
    void 와일드카드나_다른_topic_구독은_거부한다() {
        LoginMember user = new LoginMember(7L, "칠");
        when(roomService.isOccupant(anyString(), anyLong())).thenReturn(true);

        assertThat(guard.preSend(message(StompCommand.SUBSCRIBE, "/topic/rooms/*", user), null)).isNull();
        assertThat(guard.preSend(message(StompCommand.SUBSCRIBE, "/topic/rooms/**", user), null)).isNull();
        assertThat(guard.preSend(message(StompCommand.SUBSCRIBE, "/topic/**", user), null)).isNull();
        assertThat(guard.preSend(message(StompCommand.SUBSCRIBE, "/topic/rooms/ABCDEF/x", user), null)).isNull();
    }

    @Test
    void 로그인_정보가_없으면_방_토픽_구독을_거부한다() {
        Message<?> message = message(StompCommand.SUBSCRIBE, "/topic/rooms/ABCDEF", null);

        assertThat(guard.preSend(message, null)).isNull();
        verify(roomService, never()).isOccupant(anyString(), anyLong());
    }

    @Test
    void 개인_큐_구독과_SEND는_검사하지_않는다() {
        LoginMember user = new LoginMember(7L, "칠");
        Message<?> queue = message(StompCommand.SUBSCRIBE, "/user/queue/game", user);
        Message<?> send = message(StompCommand.SEND, "/app/rooms/ABCDEF/sync", user);

        assertThat(guard.preSend(queue, null)).isSameAs(queue);
        assertThat(guard.preSend(send, null)).isSameAs(send);
        verify(roomService, never()).isOccupant(anyString(), anyLong());
    }

    @Test
    void 채팅은_개인_큐로만_전달하므로_방_하위_토픽_구독은_막는다() {
        when(roomService.isOccupant("ABCDEF", 7L)).thenReturn(true);
        LoginMember user = new LoginMember(7L, "칠");

        assertThat(guard.preSend(message(StompCommand.SUBSCRIBE, "/topic/rooms/ABCDEF/chat", user), null)).isNull();
    }
}
