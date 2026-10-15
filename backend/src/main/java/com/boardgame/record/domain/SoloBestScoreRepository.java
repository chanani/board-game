package com.boardgame.record.domain;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SoloBestScoreRepository extends JpaRepository<SoloBestScore, MemberGameStatId> {

    List<SoloBestScore> findByIdMemberId(long memberId);
}
