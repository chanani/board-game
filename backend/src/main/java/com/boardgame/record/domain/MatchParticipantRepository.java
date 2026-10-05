package com.boardgame.record.domain;

import com.boardgame.game.GameType;
import java.util.Collection;
import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MatchParticipantRepository extends JpaRepository<MatchParticipant, Long> {

    List<MatchParticipant> findByMatch(GameMatch match);

    List<MatchParticipant> findByMatchInOrderBySeatSeatAsc(Collection<GameMatch> matches);

    @Query("""
            select p from MatchParticipant p join fetch p.match m
            where p.seat.memberId = :memberId
              and m.period.endedAt is not null
              and (:gameType is null or m.gameType = :gameType)
            order by m.period.endedAt desc, m.id desc
            """)
    List<MatchParticipant> findFinishedByMember(@Param("memberId") long memberId,
                                                @Param("gameType") GameType gameType,
                                                Pageable pageable);
}
