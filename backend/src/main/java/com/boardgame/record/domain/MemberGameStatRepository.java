package com.boardgame.record.domain;

import com.boardgame.game.GameType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberGameStatRepository extends JpaRepository<MemberGameStat, MemberGameStatId> {

    List<MemberGameStat> findByIdMemberId(long memberId);

    List<MemberGameStat> findByIdGameType(GameType gameType);
}
