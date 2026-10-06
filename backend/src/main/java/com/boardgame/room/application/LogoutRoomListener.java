package com.boardgame.room.application;

import com.boardgame.common.security.MemberLoggedOutEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class LogoutRoomListener {

    private final RoomService roomService;

    public LogoutRoomListener(RoomService roomService) {
        this.roomService = roomService;
    }

    @EventListener
    public void on(MemberLoggedOutEvent event) {
        roomService.leaveCurrentRoom(event.memberId());
    }
}
