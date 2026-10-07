package com.boardgame.room.application;

import com.boardgame.member.application.AvatarChangedEvent;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** 그림 변경이 커밋된 뒤에만 메모리 그림을 고치고 그 사람의 방에 다시 알린다. */
@Component
public class AvatarChangeListener {

    private final RoomService roomService;

    public AvatarChangeListener(RoomService roomService) {
        this.roomService = roomService;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(AvatarChangedEvent event) {
        roomService.avatarChanged(event.memberId(), event.avatar());
    }
}
