package com.boardgame.room.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameType;
import java.util.ArrayList;
import java.util.List;

public class RoomMembers {

    private final List<Participant> members = new ArrayList<>();

    public void add(Participant participant, GameType gameType) {
        if (contains(participant.memberId())) {
            return;
        }
        if (members.size() >= gameType.maxPlayers()) {
            throw new BusinessException(ErrorCode.ROOM_FULL);
        }
        members.add(participant);
    }

    public void remove(long memberId) {
        members.removeIf(member -> member.memberId() == memberId);
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
