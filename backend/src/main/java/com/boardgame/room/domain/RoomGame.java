package com.boardgame.room.domain;

import com.boardgame.game.GameAction;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.GameSession;
import java.time.Instant;
import java.util.List;

public record RoomGame(GameSession session, String matchKey, Instant startedAt) {

    public boolean isFinished() {
        return session.isFinished();
    }

    public boolean isPlaying(long memberId) {
        return session.isPlaying(memberId);
    }

    public List<GameOutcome> act(long memberId, GameAction action) {
        return session.act(memberId, action);
    }

    public List<GameOutcome> forfeit(long memberId) {
        return session.forfeit(memberId);
    }

    public int roundNumber() {
        return session.roundNumber();
    }

    public Object viewFor(long memberId) {
        return session.viewFor(memberId);
    }
}
