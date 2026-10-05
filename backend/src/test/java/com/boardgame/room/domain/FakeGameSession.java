package com.boardgame.room.domain;

import com.boardgame.game.GameAction;
import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.GameSession;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class FakeGameSession implements GameSession {

    private final List<Long> players;
    private final Set<Long> forfeited = new HashSet<>();
    private final List<GameAction> actions = new ArrayList<>();
    private boolean finished;

    public FakeGameSession(List<Long> players) {
        this.players = List.copyOf(players);
    }

    @Override
    public List<GameOutcome> act(long memberId, GameAction action) {
        actions.add(action);
        return List.of();
    }

    @Override
    public List<GameOutcome> forfeit(long memberId) {
        forfeited.add(memberId);
        if (players.size() - forfeited.size() > 1) {
            return List.of();
        }
        finished = true;
        return List.of(new GameCompleted(List.of()));
    }

    @Override
    public Object viewFor(long memberId) {
        return "view-" + memberId;
    }

    @Override
    public boolean isFinished() {
        return finished;
    }

    @Override
    public boolean isPlaying(long memberId) {
        return !finished && players.contains(memberId) && !forfeited.contains(memberId);
    }

    public void finish() {
        finished = true;
    }

    public List<GameAction> actions() {
        return actions;
    }
}
