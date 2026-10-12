package com.boardgame.invite.infra;

import com.boardgame.invite.application.InviteNotifier;
import com.boardgame.invite.application.InviteSignal;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class StompInviteNotifier implements InviteNotifier {

    private final SimpMessagingTemplate messagingTemplate;

    public StompInviteNotifier(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    public void notify(long memberId, InviteSignal signal) {
        messagingTemplate.convertAndSendToUser(String.valueOf(memberId), "/queue/invites", signal);
    }
}
