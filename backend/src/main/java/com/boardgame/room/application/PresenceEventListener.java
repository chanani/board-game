package com.boardgame.room.application;

import com.boardgame.common.security.LoginMember;
import java.time.Clock;
import java.util.Optional;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.AbstractSubProtocolEvent;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
public class PresenceEventListener {

    private final PresenceTracker presence;
    private final RoomService roomService;
    private final Clock clock;

    public PresenceEventListener(PresenceTracker presence, RoomService roomService, Clock clock) {
        this.presence = presence;
        this.roomService = roomService;
        this.clock = clock;
    }

    @EventListener
    public void onConnected(SessionConnectedEvent event) {
        memberIdOf(event).ifPresent(this::markConnected);
    }

    @EventListener
    public void onDisconnected(SessionDisconnectEvent event) {
        memberIdOf(event).ifPresent(this::markDisconnected);
    }

    private void markConnected(long memberId) {
        presence.connected(memberId);
        roomService.presenceChanged(memberId);
    }

    private void markDisconnected(long memberId) {
        presence.disconnected(memberId, clock.instant());
        roomService.presenceChanged(memberId);
    }

    private Optional<Long> memberIdOf(AbstractSubProtocolEvent event) {
        return Optional.ofNullable(event.getUser()).map(LoginMember::idOf);
    }
}
