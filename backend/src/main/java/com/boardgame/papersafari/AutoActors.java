package com.boardgame.papersafari;

import java.util.ArrayList;
import java.util.List;

// 마지막 상태 변화가 시간 초과 자동 행동이었다면 그 대상들. 사람이 행동하면 비운다.
public class AutoActors {

    private final List<PlayerId> actors = new ArrayList<>();

    public void replaceWith(List<PlayerId> latest) {
        actors.clear();
        actors.addAll(latest);
    }

    public void clear() {
        actors.clear();
    }

    public List<Long> ids() {
        return actors.stream()
                .map(PlayerId::value)
                .toList();
    }

    public Long firstId() {
        return actors.stream()
                .findFirst()
                .map(PlayerId::value)
                .orElse(null);
    }
}
