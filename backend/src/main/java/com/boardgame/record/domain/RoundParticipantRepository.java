package com.boardgame.record.domain;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RoundParticipantRepository extends JpaRepository<RoundParticipant, Long> {

    @Query("""
            select rp from RoundParticipant rp join fetch rp.round r
            where rp.memberId = :memberId and r.match in :matches
            order by r.roundNumber asc
            """)
    List<RoundParticipant> findByMemberAndMatches(@Param("memberId") long memberId,
                                                  @Param("matches") Collection<GameMatch> matches);
}
