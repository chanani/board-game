package com.boardgame.friend.application;

import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/** 친구 요청·수락·삭제가 커밋된 뒤에만 상대에게 알린다. */
@Component
public class FriendEventListener {

    private final FriendNotifier notifier;

    public FriendEventListener(FriendNotifier notifier) {
        this.notifier = notifier;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void on(FriendEvent event) {
        notifier.notify(event.memberId(), event.signal());
    }
}
