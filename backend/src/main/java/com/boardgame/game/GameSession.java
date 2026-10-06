package com.boardgame.game;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Random;

public interface GameSession {

    List<GameOutcome> act(long memberId, GameAction action);

    List<GameOutcome> forfeit(long memberId);

    /** 시간 초과: 지금 기다리는 행동을 그 사람 대신 한다. */
    List<GameOutcome> autoAct(Random random);

    /** 행동을 기다리는 마감 시각. 게임이 끝났으면 비어 있다. */
    Optional<Instant> deadline();

    Object viewFor(long memberId);

    boolean isFinished();

    boolean isPlaying(long memberId);

    int roundNumber();
}
