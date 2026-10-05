package com.boardgame.room.application;

import com.boardgame.common.security.LoginMember;
import java.security.Principal;
import java.time.Clock;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.stereotype.Component;
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
        String sessionId = SimpMessageHeaderAccessor.getSessionId(event.getMessage().getHeaders());
        markConnected(event.getUser(), sessionId);
    }

    @EventListener
    public void onDisconnected(SessionDisconnectEvent event) {
        markDisconnected(event.getUser(), event.getSessionId());
    }

    private void markConnected(Principal user, String sessionId) {
        if (user == null || sessionId == null) {
            return;
        }
        long memberId = LoginMember.idOf(user);
        presence.connected(memberId, sessionId);
        roomService.presenceChanged(memberId);
    }

    private void markDisconnected(Principal user, String sessionId) {
        if (user == null || sessionId == null) {
            return;
        }
        long memberId = LoginMember.idOf(user);
        presence.disconnected(memberId, sessionId, clock.instant());
        roomService.presenceChanged(memberId);
    }
}
