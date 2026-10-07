package com.boardgame.game;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Random;

public interface GameSession {

    List<GameOutcome> act(long memberId, GameAction action);

    /**
     * 게임 상태를 바꾸지 않는 가벼운 신호(도둑잡기에서 고르고 있는 카드 등). 받아 주면 방의 모두에게 보낼 내용,
     * 조용히 버리면 빈 값. 신호를 쓰지 않는 게임은 INVALID_INPUT.
     */
    default Optional<Object> signal(long memberId, GameAction action) {
        throw new BusinessException(ErrorCode.INVALID_INPUT);
    }

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
