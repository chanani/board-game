package com.boardgame.room.domain;

import java.util.Collection;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/** 준비를 마친 회원 ID 모음. */
public class ReadyMembers {

    private final Set<Long> ids = new LinkedHashSet<>();

    public void mark(long memberId) {
        ids.add(memberId);
    }

    public void unmark(long memberId) {
        ids.remove(memberId);
    }

    public void clear() {
        ids.clear();
    }

    public boolean contains(long memberId) {
        return ids.contains(memberId);
    }

    public boolean containsAll(Collection<Long> memberIds) {
        return ids.containsAll(new HashSet<>(memberIds));
    }

    public List<Long> asList() {
        return List.copyOf(ids);
    }
}
