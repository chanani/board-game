package com.boardgame.record.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameType;
import com.boardgame.game.ResultType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

@DataJpaTest
class MemberGameStatRepositoryTest {

    @Autowired
    private MemberGameStatRepository repository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void 판과_라운드_집계를_함께_저장하고_불러온다() {
        MemberGameStat stat = MemberGameStat.empty(7L, GameType.PAPER_SAFARI);
        stat.recordMatch(ResultType.WIN);
        stat.recordMatch(ResultType.LOSE);
        stat.recordRound(ResultType.DRAW, 12);
        repository.saveAndFlush(stat);
        entityManager.clear();

        MemberGameStat loaded = repository.findById(new MemberGameStatId(7L, GameType.PAPER_SAFARI)).orElseThrow();

        assertThat(loaded.matches().wins()).isEqualTo(1);
        assertThat(loaded.matches().losses()).isEqualTo(1);
        assertThat(loaded.rounds().counts().draws()).isEqualTo(1);
        assertThat(loaded.rounds().scoreSum()).isEqualTo(12);
        assertThat(repository.findByIdMemberId(7L)).hasSize(1);
        assertThat(repository.findByIdGameType(GameType.PAPER_SAFARI)).extracting(MemberGameStat::memberId).contains(7L);
    }

    @Test
    void 기록이_없는_빈_통계도_저장된다() {
        repository.saveAndFlush(MemberGameStat.empty(8L, GameType.PAPER_SAFARI));
        entityManager.clear();

        MemberGameStat loaded = repository.findById(new MemberGameStatId(8L, GameType.PAPER_SAFARI)).orElseThrow();

        assertThat(loaded.matches().total()).isZero();
        assertThat(loaded.rounds().counts().total()).isZero();
    }

    @Test
    void 게임_종류는_문자열_컬럼으로_저장된다() {
        Object type = entityManager.getEntityManager().createNativeQuery(
                "select data_type from information_schema.columns "
                        + "where table_name = 'MEMBER_GAME_STAT' and column_name = 'GAME_TYPE'")
                .getSingleResult();

        assertThat(type).isEqualTo("CHARACTER VARYING");
    }
}
