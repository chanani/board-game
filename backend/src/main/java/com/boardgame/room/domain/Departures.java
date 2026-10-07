package com.boardgame.room.domain;

import java.util.HashSet;
import java.util.Set;

/** 게임이 시작된 뒤 방을 나간 사람들. 끝난 게임의 결과 화면은 나갔다 다시 들어온 사람에게 보내지 않는다. */
public class Departures {

    private final Set<Long> memberIds = new HashSet<>();

    public void add(long memberId) {
        memberIds.add(memberId);
    }

    public void remove(long memberId) {
        memberIds.remove(memberId);
    }

    public boolean contains(long memberId) {
        return memberIds.contains(memberId);
    }
}
