package com.boardgame.room.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.ArrayList;
import java.util.List;

public class RoomMembers {

    private final List<Participant> members = new ArrayList<>();
    private final ReadyMembers ready = new ReadyMembers();

    public void add(Participant participant, Capacity capacity) {
        if (contains(participant.memberId())) {
            return;
        }
        if (capacity.isFull(members.size())) {
            throw new BusinessException(ErrorCode.ROOM_FULL);
        }
        members.add(participant);
    }

    public void remove(long memberId) {
        boolean wasHost = isHost(memberId);
        members.removeIf(member -> member.memberId() == memberId);
        ready.unmark(memberId);
        if (wasHost) {
            ready.clear();
        }
    }

    public void setReady(long memberId, boolean value) {
        if (!value) {
            ready.unmark(memberId);
            return;
        }
        ready.mark(memberId);
    }

    public boolean everyGuestReady() {
        return ready.containsAll(guestIds());
    }

    public void clearReady() {
        ready.clear();
    }

    public List<Long> readyIds() {
        return ready.asList();
    }

    private List<Long> guestIds() {
        return members.stream()
                .map(Participant::memberId)
                .filter(id -> id != hostId())
                .toList();
    }

    public boolean contains(long memberId) {
        return members.stream().anyMatch(member -> member.memberId() == memberId);
    }

    public void requireMember(long memberId) {
        if (!contains(memberId)) {
            throw new BusinessException(ErrorCode.NOT_IN_ROOM);
        }
    }

    public long hostId() {
        return members.get(0).memberId();
    }

    public boolean isHost(long memberId) {
        return !members.isEmpty() && hostId() == memberId;
    }

    public boolean isEmpty() {
        return members.isEmpty();
    }

    public int size() {
        return members.size();
    }

    public List<Long> ids() {
        return members.stream().map(Participant::memberId).toList();
    }

    public List<Participant> asList() {
        return List.copyOf(members);
    }
}
