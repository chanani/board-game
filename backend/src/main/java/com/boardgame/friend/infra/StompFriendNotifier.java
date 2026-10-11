package com.boardgame.friend.infra;

import com.boardgame.friend.application.FriendNotifier;
import com.boardgame.friend.application.FriendSignal;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class StompFriendNotifier implements FriendNotifier {

    private final SimpMessagingTemplate messagingTemplate;

    public StompFriendNotifier(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    public void notify(long memberId, FriendSignal signal) {
        messagingTemplate.convertAndSendToUser(String.valueOf(memberId), "/queue/friends", signal);
    }
}
