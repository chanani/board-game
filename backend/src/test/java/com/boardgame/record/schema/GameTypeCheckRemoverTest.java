package com.boardgame.record.schema;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootTest
class GameTypeCheckRemoverTest {

    private static final String COUNT = """
            select count(*)
              from information_schema.table_constraints tc
              join information_schema.check_constraints cc
                on cc.constraint_schema = tc.constraint_schema and cc.constraint_name = tc.constraint_name
             where tc.constraint_type = 'CHECK' and lower(tc.table_name) = ? and lower(cc.check_clause) like ?
            """;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private GameTypeCheckRemover remover;

    private int checks(String table, String column) {
        return jdbc.queryForObject(COUNT, Integer.class, table, "%" + column + "%");
    }

    @Test
    void 서버가_뜨면_Hibernate가_건_game_type_제약이_없다() {
        assertThat(checks("game_match", "game_type")).isZero();
        assertThat(checks("member_game_stat", "game_type")).isZero();
    }

    @Test
    void 옛_게임만_나열한_제약을_없애_새_게임이_기록된다() {
        jdbc.execute("alter table game_match add constraint stale_match_type check (game_type = 'PAPER_SAFARI')");
        jdbc.execute("alter table member_game_stat add constraint stale_stat_type check (game_type in ('PAPER_SAFARI', 'UNO'))");

        assertThat(remover.removeAll()).isEqualTo(2);

        assertThat(checks("game_match", "game_type")).isZero();
        assertThat(checks("member_game_stat", "game_type")).isZero();
        assertThatCode(() -> jdbc.update(
                "insert into game_match (game_type, match_key, started_at) values ('FRUIT_STACK', 'stale-check-test', current_timestamp)"))
                .doesNotThrowAnyException();
        jdbc.update("delete from game_match where match_key = 'stale-check-test'");
    }

    @Test
    void 다른_열의_제약은_그대로_둔다() {
        remover.removeAll();

        assertThat(checks("match_participant", "result")).isPositive();
    }

    @Test
    void 없앨_것이_없으면_아무것도_하지_않는다() {
        remover.removeAll();

        assertThat(remover.removeAll()).isZero();
    }
}
