package com.boardgame.oldmaid;

import java.util.ArrayList;
import java.util.List;

// 한 번의 상태 변화 동안 모으는 이벤트. 행동이 실패하면 버려져 이전 기록이 그대로 남는다.
public class EventBatch {

    private final List<OldMaidEvent> drafts = new ArrayList<>();
    private final boolean auto;

    public EventBatch(boolean auto) {
        this.auto = auto;
    }

    public void add(OldMaidEvent event) {
        drafts.add(event);
    }

    public boolean has(OldMaidEventType type) {
        return drafts.stream().anyMatch(event -> event.type() == type);
    }

    List<OldMaidEvent> drafts() {
        return List.copyOf(drafts);
    }

    boolean auto() {
        return auto;
    }
}
