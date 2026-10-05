# 계획 4: 전적(게임/라운드 승·무·패) + 승률 + 순위표 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 계획 3이 발행하는 게임 이벤트를 받아 판/라운드 기록과 회원별·게임별 누적 통계를 저장하고, 내 전적·다른 회원 전적·최근 경기·순위표 API를 제공한다.

**Architecture:** `record` 패키지. 도메인은 JPA 엔티티 `GameMatch`/`MatchParticipant`/`MatchRound`/`RoundParticipant`(판·라운드 기록)와 `MemberGameStat`(누적 통계, 임베디드 `ResultCounts`·`RoundRecord`). `RecordService`가 이벤트별 저장을 멱등하게 처리하고, `RecordEventListener`가 이벤트를 받아 예외를 로그로 삼킨다(방 진행에 영향 없음). `RecordQueryService` + `RecordController`가 조회 API를 연다.

**Tech Stack:** Java 21, Spring Boot 3.5.16, Spring Data JPA(Hibernate 6), H2(테스트), JUnit 5, AssertJ, MockMvc

**Spec:** `docs/superpowers/specs/2026-10-05-board-game-platform-design.md` (§6.2 기록 단위, §6.3 테이블, §6.4 계산, §7-5 전적 페이지)

### 로드맵 위치
1~3 완료 · **4. 전적·승률·순위표** ← 이 문서 · 5. 프론트엔드 + Docker

### 스펙 대비 구체화한 결정
- 계획 3 이벤트: `GameStartedEvent(matchKey, gameType, memberIds, startedAt)`, `RoundCompletedEvent(matchKey, gameType, RoundCompleted(roundNumber, entries[memberId, result, score]))`, `GameCompletedEvent(matchKey, gameType, startedAt, endedAt, GameCompleted(entries[memberId, result, tokens, seat]))`. 리스너는 `RoomService`의 전역 락 안에서 동기 실행되므로 짧게 처리하고 예외는 로그로 남긴 뒤 삼킨다.
- 멱등성: 같은 `matchKey` 시작은 한 번만, 같은 `(matchKey, roundNumber)` 라운드는 한 번만, 이미 끝난 매치의 종료는 무시. 시작 이벤트 없이 종료가 오면 종료 이벤트의 참가자로 매치를 만든다.
- 시작만 있고 종료가 없는 매치(서버 재시작 등)는 `ended_at`이 비어 있고 최근 경기 목록·통계에 나오지 않는다.
- 라운드 `ended_at`은 이벤트 수신 시각(`Clock`).
- 승률은 저장하지 않고 계산. 판수 0이면 `null`(클라이언트가 "-" 표시). 순위표는 게임 5판 이상, 승률 내림차순 → 판수 내림차순 → 회원 id 오름차순.

## Global Constraints

- Java 21, Spring Boot **3.5.16**, Maven. 기본 패키지 `com.boardgame`. 명령은 저장소 루트에서 `mvn -q -f backend/pom.xml ...`. 테스트 리소스를 지웠다면 `clean` 포함.
- 객체지향 생활 체조(CLAUDE.md): 메서드당 들여쓰기 1단계, `else` 금지, 원시값 VO(요청/응답 DTO·이벤트 record와 JPA 식별자/외래키 값 `id`·`memberId`·`matchKey`는 허용), 로직은 도메인 엔티티에, 클래스 상태 필드 3개 이하(JPA `@Id`, 스프링 주입 의존성 제외).
- 에러: `BusinessException(ErrorCode)`, 응답 `{"status": int, "code": "...", "message": "..."}`.
- 테이블: `game_match`, `match_participant`, `match_round`, `round_participant`, `member_game_stat`(PK `member_id`+`game_type`). 순위표 최소 판수 **5**.
- 테스트 메서드명은 한국어 문장. 커밋 메시지 마지막 줄: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Review Focus

1. 같은 이벤트가 두 번 와도 통계가 두 번 오르지 않음 (Task 2 테스트)
2. 기록 저장 중 오류가 나도 게임 진행(방 서비스)에는 예외가 전파되지 않음 (Task 2 테스트)
3. 한 판도 하지 않은 게임의 승률은 0%가 아니라 `null` (Task 1, Task 3 테스트)
4. 최근 경기에는 끝난 경기만, 내 결과·토큰·라운드 결과열과 상대 닉네임이 함께 나옴 (Task 3 테스트)
5. 실제 방에서 게임이 끝나면(기권 포함) 별도 호출 없이 내 전적에 반영 (Task 3 테스트)

---

## File Structure

```
backend/src/main/java/com/boardgame/common/error/ErrorCode.java          (Modify: MEMBER_NOT_FOUND)
backend/src/main/java/com/boardgame/record/domain/
  ResultCounts.java RoundRecord.java MemberGameStatId.java MemberGameStat.java MemberGameStatRepository.java
  MatchPeriod.java GameMatch.java GameMatchRepository.java
  ParticipantSeat.java ParticipantOutcome.java MatchParticipant.java MatchParticipantRepository.java
  MatchRound.java MatchRoundRepository.java RoundOutcomeRecord.java RoundParticipant.java RoundParticipantRepository.java
backend/src/main/java/com/boardgame/record/application/
  RecordService.java RecordEventListener.java RecordQueryService.java
backend/src/main/java/com/boardgame/record/api/
  GameStatResponse.java MemberStatsResponse.java MatchPlayerResponse.java RoundResultResponse.java
  RecentMatchResponse.java RankingResponse.java RecordController.java
backend/src/test/java/com/boardgame/record/domain/ResultCountsTest.java MemberGameStatTest.java MemberGameStatRepositoryTest.java
backend/src/test/java/com/boardgame/record/application/RecordServiceTest.java
backend/src/test/java/com/boardgame/record/api/RecordApiTest.java
```

---

### Task 1: 누적 통계 도메인

**Files:**
- Create: `backend/src/main/java/com/boardgame/record/domain/{ResultCounts,RoundRecord,MemberGameStatId,MemberGameStat,MemberGameStatRepository}.java`
- Test: `backend/src/test/java/com/boardgame/record/domain/{ResultCountsTest,MemberGameStatTest,MemberGameStatRepositoryTest}.java`

**Interfaces:**
- Consumes: `com.boardgame.game.ResultType { WIN, DRAW, LOSE }`, `com.boardgame.game.GameType`
- Produces:
  - `@Embeddable ResultCounts` — `static empty()`, `ResultCounts add(ResultType)`(새 객체), `int wins()/draws()/losses()/total()`, `Double winRate()`(0판이면 null)
  - `@Embeddable RoundRecord` — `static empty()`, `RoundRecord add(ResultType, int score)`, `ResultCounts counts()`, `long scoreSum()`, `Double winRate()`, `Double averageScore()`(0라운드면 null)
  - `@Embeddable MemberGameStatId(long memberId, GameType gameType)` (Serializable, equals/hashCode)
  - `@Entity MemberGameStat`(테이블 `member_game_stat`) — `static empty(long memberId, GameType)`, `recordMatch(ResultType)`, `recordRound(ResultType, int score)`, `boolean isRanked()`(5판 이상), `long memberId()`, `GameType gameType()`, `ResultCounts matches()`, `RoundRecord rounds()`; 상수 `RANKING_MIN_MATCHES = 5`
  - `MemberGameStatRepository extends JpaRepository<MemberGameStat, MemberGameStatId>` — `List<MemberGameStat> findByIdMemberId(long)`, `List<MemberGameStat> findByIdGameType(GameType)`

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/src/test/java/com/boardgame/record/domain/ResultCountsTest.java`
```java
package com.boardgame.record.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.ResultType;
import org.junit.jupiter.api.Test;

class ResultCountsTest {

    @Test
    void 결과를_더하면_새_집계가_된다() {
        ResultCounts counts = ResultCounts.empty()
                .add(ResultType.WIN)
                .add(ResultType.WIN)
                .add(ResultType.DRAW)
                .add(ResultType.LOSE);

        assertThat(counts.wins()).isEqualTo(2);
        assertThat(counts.draws()).isEqualTo(1);
        assertThat(counts.losses()).isEqualTo(1);
        assertThat(counts.total()).isEqualTo(4);
        assertThat(counts.winRate()).isEqualTo(0.5);
    }

    @Test
    void 기록이_없으면_승률은_null이다() {
        assertThat(ResultCounts.empty().winRate()).isNull();
    }

    @Test
    void 더해도_원래_집계는_바뀌지_않는다() {
        ResultCounts empty = ResultCounts.empty();

        empty.add(ResultType.WIN);

        assertThat(empty.total()).isZero();
    }
}
```

`backend/src/test/java/com/boardgame/record/domain/MemberGameStatTest.java`
```java
package com.boardgame.record.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameType;
import com.boardgame.game.ResultType;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class MemberGameStatTest {

    @Test
    void 판_결과와_라운드_결과를_따로_집계한다() {
        MemberGameStat stat = MemberGameStat.empty(1L, GameType.PAPER_SAFARI);

        stat.recordMatch(ResultType.WIN);
        stat.recordRound(ResultType.WIN, 3);
        stat.recordRound(ResultType.DRAW, 10);
        stat.recordRound(ResultType.LOSE, 20);

        assertThat(stat.memberId()).isEqualTo(1L);
        assertThat(stat.gameType()).isEqualTo(GameType.PAPER_SAFARI);
        assertThat(stat.matches().wins()).isEqualTo(1);
        assertThat(stat.matches().winRate()).isEqualTo(1.0);
        assertThat(stat.rounds().counts().total()).isEqualTo(3);
        assertThat(stat.rounds().scoreSum()).isEqualTo(33);
        assertThat(stat.rounds().averageScore()).isEqualTo(11.0);
        assertThat(stat.rounds().winRate()).isEqualTo(1.0 / 3);
    }

    @Test
    void 라운드가_없으면_평균_점수는_null이다() {
        MemberGameStat stat = MemberGameStat.empty(1L, GameType.PAPER_SAFARI);

        assertThat(stat.rounds().averageScore()).isNull();
        assertThat(stat.rounds().winRate()).isNull();
    }

    @Test
    void 다섯_판_이상이어야_순위표에_오른다() {
        MemberGameStat stat = MemberGameStat.empty(1L, GameType.PAPER_SAFARI);
        IntStream.range(0, 4).forEach(index -> stat.recordMatch(ResultType.LOSE));
        assertThat(stat.isRanked()).isFalse();

        stat.recordMatch(ResultType.DRAW);

        assertThat(stat.isRanked()).isTrue();
    }
}
```

`backend/src/test/java/com/boardgame/record/domain/MemberGameStatRepositoryTest.java`
```java
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
}
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest='ResultCountsTest,MemberGameStatTest,MemberGameStatRepositoryTest'`
Expected: FAIL — `cannot find symbol: class ResultCounts`

- [ ] **Step 3: 구현**

`backend/src/main/java/com/boardgame/record/domain/ResultCounts.java`
```java
package com.boardgame.record.domain;

import com.boardgame.game.ResultType;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class ResultCounts {

    @Column(name = "wins", nullable = false)
    private int wins;

    @Column(name = "draws", nullable = false)
    private int draws;

    @Column(name = "losses", nullable = false)
    private int losses;

    protected ResultCounts() {
    }

    private ResultCounts(int wins, int draws, int losses) {
        this.wins = wins;
        this.draws = draws;
        this.losses = losses;
    }

    public static ResultCounts empty() {
        return new ResultCounts(0, 0, 0);
    }

    public ResultCounts add(ResultType result) {
        return switch (result) {
            case WIN -> new ResultCounts(wins + 1, draws, losses);
            case DRAW -> new ResultCounts(wins, draws + 1, losses);
            case LOSE -> new ResultCounts(wins, draws, losses + 1);
        };
    }

    public int wins() {
        return wins;
    }

    public int draws() {
        return draws;
    }

    public int losses() {
        return losses;
    }

    public int total() {
        return wins + draws + losses;
    }

    public Double winRate() {
        if (total() == 0) {
            return null;
        }
        return (double) wins / total();
    }
}
```

`backend/src/main/java/com/boardgame/record/domain/RoundRecord.java`
```java
package com.boardgame.record.domain;

import com.boardgame.game.ResultType;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.AttributeOverrides;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Embedded;

@Embeddable
public class RoundRecord {

    @Embedded
    @AttributeOverrides({
            @AttributeOverride(name = "wins", column = @Column(name = "round_wins", nullable = false)),
            @AttributeOverride(name = "draws", column = @Column(name = "round_draws", nullable = false)),
            @AttributeOverride(name = "losses", column = @Column(name = "round_losses", nullable = false))})
    private ResultCounts counts;

    @Column(name = "round_score_sum", nullable = false)
    private long scoreSum;

    protected RoundRecord() {
    }

    private RoundRecord(ResultCounts counts, long scoreSum) {
        this.counts = counts;
        this.scoreSum = scoreSum;
    }

    public static RoundRecord empty() {
        return new RoundRecord(ResultCounts.empty(), 0);
    }

    public RoundRecord add(ResultType result, int score) {
        return new RoundRecord(counts.add(result), scoreSum + score);
    }

    public ResultCounts counts() {
        return counts;
    }

    public long scoreSum() {
        return scoreSum;
    }

    public Double winRate() {
        return counts.winRate();
    }

    public Double averageScore() {
        if (counts.total() == 0) {
            return null;
        }
        return (double) scoreSum / counts.total();
    }
}
```

`backend/src/main/java/com/boardgame/record/domain/MemberGameStatId.java`
```java
package com.boardgame.record.domain;

import com.boardgame.game.GameType;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import java.io.Serializable;
import java.util.Objects;

@Embeddable
public class MemberGameStatId implements Serializable {

    @Column(name = "member_id", nullable = false)
    private long memberId;

    @Enumerated(EnumType.STRING)
    @Column(name = "game_type", nullable = false, length = 30)
    private GameType gameType;

    protected MemberGameStatId() {
    }

    public MemberGameStatId(long memberId, GameType gameType) {
        this.memberId = memberId;
        this.gameType = gameType;
    }

    public long memberId() {
        return memberId;
    }

    public GameType gameType() {
        return gameType;
    }

    @Override
    public boolean equals(Object other) {
        if (!(other instanceof MemberGameStatId that)) {
            return false;
        }
        return memberId == that.memberId && gameType == that.gameType;
    }

    @Override
    public int hashCode() {
        return Objects.hash(memberId, gameType);
    }
}
```

`backend/src/main/java/com/boardgame/record/domain/MemberGameStat.java`
```java
package com.boardgame.record.domain;

import com.boardgame.game.GameType;
import com.boardgame.game.ResultType;
import jakarta.persistence.Embedded;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

@Entity
@Table(name = "member_game_stat")
public class MemberGameStat {

    public static final int RANKING_MIN_MATCHES = 5;

    @EmbeddedId
    private MemberGameStatId id;

    @Embedded
    private ResultCounts matches;

    @Embedded
    private RoundRecord rounds;

    protected MemberGameStat() {
    }

    private MemberGameStat(MemberGameStatId id, ResultCounts matches, RoundRecord rounds) {
        this.id = id;
        this.matches = matches;
        this.rounds = rounds;
    }

    public static MemberGameStat empty(long memberId, GameType gameType) {
        return new MemberGameStat(new MemberGameStatId(memberId, gameType), ResultCounts.empty(), RoundRecord.empty());
    }

    public void recordMatch(ResultType result) {
        matches = matches.add(result);
    }

    public void recordRound(ResultType result, int score) {
        rounds = rounds.add(result, score);
    }

    public boolean isRanked() {
        return matches.total() >= RANKING_MIN_MATCHES;
    }

    public long memberId() {
        return id.memberId();
    }

    public GameType gameType() {
        return id.gameType();
    }

    public ResultCounts matches() {
        return matches;
    }

    public RoundRecord rounds() {
        return rounds;
    }
}
```

`backend/src/main/java/com/boardgame/record/domain/MemberGameStatRepository.java`
```java
package com.boardgame.record.domain;

import com.boardgame.game.GameType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MemberGameStatRepository extends JpaRepository<MemberGameStat, MemberGameStatId> {

    List<MemberGameStat> findByIdMemberId(long memberId);

    List<MemberGameStat> findByIdGameType(GameType gameType);
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest='ResultCountsTest,MemberGameStatTest,MemberGameStatRepositoryTest'`
Expected: PASS

- [ ] **Step 5: 전체 회귀 확인 후 커밋**

Run: `mvn -q -f backend/pom.xml test`
Expected: PASS

```bash
git add backend
git commit -m "feat: 회원별 게임 통계 도메인(판·라운드 승무패, 승률, 평균 점수)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 판·라운드 기록 저장과 이벤트 수신

**Files:**
- Create: `backend/src/main/java/com/boardgame/record/domain/{MatchPeriod,GameMatch,GameMatchRepository,ParticipantSeat,ParticipantOutcome,MatchParticipant,MatchParticipantRepository,MatchRound,MatchRoundRepository,RoundOutcomeRecord,RoundParticipant,RoundParticipantRepository}.java`
- Create: `backend/src/main/java/com/boardgame/record/application/{RecordService,RecordEventListener}.java`
- Test: `backend/src/test/java/com/boardgame/record/application/RecordServiceTest.java`

**Interfaces:**
- Consumes: Task 1 `MemberGameStat`, `MemberGameStatRepository`, `MemberGameStatId`; 계획 3 이벤트 `GameStartedEvent`, `RoundCompletedEvent`, `GameCompletedEvent`, `RoundCompleted`, `RoundEntry`, `GameCompleted`, `MatchEntry`, `ResultType`, `GameType`; `Clock` 빈
- Produces:
  - `@Entity GameMatch`(테이블 `game_match`) — `static start(String matchKey, GameType, Instant startedAt)`, `finish(Instant endedAt)`, `isFinished()`, `Long id()`, `String matchKey()`, `GameType gameType()`, `Instant startedAt()`, `Instant endedAt()`
  - `@Entity MatchParticipant`(테이블 `match_participant`) — `static join(GameMatch, long memberId, int seat)`, `finish(ResultType, int tokens)`, `GameMatch match()`, `long memberId()`, `int seat()`, `ResultType result()`(끝나기 전 null), `int tokens()`
  - `@Entity MatchRound`(테이블 `match_round`) — `static of(GameMatch, int roundNumber, Instant endedAt)`, `GameMatch match()`, `int roundNumber()`
  - `@Entity RoundParticipant`(테이블 `round_participant`) — `static of(MatchRound, long memberId, ResultType, int score)`, `MatchRound round()`, `long memberId()`, `ResultType result()`, `int score()`
  - 리포지토리: `GameMatchRepository.findByMatchKey(String)`, `MatchParticipantRepository.findByMatch(GameMatch)`·`findFinishedByMember(long memberId, GameType gameType, Pageable)`·`findByMatchInOrderBySeatSeatAsc(Collection<GameMatch>)`, `MatchRoundRepository.existsByMatchAndRoundNumber(GameMatch, int)`, `RoundParticipantRepository.findByMemberAndMatches(long memberId, Collection<GameMatch>)`
  - `@Service RecordService` — `recordStart(GameStartedEvent)`, `recordRound(RoundCompletedEvent)`, `recordCompletion(GameCompletedEvent)` (모두 `@Transactional`, 멱등)
  - `@Component RecordEventListener` — 세 이벤트를 `@EventListener`로 받아 `RecordService`에 위임, `RuntimeException`은 로그로 남기고 삼킨다

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/src/test/java/com/boardgame/record/application/RecordServiceTest.java`
```java
package com.boardgame.record.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameType;
import com.boardgame.game.MatchEntry;
import com.boardgame.game.ResultType;
import com.boardgame.game.RoundCompleted;
import com.boardgame.game.RoundEntry;
import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.game.event.GameStartedEvent;
import com.boardgame.game.event.RoundCompletedEvent;
import com.boardgame.record.domain.GameMatch;
import com.boardgame.record.domain.GameMatchRepository;
import com.boardgame.record.domain.MatchParticipant;
import com.boardgame.record.domain.MatchParticipantRepository;
import com.boardgame.record.domain.MemberGameStat;
import com.boardgame.record.domain.MemberGameStatId;
import com.boardgame.record.domain.MemberGameStatRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ThreadLocalRandom;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class RecordServiceTest {

    private static final Instant STARTED = Instant.parse("2026-10-05T10:00:00Z");
    private static final Instant ENDED = Instant.parse("2026-10-05T10:30:00Z");

    @Autowired
    private ApplicationEventPublisher events;

    @Autowired
    private GameMatchRepository matchRepository;

    @Autowired
    private MatchParticipantRepository participantRepository;

    @Autowired
    private MemberGameStatRepository statRepository;

    private final long alice = ThreadLocalRandom.current().nextLong(1_000_000L, 1_000_000_000L);
    private final long bob = alice + 1;
    private final String matchKey = UUID.randomUUID().toString();

    private MemberGameStat statOf(long memberId) {
        return statRepository.findById(new MemberGameStatId(memberId, GameType.PAPER_SAFARI)).orElseThrow();
    }

    private void start() {
        events.publishEvent(new GameStartedEvent(matchKey, GameType.PAPER_SAFARI, List.of(alice, bob), STARTED));
    }

    private void round(int number, ResultType aliceResult, int aliceScore, ResultType bobResult, int bobScore) {
        events.publishEvent(new RoundCompletedEvent(matchKey, GameType.PAPER_SAFARI, new RoundCompleted(number,
                List.of(new RoundEntry(alice, aliceResult, aliceScore), new RoundEntry(bob, bobResult, bobScore)))));
    }

    private void complete() {
        events.publishEvent(new GameCompletedEvent(matchKey, GameType.PAPER_SAFARI, STARTED, ENDED, new GameCompleted(
                List.of(new MatchEntry(alice, ResultType.WIN, 3, 0), new MatchEntry(bob, ResultType.LOSE, 1, 1)))));
    }

    @Test
    void 시작하면_매치와_참가자가_결과_없이_저장된다() {
        start();

        GameMatch match = matchRepository.findByMatchKey(matchKey).orElseThrow();
        assertThat(match.gameType()).isEqualTo(GameType.PAPER_SAFARI);
        assertThat(match.startedAt()).isEqualTo(STARTED);
        assertThat(match.isFinished()).isFalse();
        assertThat(participantRepository.findByMatch(match))
                .extracting(MatchParticipant::memberId, MatchParticipant::seat, MatchParticipant::result)
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple(alice, 0, null),
                        org.assertj.core.groups.Tuple.tuple(bob, 1, null));
    }

    @Test
    void 라운드가_끝나면_라운드_통계가_오른다() {
        start();

        round(1, ResultType.WIN, 2, ResultType.LOSE, 30);
        round(2, ResultType.DRAW, 5, ResultType.DRAW, 5);

        assertThat(statOf(alice).rounds().counts().wins()).isEqualTo(1);
        assertThat(statOf(alice).rounds().counts().draws()).isEqualTo(1);
        assertThat(statOf(alice).rounds().scoreSum()).isEqualTo(7);
        assertThat(statOf(bob).rounds().counts().losses()).isEqualTo(1);
        assertThat(statOf(bob).matches().total()).isZero();
    }

    @Test
    void 게임이_끝나면_참가자_결과와_판_통계가_기록된다() {
        start();
        round(1, ResultType.WIN, 2, ResultType.LOSE, 30);

        complete();

        GameMatch match = matchRepository.findByMatchKey(matchKey).orElseThrow();
        assertThat(match.endedAt()).isEqualTo(ENDED);
        assertThat(participantRepository.findByMatch(match))
                .extracting(MatchParticipant::memberId, MatchParticipant::result, MatchParticipant::tokens)
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple(alice, ResultType.WIN, 3),
                        org.assertj.core.groups.Tuple.tuple(bob, ResultType.LOSE, 1));
        assertThat(statOf(alice).matches().wins()).isEqualTo(1);
        assertThat(statOf(bob).matches().losses()).isEqualTo(1);
    }

    @Test
    void 같은_이벤트가_두_번_와도_한_번만_기록된다() {
        start();
        start();
        round(1, ResultType.WIN, 2, ResultType.LOSE, 30);
        round(1, ResultType.WIN, 2, ResultType.LOSE, 30);
        complete();
        complete();

        GameMatch match = matchRepository.findByMatchKey(matchKey).orElseThrow();
        assertThat(participantRepository.findByMatch(match)).hasSize(2);
        assertThat(statOf(alice).rounds().counts().total()).isEqualTo(1);
        assertThat(statOf(alice).matches().total()).isEqualTo(1);
    }

    @Test
    void 시작_기록_없이_끝나도_매치를_만들어_기록한다() {
        complete();

        GameMatch match = matchRepository.findByMatchKey(matchKey).orElseThrow();
        assertThat(match.isFinished()).isTrue();
        assertThat(match.startedAt()).isEqualTo(STARTED);
        assertThat(participantRepository.findByMatch(match)).hasSize(2);
        assertThat(statOf(bob).matches().losses()).isEqualTo(1);
    }

    @Test
    void 모르는_매치의_라운드는_예외_없이_무시된다() {
        assertThatCode(() -> round(1, ResultType.WIN, 2, ResultType.LOSE, 30)).doesNotThrowAnyException();

        assertThat(matchRepository.findByMatchKey(matchKey)).isEmpty();
        assertThat(statRepository.findById(new MemberGameStatId(alice, GameType.PAPER_SAFARI))).isEmpty();
    }
}
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest=RecordServiceTest`
Expected: FAIL — `cannot find symbol: class GameMatch`

- [ ] **Step 3: 매치 기록 엔티티 구현**

`backend/src/main/java/com/boardgame/record/domain/MatchPeriod.java`
```java
package com.boardgame.record.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.time.Instant;

@Embeddable
public class MatchPeriod {

    @Column(name = "started_at", nullable = false)
    private Instant startedAt;

    @Column(name = "ended_at")
    private Instant endedAt;

    protected MatchPeriod() {
    }

    private MatchPeriod(Instant startedAt, Instant endedAt) {
        this.startedAt = startedAt;
        this.endedAt = endedAt;
    }

    public static MatchPeriod startingAt(Instant startedAt) {
        return new MatchPeriod(startedAt, null);
    }

    public MatchPeriod endAt(Instant endedAt) {
        return new MatchPeriod(startedAt, endedAt);
    }

    public boolean isEnded() {
        return endedAt != null;
    }

    public Instant startedAt() {
        return startedAt;
    }

    public Instant endedAt() {
        return endedAt;
    }
}
```

`backend/src/main/java/com/boardgame/record/domain/GameMatch.java`
```java
package com.boardgame.record.domain;

import com.boardgame.game.GameType;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "game_match")
public class GameMatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "match_key", nullable = false, unique = true, length = 36)
    private String matchKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "game_type", nullable = false, length = 30)
    private GameType gameType;

    @Embedded
    private MatchPeriod period;

    protected GameMatch() {
    }

    private GameMatch(String matchKey, GameType gameType, MatchPeriod period) {
        this.matchKey = matchKey;
        this.gameType = gameType;
        this.period = period;
    }

    public static GameMatch start(String matchKey, GameType gameType, Instant startedAt) {
        return new GameMatch(matchKey, gameType, MatchPeriod.startingAt(startedAt));
    }

    public void finish(Instant endedAt) {
        period = period.endAt(endedAt);
    }

    public boolean isFinished() {
        return period.isEnded();
    }

    public Long id() {
        return id;
    }

    public String matchKey() {
        return matchKey;
    }

    public GameType gameType() {
        return gameType;
    }

    public Instant startedAt() {
        return period.startedAt();
    }

    public Instant endedAt() {
        return period.endedAt();
    }
}
```

`backend/src/main/java/com/boardgame/record/domain/GameMatchRepository.java`
```java
package com.boardgame.record.domain;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GameMatchRepository extends JpaRepository<GameMatch, Long> {

    Optional<GameMatch> findByMatchKey(String matchKey);
}
```

`backend/src/main/java/com/boardgame/record/domain/ParticipantSeat.java`
```java
package com.boardgame.record.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;

@Embeddable
public class ParticipantSeat {

    @Column(name = "member_id", nullable = false)
    private long memberId;

    @Column(name = "seat", nullable = false)
    private int seat;

    protected ParticipantSeat() {
    }

    public ParticipantSeat(long memberId, int seat) {
        this.memberId = memberId;
        this.seat = seat;
    }

    public long memberId() {
        return memberId;
    }

    public int seat() {
        return seat;
    }
}
```

`backend/src/main/java/com/boardgame/record/domain/ParticipantOutcome.java`
```java
package com.boardgame.record.domain;

import com.boardgame.game.ResultType;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

@Embeddable
public class ParticipantOutcome {

    @Enumerated(EnumType.STRING)
    @Column(name = "result", length = 10)
    private ResultType result;

    @Column(name = "tokens", nullable = false)
    private int tokens;

    protected ParticipantOutcome() {
    }

    private ParticipantOutcome(ResultType result, int tokens) {
        this.result = result;
        this.tokens = tokens;
    }

    public static ParticipantOutcome pending() {
        return new ParticipantOutcome(null, 0);
    }

    public static ParticipantOutcome of(ResultType result, int tokens) {
        return new ParticipantOutcome(result, tokens);
    }

    public ResultType result() {
        return result;
    }

    public int tokens() {
        return tokens;
    }
}
```

`backend/src/main/java/com/boardgame/record/domain/MatchParticipant.java`
```java
package com.boardgame.record.domain;

import com.boardgame.game.ResultType;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "match_participant")
public class MatchParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "match_id", nullable = false)
    private GameMatch match;

    @Embedded
    private ParticipantSeat seat;

    @Embedded
    private ParticipantOutcome outcome;

    protected MatchParticipant() {
    }

    private MatchParticipant(GameMatch match, ParticipantSeat seat, ParticipantOutcome outcome) {
        this.match = match;
        this.seat = seat;
        this.outcome = outcome;
    }

    public static MatchParticipant join(GameMatch match, long memberId, int seat) {
        return new MatchParticipant(match, new ParticipantSeat(memberId, seat), ParticipantOutcome.pending());
    }

    public void finish(ResultType result, int tokens) {
        outcome = ParticipantOutcome.of(result, tokens);
    }

    public GameMatch match() {
        return match;
    }

    public long memberId() {
        return seat.memberId();
    }

    public int seat() {
        return seat.seat();
    }

    public ResultType result() {
        return outcome.result();
    }

    public int tokens() {
        return outcome.tokens();
    }
}
```

`backend/src/main/java/com/boardgame/record/domain/MatchParticipantRepository.java`
```java
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
```

`backend/src/main/java/com/boardgame/record/domain/MatchRound.java`
```java
package com.boardgame.record.domain;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

@Entity
@Table(name = "match_round",
        uniqueConstraints = @UniqueConstraint(columnNames = {"match_id", "round_no"}))
public class MatchRound {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "match_id", nullable = false)
    private GameMatch match;

    @Column(name = "round_no", nullable = false)
    private int roundNumber;

    @Column(name = "ended_at", nullable = false)
    private Instant endedAt;

    protected MatchRound() {
    }

    private MatchRound(GameMatch match, int roundNumber, Instant endedAt) {
        this.match = match;
        this.roundNumber = roundNumber;
        this.endedAt = endedAt;
    }

    public static MatchRound of(GameMatch match, int roundNumber, Instant endedAt) {
        return new MatchRound(match, roundNumber, endedAt);
    }

    public GameMatch match() {
        return match;
    }

    public int roundNumber() {
        return roundNumber;
    }
}
```

`backend/src/main/java/com/boardgame/record/domain/MatchRoundRepository.java`
```java
package com.boardgame.record.domain;

import org.springframework.data.jpa.repository.JpaRepository;

public interface MatchRoundRepository extends JpaRepository<MatchRound, Long> {

    boolean existsByMatchAndRoundNumber(GameMatch match, int roundNumber);
}
```

`backend/src/main/java/com/boardgame/record/domain/RoundOutcomeRecord.java`
```java
package com.boardgame.record.domain;

import com.boardgame.game.ResultType;
import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

@Embeddable
public class RoundOutcomeRecord {

    @Enumerated(EnumType.STRING)
    @Column(name = "result", nullable = false, length = 10)
    private ResultType result;

    @Column(name = "score", nullable = false)
    private int score;

    protected RoundOutcomeRecord() {
    }

    public RoundOutcomeRecord(ResultType result, int score) {
        this.result = result;
        this.score = score;
    }

    public ResultType result() {
        return result;
    }

    public int score() {
        return score;
    }
}
```

`backend/src/main/java/com/boardgame/record/domain/RoundParticipant.java`
```java
package com.boardgame.record.domain;

import com.boardgame.game.ResultType;
import jakarta.persistence.Column;
import jakarta.persistence.Embedded;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "round_participant")
public class RoundParticipant {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "round_id", nullable = false)
    private MatchRound round;

    @Column(name = "member_id", nullable = false)
    private long memberId;

    @Embedded
    private RoundOutcomeRecord outcome;

    protected RoundParticipant() {
    }

    private RoundParticipant(MatchRound round, long memberId, RoundOutcomeRecord outcome) {
        this.round = round;
        this.memberId = memberId;
        this.outcome = outcome;
    }

    public static RoundParticipant of(MatchRound round, long memberId, ResultType result, int score) {
        return new RoundParticipant(round, memberId, new RoundOutcomeRecord(result, score));
    }

    public MatchRound round() {
        return round;
    }

    public long memberId() {
        return memberId;
    }

    public ResultType result() {
        return outcome.result();
    }

    public int score() {
        return outcome.score();
    }
}
```

`backend/src/main/java/com/boardgame/record/domain/RoundParticipantRepository.java`
```java
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
```

- [ ] **Step 4: 기록 서비스와 리스너 구현**

`backend/src/main/java/com/boardgame/record/application/RecordService.java`
```java
package com.boardgame.record.application;

import com.boardgame.game.GameType;
import com.boardgame.game.MatchEntry;
import com.boardgame.game.RoundCompleted;
import com.boardgame.game.RoundEntry;
import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.game.event.GameStartedEvent;
import com.boardgame.game.event.RoundCompletedEvent;
import com.boardgame.record.domain.GameMatch;
import com.boardgame.record.domain.GameMatchRepository;
import com.boardgame.record.domain.MatchParticipant;
import com.boardgame.record.domain.MatchParticipantRepository;
import com.boardgame.record.domain.MatchRound;
import com.boardgame.record.domain.MatchRoundRepository;
import com.boardgame.record.domain.MemberGameStat;
import com.boardgame.record.domain.MemberGameStatId;
import com.boardgame.record.domain.MemberGameStatRepository;
import com.boardgame.record.domain.RoundParticipant;
import com.boardgame.record.domain.RoundParticipantRepository;
import java.time.Clock;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class RecordService {

    private static final Logger log = LoggerFactory.getLogger(RecordService.class);

    private final GameMatchRepository matchRepository;
    private final MatchParticipantRepository participantRepository;
    private final MatchRoundRepository roundRepository;
    private final RoundParticipantRepository roundParticipantRepository;
    private final MemberGameStatRepository statRepository;
    private final Clock clock;

    public RecordService(GameMatchRepository matchRepository, MatchParticipantRepository participantRepository,
                         MatchRoundRepository roundRepository,
                         RoundParticipantRepository roundParticipantRepository,
                         MemberGameStatRepository statRepository, Clock clock) {
        this.matchRepository = matchRepository;
        this.participantRepository = participantRepository;
        this.roundRepository = roundRepository;
        this.roundParticipantRepository = roundParticipantRepository;
        this.statRepository = statRepository;
        this.clock = clock;
    }

    public void recordStart(GameStartedEvent event) {
        if (matchRepository.findByMatchKey(event.matchKey()).isPresent()) {
            return;
        }
        GameMatch match = matchRepository.save(GameMatch.start(event.matchKey(), event.gameType(), event.startedAt()));
        joinAll(match, event.memberIds());
    }

    public void recordRound(RoundCompletedEvent event) {
        Optional<GameMatch> found = matchRepository.findByMatchKey(event.matchKey());
        if (found.isEmpty()) {
            log.warn("시작 기록이 없는 매치의 라운드를 무시합니다: {}", event.matchKey());
            return;
        }
        GameMatch match = found.get();
        RoundCompleted round = event.round();
        if (roundRepository.existsByMatchAndRoundNumber(match, round.roundNumber())) {
            return;
        }
        MatchRound saved = roundRepository.save(MatchRound.of(match, round.roundNumber(), clock.instant()));
        round.entries().forEach(entry -> recordRoundEntry(saved, entry, event.gameType()));
    }

    public void recordCompletion(GameCompletedEvent event) {
        GameMatch match = matchRepository.findByMatchKey(event.matchKey())
                .orElseGet(() -> startFromCompletion(event));
        if (match.isFinished()) {
            return;
        }
        match.finish(event.endedAt());
        Map<Long, MatchParticipant> participants = participantRepository.findByMatch(match).stream()
                .collect(Collectors.toMap(MatchParticipant::memberId, Function.identity()));
        event.result().entries().forEach(entry -> recordMatchEntry(participants, match, entry, event.gameType()));
    }

    private GameMatch startFromCompletion(GameCompletedEvent event) {
        GameMatch match = matchRepository.save(GameMatch.start(event.matchKey(), event.gameType(), event.startedAt()));
        List<Long> memberIds = event.result().entries().stream().map(MatchEntry::memberId).toList();
        joinAll(match, memberIds);
        return match;
    }

    private void joinAll(GameMatch match, List<Long> memberIds) {
        IntStream.range(0, memberIds.size())
                .forEach(seat -> participantRepository.save(MatchParticipant.join(match, memberIds.get(seat), seat)));
    }

    private void recordRoundEntry(MatchRound round, RoundEntry entry, GameType gameType) {
        roundParticipantRepository.save(RoundParticipant.of(round, entry.memberId(), entry.result(), entry.score()));
        statOf(entry.memberId(), gameType).recordRound(entry.result(), entry.score());
    }

    private void recordMatchEntry(Map<Long, MatchParticipant> participants, GameMatch match, MatchEntry entry,
                                  GameType gameType) {
        MatchParticipant participant = participants.computeIfAbsent(entry.memberId(),
                memberId -> participantRepository.save(MatchParticipant.join(match, memberId, entry.seat())));
        participant.finish(entry.result(), entry.tokens());
        statOf(entry.memberId(), gameType).recordMatch(entry.result());
    }

    private MemberGameStat statOf(long memberId, GameType gameType) {
        return statRepository.findById(new MemberGameStatId(memberId, gameType))
                .orElseGet(() -> statRepository.save(MemberGameStat.empty(memberId, gameType)));
    }
}
```

`backend/src/main/java/com/boardgame/record/application/RecordEventListener.java`
```java
package com.boardgame.record.application;

import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.game.event.GameStartedEvent;
import com.boardgame.game.event.RoundCompletedEvent;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

@Component
public class RecordEventListener {

    private static final Logger log = LoggerFactory.getLogger(RecordEventListener.class);

    private final RecordService recordService;

    public RecordEventListener(RecordService recordService) {
        this.recordService = recordService;
    }

    @EventListener
    public void onStarted(GameStartedEvent event) {
        safely(() -> recordService.recordStart(event), event);
    }

    @EventListener
    public void onRoundCompleted(RoundCompletedEvent event) {
        safely(() -> recordService.recordRound(event), event);
    }

    @EventListener
    public void onGameCompleted(GameCompletedEvent event) {
        safely(() -> recordService.recordCompletion(event), event);
    }

    private void safely(Runnable action, Object event) {
        try {
            action.run();
        } catch (RuntimeException exception) {
            log.error("전적 기록에 실패했습니다: {}", event, exception);
        }
    }
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest=RecordServiceTest`
Expected: PASS (6 tests)

- [ ] **Step 6: 전체 회귀 확인 후 커밋**

Run: `mvn -q -f backend/pom.xml test`
Expected: PASS

```bash
git add backend
git commit -m "feat: 게임 이벤트를 받아 판·라운드 기록과 통계를 멱등하게 저장" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 전적·최근 경기·순위표 조회 API

**Files:**
- Modify: `backend/src/main/java/com/boardgame/common/error/ErrorCode.java`
- Create: `backend/src/main/java/com/boardgame/record/application/RecordQueryService.java`
- Create: `backend/src/main/java/com/boardgame/record/api/{GameStatResponse,MemberStatsResponse,MatchPlayerResponse,RoundResultResponse,RecentMatchResponse,RankingResponse,RecordController}.java`
- Test: `backend/src/test/java/com/boardgame/record/api/RecordApiTest.java`

**Interfaces:**
- Consumes: Task 1·2 엔티티/리포지토리, 계획 2 `MemberRepository.findById/findAllById`, `Member.nicknameValue()`, `LoginMember`; 계획 3 테스트 지원 `com.boardgame.support.ApiUsers`
- Produces:
  - `ErrorCode.MEMBER_NOT_FOUND`(404)
  - `GET /api/records/me` → `MemberStatsResponse(long memberId, String nickname, List<GameStatResponse> stats)` (모든 `GameType`마다 한 항목)
  - `GET /api/records/members/{memberId}` → 같은 형식, 없는 회원은 404 `MEMBER_NOT_FOUND`
  - `GET /api/records/members/{memberId}/matches?gameType=&limit=10` → `List<RecentMatchResponse>` (끝난 경기만, 최신순, limit 1~50)
  - `GET /api/records/rankings?gameType=PAPER_SAFARI` → `List<RankingResponse>`
  - `record GameStatResponse(GameType gameType, String gameTypeName, int matches, int wins, int draws, int losses, Double winRate, int rounds, int roundWins, int roundDraws, int roundLosses, Double roundWinRate, Double averageRoundScore)`
  - `record RecentMatchResponse(long matchId, GameType gameType, Instant startedAt, Instant endedAt, ResultType result, int tokens, List<MatchPlayerResponse> players, List<RoundResultResponse> rounds)`, `record MatchPlayerResponse(long memberId, String nickname, ResultType result, int tokens)`, `record RoundResultResponse(int roundNumber, ResultType result, int score)`
  - `record RankingResponse(int rank, long memberId, String nickname, int matches, int wins, int draws, int losses, double winRate)`

- [ ] **Step 1: 에러 코드 추가**

`ErrorCode.java` — `INVALID_LOGIN_ID(` 줄 바로 위에 추가:
```java
    MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "회원을 찾을 수 없습니다."),
```

- [ ] **Step 2: 실패하는 테스트 작성**

`backend/src/test/java/com/boardgame/record/api/RecordApiTest.java`
```java
package com.boardgame.record.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameType;
import com.boardgame.game.MatchEntry;
import com.boardgame.game.ResultType;
import com.boardgame.game.RoundCompleted;
import com.boardgame.game.RoundEntry;
import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.game.event.GameStartedEvent;
import com.boardgame.game.event.RoundCompletedEvent;
import com.boardgame.support.ApiUsers;
import com.boardgame.support.ApiUsers.User;
import com.jayway.jsonpath.JsonPath;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RecordApiTest {

    private static final Instant T0 = Instant.parse("2026-10-05T10:00:00Z");

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ApplicationEventPublisher events;

    // winner가 이기고 loser가 지는 한 판(라운드 1개 포함)을 기록한다. offsetMinutes로 종료 시각을 구분한다.
    private void playMatch(User winner, User loser, int offsetMinutes) {
        String key = UUID.randomUUID().toString();
        Instant started = T0.plusSeconds(offsetMinutes * 60L);
        Instant ended = started.plusSeconds(30);
        events.publishEvent(new GameStartedEvent(key, GameType.PAPER_SAFARI, List.of(winner.id(), loser.id()), started));
        events.publishEvent(new RoundCompletedEvent(key, GameType.PAPER_SAFARI, new RoundCompleted(1, List.of(
                new RoundEntry(winner.id(), ResultType.WIN, 1), new RoundEntry(loser.id(), ResultType.LOSE, 40)))));
        events.publishEvent(new GameCompletedEvent(key, GameType.PAPER_SAFARI, started, ended, new GameCompleted(List.of(
                new MatchEntry(winner.id(), ResultType.WIN, 3, 0), new MatchEntry(loser.id(), ResultType.LOSE, 0, 1)))));
    }

    @Test
    void 기록이_없으면_게임별로_0판과_null_승률을_보여준다() throws Exception {
        User user = ApiUsers.create(mockMvc);

        mockMvc.perform(get("/api/records/me").session(user.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.memberId").value(user.id()))
                .andExpect(jsonPath("$.nickname").value(user.nickname()))
                .andExpect(jsonPath("$.stats[0].gameType").value("PAPER_SAFARI"))
                .andExpect(jsonPath("$.stats[0].gameTypeName").value("페이퍼 사파리"))
                .andExpect(jsonPath("$.stats[0].matches").value(0))
                .andExpect(jsonPath("$.stats[0].winRate").isEmpty())
                .andExpect(jsonPath("$.stats[0].averageRoundScore").isEmpty());
    }

    @Test
    void 내_전적은_게임과_라운드의_승무패와_승률을_보여준다() throws Exception {
        User alice = ApiUsers.create(mockMvc);
        User bob = ApiUsers.create(mockMvc);
        playMatch(alice, bob, 0);
        playMatch(alice, bob, 1);
        playMatch(bob, alice, 2);

        mockMvc.perform(get("/api/records/me").session(alice.session()))
                .andExpect(jsonPath("$.stats[0].matches").value(3))
                .andExpect(jsonPath("$.stats[0].wins").value(2))
                .andExpect(jsonPath("$.stats[0].losses").value(1))
                .andExpect(jsonPath("$.stats[0].draws").value(0))
                .andExpect(jsonPath("$.stats[0].winRate").value(2.0 / 3))
                .andExpect(jsonPath("$.stats[0].rounds").value(3))
                .andExpect(jsonPath("$.stats[0].roundWins").value(2))
                .andExpect(jsonPath("$.stats[0].averageRoundScore").value(14.0));
    }

    @Test
    void 다른_회원의_전적을_볼_수_있고_없는_회원은_404() throws Exception {
        User alice = ApiUsers.create(mockMvc);
        User bob = ApiUsers.create(mockMvc);
        playMatch(bob, alice, 0);

        mockMvc.perform(get("/api/records/members/{id}", bob.id()).session(alice.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nickname").value(bob.nickname()))
                .andExpect(jsonPath("$.stats[0].wins").value(1));
        mockMvc.perform(get("/api/records/members/{id}", 999_999_999L).session(alice.session()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("MEMBER_NOT_FOUND"));
    }

    @Test
    void 최근_경기는_끝난_경기만_최신순으로_참가자와_라운드_결과를_보여준다() throws Exception {
        User alice = ApiUsers.create(mockMvc);
        User bob = ApiUsers.create(mockMvc);
        playMatch(alice, bob, 0);
        playMatch(bob, alice, 5);
        events.publishEvent(new GameStartedEvent(UUID.randomUUID().toString(), GameType.PAPER_SAFARI,
                List.of(alice.id(), bob.id()), T0.plusSeconds(3600)));

        mockMvc.perform(get("/api/records/members/{id}/matches", alice.id())
                        .param("gameType", "PAPER_SAFARI").param("limit", "10").session(alice.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].result").value("LOSE"))
                .andExpect(jsonPath("$[0].tokens").value(0))
                .andExpect(jsonPath("$[0].players[0].nickname").value(bob.nickname()))
                .andExpect(jsonPath("$[0].players[0].result").value("WIN"))
                .andExpect(jsonPath("$[0].players[1].nickname").value(alice.nickname()))
                .andExpect(jsonPath("$[0].rounds[0].roundNumber").value(1))
                .andExpect(jsonPath("$[0].rounds[0].result").value("LOSE"))
                .andExpect(jsonPath("$[0].rounds[0].score").value(40))
                .andExpect(jsonPath("$[1].result").value("WIN"))
                .andExpect(jsonPath("$[1].endedAt").value("2026-10-05T10:00:30Z"));

        mockMvc.perform(get("/api/records/members/{id}/matches", alice.id()).param("limit", "1")
                        .session(alice.session()))
                .andExpect(jsonPath("$.length()").value(1));
    }

    @Test
    void 순위표는_5판_이상만_승률_순으로_보여준다() throws Exception {
        User alice = ApiUsers.create(mockMvc);
        User bob = ApiUsers.create(mockMvc);
        User carol = ApiUsers.create(mockMvc);
        for (int index = 0; index < 4; index++) {
            playMatch(alice, bob, index);
        }
        playMatch(bob, alice, 10);
        for (int index = 0; index < 4; index++) {
            playMatch(carol, bob, 20 + index);
        }

        String body = mockMvc.perform(get("/api/records/rankings").param("gameType", "PAPER_SAFARI")
                        .session(alice.session()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        List<Integer> aliceRank = JsonPath.read(body, "$[?(@.memberId == %d)].rank".formatted(alice.id()));
        List<Integer> bobRank = JsonPath.read(body, "$[?(@.memberId == %d)].rank".formatted(bob.id()));
        List<Object> carolRank = JsonPath.read(body, "$[?(@.memberId == %d)]".formatted(carol.id()));
        List<Double> aliceRate = JsonPath.read(body, "$[?(@.memberId == %d)].winRate".formatted(alice.id()));
        org.assertj.core.api.Assertions.assertThat(aliceRank).hasSize(1);
        org.assertj.core.api.Assertions.assertThat(bobRank).hasSize(1);
        org.assertj.core.api.Assertions.assertThat(aliceRank.get(0)).isLessThan(bobRank.get(0));
        org.assertj.core.api.Assertions.assertThat(aliceRate.get(0)).isEqualTo(0.8);
        org.assertj.core.api.Assertions.assertThat(carolRank).isEmpty();
    }

    @Test
    void 실제_방에서_기권으로_끝난_게임도_전적에_반영된다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String created = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"전적 방\", \"gameType\": \"PAPER_SAFARI\"}"))
                .andReturn().getResponse().getContentAsString();
        String code = JsonPath.read(created, "$.code");
        mockMvc.perform(post("/api/rooms/{code}/join", code).session(guest.session()));
        mockMvc.perform(post("/api/rooms/{code}/start", code).session(host.session()));

        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(guest.session()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/records/me").session(host.session()))
                .andExpect(jsonPath("$.stats[0].wins").value(1));
        mockMvc.perform(get("/api/records/me").session(guest.session()))
                .andExpect(jsonPath("$.stats[0].losses").value(1));
        mockMvc.perform(post("/api/rooms/{code}/leave", code).session(host.session()));
    }

    @Test
    void 로그인하지_않으면_401() throws Exception {
        mockMvc.perform(get("/api/records/me"))
                .andExpect(status().isUnauthorized());
    }
}
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest=RecordApiTest`
Expected: FAIL — 404 `NOT_FOUND`(경로 없음) 등으로 단언 실패

- [ ] **Step 4: 응답 DTO 구현**

`backend/src/main/java/com/boardgame/record/api/GameStatResponse.java`
```java
package com.boardgame.record.api;

import com.boardgame.game.GameType;
import com.boardgame.record.domain.MemberGameStat;
import com.boardgame.record.domain.ResultCounts;
import com.boardgame.record.domain.RoundRecord;

public record GameStatResponse(GameType gameType, String gameTypeName, int matches, int wins, int draws, int losses,
                               Double winRate, int rounds, int roundWins, int roundDraws, int roundLosses,
                               Double roundWinRate, Double averageRoundScore) {

    public static GameStatResponse from(MemberGameStat stat) {
        GameType gameType = stat.gameType();
        ResultCounts matches = stat.matches();
        RoundRecord rounds = stat.rounds();
        ResultCounts roundCounts = rounds.counts();
        return new GameStatResponse(gameType, gameType.displayName(), matches.total(), matches.wins(),
                matches.draws(), matches.losses(), matches.winRate(), roundCounts.total(), roundCounts.wins(),
                roundCounts.draws(), roundCounts.losses(), rounds.winRate(), rounds.averageScore());
    }
}
```

`backend/src/main/java/com/boardgame/record/api/MemberStatsResponse.java`
```java
package com.boardgame.record.api;

import java.util.List;

public record MemberStatsResponse(long memberId, String nickname, List<GameStatResponse> stats) {
}
```

`backend/src/main/java/com/boardgame/record/api/MatchPlayerResponse.java`
```java
package com.boardgame.record.api;

import com.boardgame.game.ResultType;

public record MatchPlayerResponse(long memberId, String nickname, ResultType result, int tokens) {
}
```

`backend/src/main/java/com/boardgame/record/api/RoundResultResponse.java`
```java
package com.boardgame.record.api;

import com.boardgame.game.ResultType;

public record RoundResultResponse(int roundNumber, ResultType result, int score) {
}
```

`backend/src/main/java/com/boardgame/record/api/RecentMatchResponse.java`
```java
package com.boardgame.record.api;

import com.boardgame.game.GameType;
import com.boardgame.game.ResultType;
import java.time.Instant;
import java.util.List;

public record RecentMatchResponse(long matchId, GameType gameType, Instant startedAt, Instant endedAt,
                                  ResultType result, int tokens, List<MatchPlayerResponse> players,
                                  List<RoundResultResponse> rounds) {
}
```

`backend/src/main/java/com/boardgame/record/api/RankingResponse.java`
```java
package com.boardgame.record.api;

public record RankingResponse(int rank, long memberId, String nickname, int matches, int wins, int draws,
                              int losses, double winRate) {
}
```

- [ ] **Step 5: 조회 서비스와 컨트롤러 구현**

`backend/src/main/java/com/boardgame/record/application/RecordQueryService.java`
```java
package com.boardgame.record.application;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameType;
import com.boardgame.member.domain.Member;
import com.boardgame.member.domain.MemberRepository;
import com.boardgame.record.api.GameStatResponse;
import com.boardgame.record.api.MatchPlayerResponse;
import com.boardgame.record.api.MemberStatsResponse;
import com.boardgame.record.api.RankingResponse;
import com.boardgame.record.api.RecentMatchResponse;
import com.boardgame.record.api.RoundResultResponse;
import com.boardgame.record.domain.GameMatch;
import com.boardgame.record.domain.MatchParticipant;
import com.boardgame.record.domain.MatchParticipantRepository;
import com.boardgame.record.domain.MemberGameStat;
import com.boardgame.record.domain.MemberGameStatRepository;
import com.boardgame.record.domain.ResultCounts;
import com.boardgame.record.domain.RoundParticipant;
import com.boardgame.record.domain.RoundParticipantRepository;
import java.util.Arrays;
import java.util.Collection;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class RecordQueryService {

    private static final int MIN_LIMIT = 1;
    private static final int MAX_LIMIT = 50;
    private static final String UNKNOWN_NICKNAME = "알 수 없음";

    private final MemberRepository memberRepository;
    private final MemberGameStatRepository statRepository;
    private final MatchParticipantRepository participantRepository;
    private final RoundParticipantRepository roundParticipantRepository;

    public RecordQueryService(MemberRepository memberRepository, MemberGameStatRepository statRepository,
                              MatchParticipantRepository participantRepository,
                              RoundParticipantRepository roundParticipantRepository) {
        this.memberRepository = memberRepository;
        this.statRepository = statRepository;
        this.participantRepository = participantRepository;
        this.roundParticipantRepository = roundParticipantRepository;
    }

    public MemberStatsResponse memberStats(long memberId) {
        Member member = memberRepository.findById(memberId)
                .orElseThrow(() -> new BusinessException(ErrorCode.MEMBER_NOT_FOUND));
        Map<GameType, MemberGameStat> stats = statRepository.findByIdMemberId(memberId).stream()
                .collect(Collectors.toMap(MemberGameStat::gameType, Function.identity()));
        List<GameStatResponse> responses = Arrays.stream(GameType.values())
                .map(type -> GameStatResponse.from(stats.getOrDefault(type, MemberGameStat.empty(memberId, type))))
                .toList();
        return new MemberStatsResponse(memberId, member.nicknameValue(), responses);
    }

    public List<RecentMatchResponse> recentMatches(long memberId, GameType gameType, int limit) {
        int size = Math.clamp(limit, MIN_LIMIT, MAX_LIMIT);
        List<MatchParticipant> mine = participantRepository.findFinishedByMember(memberId, gameType,
                PageRequest.of(0, size));
        if (mine.isEmpty()) {
            return List.of();
        }
        List<GameMatch> matches = mine.stream().map(MatchParticipant::match).toList();
        Map<Long, List<MatchParticipant>> players = participantRepository.findByMatchInOrderBySeatSeatAsc(matches)
                .stream()
                .collect(Collectors.groupingBy(participant -> participant.match().id()));
        Map<Long, List<RoundParticipant>> rounds = roundParticipantRepository.findByMemberAndMatches(memberId, matches)
                .stream()
                .collect(Collectors.groupingBy(round -> round.round().match().id()));
        Map<Long, String> nicknames = nicknames(players.values().stream().flatMap(List::stream)
                .map(MatchParticipant::memberId).collect(Collectors.toSet()));
        return mine.stream()
                .map(participant -> recentMatch(participant, players, rounds, nicknames))
                .toList();
    }

    public List<RankingResponse> rankings(GameType gameType) {
        List<MemberGameStat> ranked = statRepository.findByIdGameType(gameType).stream()
                .filter(MemberGameStat::isRanked)
                .sorted(Comparator.comparing((MemberGameStat stat) -> stat.matches().winRate()).reversed()
                        .thenComparing(stat -> stat.matches().total(), Comparator.reverseOrder())
                        .thenComparing(MemberGameStat::memberId))
                .toList();
        Map<Long, String> nicknames = nicknames(ranked.stream().map(MemberGameStat::memberId).toList());
        return IntStream.range(0, ranked.size())
                .mapToObj(index -> ranking(index + 1, ranked.get(index), nicknames))
                .toList();
    }

    private RecentMatchResponse recentMatch(MatchParticipant mine, Map<Long, List<MatchParticipant>> players,
                                            Map<Long, List<RoundParticipant>> rounds, Map<Long, String> nicknames) {
        GameMatch match = mine.match();
        List<MatchPlayerResponse> playerResponses = players.getOrDefault(match.id(), List.of()).stream()
                .map(player -> new MatchPlayerResponse(player.memberId(), nicknameOf(nicknames, player.memberId()),
                        player.result(), player.tokens()))
                .toList();
        List<RoundResultResponse> roundResponses = rounds.getOrDefault(match.id(), List.of()).stream()
                .map(round -> new RoundResultResponse(round.round().roundNumber(), round.result(), round.score()))
                .toList();
        return new RecentMatchResponse(match.id(), match.gameType(), match.startedAt(), match.endedAt(),
                mine.result(), mine.tokens(), playerResponses, roundResponses);
    }

    private RankingResponse ranking(int rank, MemberGameStat stat, Map<Long, String> nicknames) {
        ResultCounts matches = stat.matches();
        return new RankingResponse(rank, stat.memberId(), nicknameOf(nicknames, stat.memberId()), matches.total(),
                matches.wins(), matches.draws(), matches.losses(), matches.winRate());
    }

    private Map<Long, String> nicknames(Collection<Long> memberIds) {
        return memberRepository.findAllById(memberIds).stream()
                .collect(Collectors.toMap(Member::id, Member::nicknameValue));
    }

    private String nicknameOf(Map<Long, String> nicknames, long memberId) {
        return nicknames.getOrDefault(memberId, UNKNOWN_NICKNAME);
    }
}
```

`backend/src/main/java/com/boardgame/record/api/RecordController.java`
```java
package com.boardgame.record.api;

import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameType;
import com.boardgame.record.application.RecordQueryService;
import java.util.List;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/records")
public class RecordController {

    private final RecordQueryService queryService;

    public RecordController(RecordQueryService queryService) {
        this.queryService = queryService;
    }

    @GetMapping("/me")
    public MemberStatsResponse me(@AuthenticationPrincipal LoginMember member) {
        return queryService.memberStats(member.id());
    }

    @GetMapping("/members/{memberId}")
    public MemberStatsResponse member(@PathVariable long memberId) {
        return queryService.memberStats(memberId);
    }

    @GetMapping("/members/{memberId}/matches")
    public List<RecentMatchResponse> recentMatches(@PathVariable long memberId,
                                                   @RequestParam(required = false) GameType gameType,
                                                   @RequestParam(defaultValue = "10") int limit) {
        return queryService.recentMatches(memberId, gameType, limit);
    }

    @GetMapping("/rankings")
    public List<RankingResponse> rankings(@RequestParam GameType gameType) {
        return queryService.rankings(gameType);
    }
}
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest=RecordApiTest`
Expected: PASS (7 tests)

- [ ] **Step 7: 전체 회귀 확인 후 커밋**

Run: `mvn -q -f backend/pom.xml test`
Expected: PASS

```bash
git add backend
git commit -m "feat: 내 전적·회원 전적·최근 경기·순위표 조회 API" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## 계획 4 완료 기준

- `mvn -q -f backend/pom.xml test` 전체 통과
- 스펙 §6.2~6.4와 §7-5의 데이터가 API로 제공되고, 실제 방 진행(기권 포함)이 전적에 반영됨이 테스트로 검증됨
