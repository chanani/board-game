package com.boardgame.uno;

import java.util.List;

// 마지막 상태 변화의 이벤트 목록 + 게임 안에서 계속 오르는 순번.
public class UnoEvents {

    private List<UnoEvent> latest = List.of();
    private long nextSeq = 1L;

    public EventBatch open(boolean auto) {
        return new EventBatch(auto);
    }

    public void commit(EventBatch batch) {
        latest = batch.drafts()
                .stream()
                .map(event -> event.stamped(nextSeq++, batch.auto()))
                .toList();
    }

    public List<UnoEvent> latest() {
        return latest;
    }
}
