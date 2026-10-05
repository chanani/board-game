package com.boardgame.game;

import java.util.List;

public interface GameSession {

    List<GameOutcome> act(long memberId, GameAction action);

    List<GameOutcome> forfeit(long memberId);

    Object viewFor(long memberId);

    boolean isFinished();

    boolean isPlaying(long memberId);
}
