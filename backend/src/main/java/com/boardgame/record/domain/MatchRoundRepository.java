package com.boardgame.record.domain;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MatchRoundRepository extends JpaRepository<MatchRound, Long> {

    boolean existsByMatchAndRoundNumber(GameMatch match, int roundNumber);
}
