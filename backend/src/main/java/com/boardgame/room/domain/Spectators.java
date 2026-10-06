package com.boardgame.room.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.ArrayList;
import java.util.List;

public class Spectators {

    private final List<Participant> spectators = new ArrayList<>();

    public void add(Participant participant) {
        if (contains(participant.memberId())) {
            return;
        }
        spectators.add(participant);
    }

    public void remove(long memberId) {
        spectators.removeIf(spectator -> spectator.memberId() == memberId);
    }

    public boolean contains(long memberId) {
        return spectators.stream().anyMatch(spectator -> spectator.memberId() == memberId);
    }

    public Participant require(long memberId) {
        return spectators.stream()
                .filter(spectator -> spectator.memberId() == memberId)
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.NOT_SPECTATOR));
    }

    public int size() {
        return spectators.size();
    }

    public List<Long> ids() {
        return spectators.stream().map(Participant::memberId).toList();
    }

    public List<Participant> asList() {
        return List.copyOf(spectators);
    }
}
