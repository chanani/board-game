package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

import com.boardgame.common.security.LoginMember;
import java.security.Principal;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

class PresenceEventListenerTest {

    private final PresenceTracker tracker = new PresenceTracker();
    private final RoomService roomService = mock(RoomService.class);
    private final Clock clock = Clock.fixed(Instant.parse("2026-10-05T10:00:00Z"), ZoneOffset.UTC);
    private final PresenceEventListener listener = new PresenceEventListener(tracker, roomService, clock);
    private final Principal principal =
            UsernamePasswordAuthenticationToken.authenticated(new LoginMember(7L, "앨리스"), null, List.of());

    private Message<byte[]> message() {
        SimpMessageHeaderAccessor accessor = SimpMessageHeaderAccessor.create();
        accessor.setSessionId("s1");
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    @Test
    void 연결_이벤트는_접속_상태를_갱신하고_방에_알린다() {
        listener.onConnected(new SessionConnectedEvent(this, message(), principal));

        assertThat(tracker.isConnected(7L)).isTrue();
        verify(roomService).presenceChanged(7L);
    }

    @Test
    void 끊김_이벤트는_접속_상태를_해제한다() {
        listener.onConnected(new SessionConnectedEvent(this, message(), principal));

        listener.onDisconnected(new SessionDisconnectEvent(this, message(), "s1", CloseStatus.NORMAL, principal));

        assertThat(tracker.isConnected(7L)).isFalse();
    }

    @Test
    void 사용자가_없는_이벤트는_무시한다() {
        listener.onConnected(new SessionConnectedEvent(this, message(), null));
        listener.onDisconnected(new SessionDisconnectEvent(this, message(), "s1", CloseStatus.NORMAL, null));

        verifyNoInteractions(roomService);
    }
}
