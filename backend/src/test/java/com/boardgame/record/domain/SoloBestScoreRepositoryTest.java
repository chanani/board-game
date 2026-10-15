package com.boardgame.record.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameType;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;

@DataJpaTest
class SoloBestScoreRepositoryTest {

    @Autowired
    private SoloBestScoreRepository repository;

    @Autowired
    private TestEntityManager entityManager;

    @Test
    void S6_회원별_게임별_최고_점수를_저장하고_불러온다() {
        repository.saveAndFlush(SoloBestScore.first(7L, GameType.FRUIT_STACK, 345, Instant.parse("2026-10-15T01:00:00Z")));
        entityManager.clear();

        SoloBestScore loaded = repository.findById(new MemberGameStatId(7L, GameType.FRUIT_STACK)).orElseThrow();

        assertThat(loaded.score()).isEqualTo(345);
        assertThat(loaded.achievedAt()).isEqualTo(Instant.parse("2026-10-15T01:00:00Z"));
        assertThat(repository.findByIdMemberId(7L)).hasSize(1);
    }

    @Test
    void 테이블과_컬럼_이름은_solo_best_score와_스키마_파일과_같다() {
        Object columns = entityManager.getEntityManager().createNativeQuery(
                "select count(*) from information_schema.columns where table_name = 'SOLO_BEST_SCORE' "
                        + "and column_name in ('MEMBER_ID', 'GAME_TYPE', 'BEST_SCORE', 'ACHIEVED_AT')")
                .getSingleResult();

        assertThat(((Number) columns).intValue()).isEqualTo(4);
    }
}
