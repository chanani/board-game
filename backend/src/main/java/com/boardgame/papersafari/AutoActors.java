package com.boardgame.papersafari;

import java.util.ArrayList;
import java.util.List;

// 마지막 상태 변화가 시간 초과 자동 행동이었다면 그 대상들. 사람이 행동하면 비운다.
// 순번은 자동 행동이 있을 때만 오른다. 같은 화면이 다시 와도(관전자 입장, 동기화 등) 클라이언트가 중복 기록을 거를 수 있다.
public class AutoActors {

    private final List<PlayerId> actors = new ArrayList<>();
    private long sequence;

    public void replaceWith(List<PlayerId> latest) {
        actors.clear();
        actors.addAll(latest);
        sequence++;
    }

    public long sequence() {
        return sequence;
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
