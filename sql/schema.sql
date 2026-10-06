-- 오, 유니버스 — MySQL 8 스키마 (DDL)
--
-- JPA 엔티티(backend/src/main/java/com/boardgame/**/domain)에서 Hibernate MySQLDialect로 뽑은 정의를
-- 읽기 좋게 정리한 것이다. 테이블·컬럼·타입·제약 조건 이름은 Hibernate가 만드는 것과 같게 두어,
-- 이 스크립트로 만든 DB에서 spring.jpa.hibernate.ddl-auto=update로 띄워도 중복 제약이 생기지 않는다.
--
-- 사용: mysql -u <user> -p <database> < sql/schema.sql
-- 방·게임 진행 상태는 서버 메모리에만 있으므로 테이블이 없다(회원과 전적만 저장).

SET NAMES utf8mb4;

-- 회원
CREATE TABLE IF NOT EXISTS members (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    login_id      VARCHAR(20)  NOT NULL,
    nickname      VARCHAR(10)  NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    created_at    DATETIME(6)  NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT UKlq5wej6688i1bd6b5c11neptj UNIQUE (login_id),
    CONSTRAINT UKe6u9u9ypoc7oldnpxdjwcdx3 UNIQUE (nickname)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 게임 한 판(매치)
CREATE TABLE IF NOT EXISTS game_match (
    id         BIGINT      NOT NULL AUTO_INCREMENT,
    match_key  VARCHAR(36) NOT NULL,
    game_type  VARCHAR(30) NOT NULL,
    started_at DATETIME(6) NOT NULL,
    ended_at   DATETIME(6),
    PRIMARY KEY (id),
    CONSTRAINT UKqnrfu1wj8kt5tiwvjs00wd2l2 UNIQUE (match_key)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 매치 참가자와 최종 결과
CREATE TABLE IF NOT EXISTS match_participant (
    id        BIGINT      NOT NULL AUTO_INCREMENT,
    match_id  BIGINT      NOT NULL,
    member_id BIGINT      NOT NULL,
    seat      INT         NOT NULL,
    tokens    INT         NOT NULL,
    result    VARCHAR(10),
    PRIMARY KEY (id),
    CONSTRAINT UKiaggidxi3j4k064u19gpjv1hc UNIQUE (match_id, member_id),
    CONSTRAINT FKmgfbewrw2gsh2jcqidggpdyv6 FOREIGN KEY (match_id) REFERENCES game_match (id),
    INDEX idx_match_participant_member (member_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 매치 안의 라운드
CREATE TABLE IF NOT EXISTS match_round (
    id       BIGINT      NOT NULL AUTO_INCREMENT,
    match_id BIGINT      NOT NULL,
    round_no INT         NOT NULL,
    ended_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT UKke5eheonr5m310oawbucp9vk UNIQUE (match_id, round_no),
    CONSTRAINT FK8eeotxc49l6cgtt6n5nika8p6 FOREIGN KEY (match_id) REFERENCES game_match (id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 라운드 참가자 점수와 결과
CREATE TABLE IF NOT EXISTS round_participant (
    id        BIGINT      NOT NULL AUTO_INCREMENT,
    round_id  BIGINT      NOT NULL,
    member_id BIGINT      NOT NULL,
    score     INT         NOT NULL,
    result    VARCHAR(10) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT UK6k4rfsi2jqtgxcyxbcq8gdh2f UNIQUE (round_id, member_id),
    CONSTRAINT FKtn6t5tw5s4kloiybxhvx1ftqh FOREIGN KEY (round_id) REFERENCES match_round (id),
    INDEX idx_round_participant_member (member_id)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 회원별·게임별 누적 전적(순위표)
CREATE TABLE IF NOT EXISTS member_game_stat (
    member_id       BIGINT      NOT NULL,
    game_type       VARCHAR(30) NOT NULL,
    wins            INT         NOT NULL,
    draws           INT         NOT NULL,
    losses          INT         NOT NULL,
    round_wins      INT         NOT NULL,
    round_draws     INT         NOT NULL,
    round_losses    INT         NOT NULL,
    round_score_sum BIGINT      NOT NULL,
    PRIMARY KEY (member_id, game_type),
    INDEX idx_member_game_stat_game_type (game_type)
) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;
