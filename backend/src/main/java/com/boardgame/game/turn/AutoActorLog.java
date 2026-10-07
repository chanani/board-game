package com.boardgame.game.turn;

import java.util.ArrayList;
import java.util.List;

// 마지막 상태 변화가 시간 초과 자동 행동이었으면 그 대상(회원 id). 순번은 자동 행동 때만 오른다(페이퍼 사파리 AutoActors와 같은 계약).
public class AutoActorLog {

    private final List<Long> actors = new ArrayList<>();
    private long sequence;

    public void replaceWith(List<Long> latest) {
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
        return List.copyOf(actors);
    }
}
