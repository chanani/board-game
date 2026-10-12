package com.boardgame.invite.infra;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.boardgame.invite.application.InviteSignal;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;

class StompInviteNotifierTest {

    @Test
    void 초대_알림은_그_사람의_개인_큐로만_보낸다() {
        SimpMessagingTemplate template = mock(SimpMessagingTemplate.class);
        InviteSignal signal = InviteSignal.declined(2L, "밥");

        new StompInviteNotifier(template).notify(7L, signal);

        verify(template).convertAndSendToUser("7", "/queue/invites", signal);
    }
}
