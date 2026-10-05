package com.boardgame.record.domain;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameMatchRepository extends JpaRepository<GameMatch, Long> {

    Optional<GameMatch> findByMatchKey(String matchKey);
}
