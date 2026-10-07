package com.boardgame.room.infra;

import com.boardgame.room.api.RoomResponse;
import com.boardgame.room.application.RoomNotifier;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class StompRoomNotifier implements RoomNotifier {

    private final SimpMessagingTemplate messagingTemplate;

    public StompRoomNotifier(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    public void roomUpdated(RoomResponse room) {
        messagingTemplate.convertAndSend("/topic/rooms/" + room.code(), room);
    }

    @Override
    public void gameUpdated(long memberId, Object view) {
        messagingTemplate.convertAndSendToUser(String.valueOf(memberId), "/queue/game", view);
    }

    @Override
    public void gameSignal(long memberId, Object signal) {
        messagingTemplate.convertAndSendToUser(String.valueOf(memberId), "/queue/signal", signal);
    }
}
