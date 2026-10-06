package com.boardgame.room.application;

import com.boardgame.common.security.MemberLoggedOutEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class LogoutRoomListener {

    private static final Logger log = LoggerFactory.getLogger(LogoutRoomListener.class);

    private final RoomService roomService;

    public LogoutRoomListener(RoomService roomService) {
        this.roomService = roomService;
    }

    @EventListener
    public void on(MemberLoggedOutEvent event) {
        try {
            roomService.leaveCurrentRoom(event.memberId());
        } catch (RuntimeException e) {
            // 방 정리가 실패해도 로그아웃(세션 정리)은 반드시 끝나야 한다.
            log.warn("로그아웃 중 방 나가기 실패: memberId={}", event.memberId(), e);
        }
    }
}
