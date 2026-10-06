// B/uno/UnoAutoActors.java
package com.boardgame.uno;

import java.util.ArrayList;
import java.util.List;

// 페이퍼 사파리 AutoActors와 같은 계약: 마지막 변화가 자동 행동이었으면 그 대상, 순번은 자동 행동 때만 오른다.
public class UnoAutoActors {

    private final List<PlayerId> actors = new ArrayList<>();
    private long sequence;

    public void replaceWith(List<PlayerId> latest) {
        actors.clear();
        actors.addAll(latest);
        sequence++;
    }

    public void clear() {
        actors.clear();
    }

    public long sequence() {
        return sequence;
    }

    public List<Long> ids() {
        return actors.stream()
                .map(PlayerId::value)
                .toList();
    }
}
