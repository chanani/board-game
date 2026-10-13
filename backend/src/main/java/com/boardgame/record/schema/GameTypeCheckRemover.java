package com.boardgame.record.schema;

import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.dao.DataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * 전적 테이블의 game_type 열에 걸린 CHECK 제약을 서버가 뜰 때 없앤다.
 * Hibernate는 테이블을 만들 때 그때의 게임 종류만 나열한 CHECK를 걸고(ddl-auto: update는 이를 고치지 않는다),
 * 그 뒤에 더한 게임의 전적 기록이 이 제약에 걸려 모두 실패한다. 게임 종류는 enum이 지키므로 DB 제약은 두지 않는다.
 */
@Component
public class GameTypeCheckRemover implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(GameTypeCheckRemover.class);

    private static final String FIND = """
            select tc.table_name, tc.constraint_name
              from information_schema.table_constraints tc
              join information_schema.check_constraints cc
                on cc.constraint_schema = tc.constraint_schema and cc.constraint_name = tc.constraint_name
             where tc.constraint_type = 'CHECK'
               and tc.table_schema = schema()
               and lower(tc.table_name) in ('game_match', 'member_game_stat')
               and lower(cc.check_clause) like '%game_type%'
            """;

    private final JdbcTemplate jdbc;

    public GameTypeCheckRemover(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(ApplicationArguments args) {
        removeAll();
    }

    /** 없앤 제약 수를 돌려준다. 실패해도 서버는 뜬다(기록만 남긴다). */
    public int removeAll() {
        try {
            return drop(find());
        } catch (DataAccessException exception) {
            log.warn("game_type CHECK 제약을 정리하지 못했습니다. 새 게임의 전적 기록이 실패할 수 있습니다.", exception);
            return 0;
        }
    }

    private List<GameTypeCheck> find() {
        return jdbc.query(FIND, (row, index) -> new GameTypeCheck(row.getString(1), row.getString(2)));
    }

    private int drop(List<GameTypeCheck> checks) {
        List<GameTypeCheck> plain = checks.stream().filter(GameTypeCheck::isPlain).toList();
        plain.forEach(this::drop);
        return plain.size();
    }

    private void drop(GameTypeCheck check) {
        jdbc.execute(check.dropSql());
        log.info("game_type CHECK 제약을 없앴습니다: {}", check);
    }
}
