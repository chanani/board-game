# 계획 1: 백엔드 기반 + 페이퍼 사파리 규칙 엔진 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Spring Boot 백엔드 골격과 공통 예외 체계를 만들고, 프레임워크에 의존하지 않는 페이퍼 사파리 규칙 엔진(라운드·게임·특수 카드·기권·플레이어별 뷰)을 TDD로 완성한다.

**Architecture:** `backend/` 단일 Maven 프로젝트. `com.boardgame.common.error`에 `ErrorCode`/`BusinessException`, `com.boardgame.papersafari`에 순수 도메인(값 객체·일급 컬렉션·애그리거트 `PaperSafariGame`), `com.boardgame.papersafari.view`에 플레이어 시점 뷰 레코드. 셔플은 `CardShuffler` 인터페이스로 주입해 테스트에서 덱 순서를 고정한다.

**Tech Stack:** Java 21, Spring Boot 3.5.16, Maven 3.9, JUnit 5, AssertJ

**Spec:** `docs/superpowers/specs/2026-10-05-board-game-platform-design.md` (이 계획은 §3, §4, §5.3, §5.5의 도메인 부분, §8의 ErrorCode/BusinessException을 구현)

### 전체 로드맵 (이 문서는 계획 1)
1. **백엔드 기반 + 페이퍼 사파리 규칙 엔진** ← 이 문서
2. 회원/인증 + 전역 예외 처리(`@RestControllerAdvice`, 통일 에러 응답)
3. 방(대기실) + `GameEngine` 추상화 + STOMP 실시간 진행 + 끊김/기권
4. 전적(게임/라운드 승·무·패) + 승률 + 순위표
5. 프론트엔드(React/Vite/Tailwind) + Docker Compose

각 계획은 이전 계획 완료 후 별도 문서로 작성한다.

## Global Constraints

- Java 21, Spring Boot **3.5.16**, Maven. 기본 패키지 `com.boardgame`. 모든 명령은 저장소 루트에서 `mvn -q -f backend/pom.xml ...`로 실행.
- 객체지향 생활 체조(CLAUDE.md): 메서드당 들여쓰기 1단계, `else` 금지(early return), 도메인 원시값은 VO로 래핑, 한 줄에 점 하나(스트림/Optional 플루언트 체인은 예외), 컬렉션은 일급 컬렉션, 로직은 도메인 엔티티에, 클래스 상태 필드 3개 이하.
- 예외: 규칙 위반은 `BusinessException(ErrorCode)`(RuntimeException 상속). 테스트 픽스처용 팩토리의 프로그래머 오류만 `IllegalArgumentException`.
- `view` 패키지의 레코드는 JSON 전송용 DTO이므로 원시값(`int`, `long`) 사용을 허용한다.
- 덱: 0~9 각 4장, 코끼리(10) 4, 타잔(10) 4, 여우(-2) 4, 와일드 2 = **54장**. 판은 3열×2행, 같은 열 위·아래가 한 쌍.
- 테스트 메서드명은 한국어 문장(`void 라운드_승자는_토큰을_하나_받는다()`).
- 커밋 메시지 마지막 줄: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Review Focus

1. 라운드가 끝난 뒤(다음 라운드 시작 전) 누군가 행동을 보냄 → `INVALID_PHASE`로 거부되고 상태 불변 (Task 6 테스트)
2. 덱이 비었고 버린 더미에 맨 위 1장뿐인 상태에서 덱 뽑기 → `DECK_EXHAUSTED` (Task 4 테스트)
3. 준비 단계에서 아직 안 뒤집은 사람이 나감 → 나머지가 모두 뒤집었다면 즉시 진행 시작 (Task 6 테스트)
4. 엿보기 단계에서 이미 앞면인 칸 선택 → `NOT_FACE_DOWN` (Task 7 테스트)
5. 참가자가 아닌 사람의 행동/기권 → `NOT_A_PLAYER`, 차례가 아닌 사람의 행동 → `NOT_YOUR_TURN` (Task 6, Task 8 테스트)

---

## File Structure

```
.gitignore
backend/pom.xml
backend/src/main/java/com/boardgame/BoardGameApplication.java
backend/src/main/java/com/boardgame/common/error/ErrorCode.java
backend/src/main/java/com/boardgame/common/error/BusinessException.java
backend/src/main/java/com/boardgame/papersafari/
  CardKind.java  CardValue.java  Card.java  Score.java  ColumnScore.java  StandardDeck.java
  Position.java  Visibility.java  Slot.java  Board.java
  CardShuffler.java  RandomCardShuffler.java  Deck.java  DiscardPile.java  Table.java
  PlayerId.java  Seats.java  TokenCount.java  Tokens.java  RoundOutcome.java  RoundResult.java
  DrawSource.java  DrawnCard.java  TurnPhase.java  Step.java  Turn.java
  KnownCards.java  PlayerBoards.java  PaperSafariRound.java
  RoundNumber.java  RoundFactory.java  RoundSequence.java  GameStatus.java  PaperSafariGame.java
backend/src/main/java/com/boardgame/papersafari/view/
  CardView.java  SlotView.java  BoardView.java  HeldView.java  RoundView.java
  PlayerResultView.java  RoundResultView.java  PaperSafariView.java
backend/src/test/java/com/boardgame/
  BoardGameApplicationTests.java
  common/error/BusinessExceptionTest.java  common/error/ErrorAssertions.java
  papersafari/StackedShuffler.java  papersafari/Fixtures.java  papersafari/GameFixtures.java
  papersafari/CardTest.java  papersafari/ColumnScoreTest.java  papersafari/BoardTest.java
  papersafari/TableTest.java  papersafari/SeatsTest.java  papersafari/TokensTest.java
  papersafari/RoundResultTest.java  papersafari/DrawnCardTest.java
  papersafari/PaperSafariRoundTest.java  papersafari/SpecialCardTest.java
  papersafari/PaperSafariGameTest.java  papersafari/PaperSafariViewTest.java
```

---

### Task 1: 백엔드 골격 + 공통 예외

**Files:**
- Create: `.gitignore`, `backend/pom.xml`, `backend/src/main/java/com/boardgame/BoardGameApplication.java`
- Create: `backend/src/main/java/com/boardgame/common/error/ErrorCode.java`, `BusinessException.java`
- Test: `backend/src/test/java/com/boardgame/BoardGameApplicationTests.java`, `backend/src/test/java/com/boardgame/common/error/BusinessExceptionTest.java`, `ErrorAssertions.java`

**Interfaces:**
- Produces: `ErrorCode`(enum: `status()`→`HttpStatus`, `code()`→`String`, `message()`→`String`), `BusinessException(ErrorCode)` + `errorCode()`, 테스트 헬퍼 `ErrorAssertions.assertError(ThrowingCallable, ErrorCode)`

- [ ] **Step 1: 빌드 설정 작성**

`.gitignore`
```
backend/target/
frontend/node_modules/
frontend/dist/
.idea/
*.iml
.DS_Store
```

`backend/pom.xml`
```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.5.16</version>
        <relativePath/>
    </parent>

    <groupId>com.boardgame</groupId>
    <artifactId>board-game</artifactId>
    <version>0.0.1-SNAPSHOT</version>
    <name>board-game</name>

    <properties>
        <java.version>21</java.version>
    </properties>

    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>

    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
            </plugin>
        </plugins>
    </build>
</project>
```

- [ ] **Step 2: 실패하는 테스트 작성**

`backend/src/test/java/com/boardgame/BoardGameApplicationTests.java`
```java
package com.boardgame;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest
class BoardGameApplicationTests {

    @Test
    void 애플리케이션_컨텍스트가_뜬다() {
    }
}
```

`backend/src/test/java/com/boardgame/common/error/ErrorAssertions.java`
```java
package com.boardgame.common.error;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.assertj.core.api.ThrowableAssert.ThrowingCallable;

public final class ErrorAssertions {

    private ErrorAssertions() {
    }

    public static void assertError(ThrowingCallable action, ErrorCode expected) {
        assertThatThrownBy(action).isInstanceOfSatisfying(BusinessException.class,
                exception -> assertThat(exception.errorCode()).isEqualTo(expected));
    }
}
```

`backend/src/test/java/com/boardgame/common/error/BusinessExceptionTest.java`
```java
package com.boardgame.common.error;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class BusinessExceptionTest {

    @Test
    void 에러_코드의_메시지를_예외_메시지로_쓴다() {
        BusinessException exception = new BusinessException(ErrorCode.NOT_YOUR_TURN);

        assertThat(exception).isInstanceOf(RuntimeException.class)
                .hasMessage("지금은 당신의 차례가 아닙니다.");
        assertThat(exception.errorCode()).isEqualTo(ErrorCode.NOT_YOUR_TURN);
    }

    @Test
    void 에러_코드는_HTTP_상태와_코드_문자열을_가진다() {
        assertThat(ErrorCode.NOT_YOUR_TURN.status()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(ErrorCode.NOT_YOUR_TURN.code()).isEqualTo("NOT_YOUR_TURN");
        assertThat(ErrorCode.INTERNAL_ERROR.status()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `mvn -q -f backend/pom.xml test`
Expected: FAIL — 컴파일 에러 `cannot find symbol: class BusinessException` (및 `BoardGameApplication` 없음)

- [ ] **Step 4: 구현**

`backend/src/main/java/com/boardgame/BoardGameApplication.java`
```java
package com.boardgame;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BoardGameApplication {

    public static void main(String[] args) {
        SpringApplication.run(BoardGameApplication.class, args);
    }
}
```

`backend/src/main/java/com/boardgame/common/error/ErrorCode.java`
```java
package com.boardgame.common.error;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "입력값이 올바르지 않습니다."),
    INTERNAL_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요."),

    INVALID_PLAYER_COUNT(HttpStatus.BAD_REQUEST, "페이퍼 사파리는 2~5명이 플레이할 수 있습니다."),
    NOT_A_PLAYER(HttpStatus.FORBIDDEN, "이 게임의 참가자가 아닙니다."),
    NOT_YOUR_TURN(HttpStatus.CONFLICT, "지금은 당신의 차례가 아닙니다."),
    INVALID_PHASE(HttpStatus.CONFLICT, "지금은 할 수 없는 행동입니다."),
    INVALID_POSITION(HttpStatus.BAD_REQUEST, "잘못된 카드 위치입니다."),
    ALREADY_FLIPPED(HttpStatus.CONFLICT, "이미 카드를 한 장 뒤집었습니다."),
    NOT_FACE_DOWN(HttpStatus.BAD_REQUEST, "뒷면인 카드만 선택할 수 있습니다."),
    MUST_SWAP_DISCARD_CARD(HttpStatus.BAD_REQUEST, "버린 카드 더미에서 가져온 카드는 반드시 교체해야 합니다."),
    MUST_SWAP_TARZAN(HttpStatus.BAD_REQUEST, "타잔 카드는 반드시 교체해야 합니다."),
    EMPTY_DISCARD_PILE(HttpStatus.CONFLICT, "버린 카드 더미가 비어 있습니다."),
    DECK_EXHAUSTED(HttpStatus.CONFLICT, "더 이상 뽑을 카드가 없습니다."),
    ROUND_NOT_OVER(HttpStatus.CONFLICT, "라운드가 아직 끝나지 않았습니다."),
    GAME_ALREADY_OVER(HttpStatus.CONFLICT, "이미 끝난 게임입니다.");

    private final HttpStatus status;
    private final String message;

    ErrorCode(HttpStatus status, String message) {
        this.status = status;
        this.message = message;
    }

    public HttpStatus status() {
        return status;
    }

    public String code() {
        return name();
    }

    public String message() {
        return message;
    }
}
```

`backend/src/main/java/com/boardgame/common/error/BusinessException.java`
```java
package com.boardgame.common.error;

public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.message());
        this.errorCode = errorCode;
    }

    public ErrorCode errorCode() {
        return errorCode;
    }
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `mvn -q -f backend/pom.xml test`
Expected: PASS (`Tests run: 3, Failures: 0, Errors: 0`)

- [ ] **Step 6: 커밋**

```bash
git add .gitignore backend
git commit -m "feat: 백엔드 골격과 공통 예외(ErrorCode, BusinessException) 추가" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 카드, 표준 덱, 열 점수

**Files:**
- Create: `backend/src/main/java/com/boardgame/papersafari/{CardKind,CardValue,Card,Score,ColumnScore,StandardDeck}.java`
- Test: `backend/src/test/java/com/boardgame/papersafari/CardTest.java`, `ColumnScoreTest.java`

**Interfaces:**
- Produces:
  - `enum CardKind { NUMBER, ELEPHANT, TARZAN, FOX, WILD }`
  - `record CardValue(int value)` — 상수 `ZERO`, `TEN`, `MINUS_TWO`
  - `record Card(CardKind kind, CardValue value)` — `static number(int 0..9)`, `elephant()`, `tarzan()`, `fox()`, `wild()`, `boolean is(CardKind)`, `boolean matches(Card)`, `Score score()`, `int faceValue()`
  - `record Score(int value) implements Comparable<Score>` — `ZERO`, `Score plus(Score)`
  - `final class ColumnScore` (package-private) — `static Score of(Card top, Card bottom)`
  - `final class StandardDeck` — `static List<Card> cards()` (54장)

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/src/test/java/com/boardgame/papersafari/CardTest.java`
```java
package com.boardgame.papersafari;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class CardTest {

    @Test
    void 표준_덱은_54장이다() {
        List<Card> cards = StandardDeck.cards();

        assertThat(cards).hasSize(54);
        assertThat(countOf(cards, CardKind.NUMBER)).isEqualTo(40);
        assertThat(countOf(cards, CardKind.ELEPHANT)).isEqualTo(4);
        assertThat(countOf(cards, CardKind.TARZAN)).isEqualTo(4);
        assertThat(countOf(cards, CardKind.FOX)).isEqualTo(4);
        assertThat(countOf(cards, CardKind.WILD)).isEqualTo(2);
    }

    @Test
    void 숫자_카드는_0부터_9까지_각_4장이다() {
        List<Card> cards = StandardDeck.cards();

        IntStream.rangeClosed(0, 9).forEach(value ->
                assertThat(cards.stream().filter(card -> card.equals(Card.number(value))).count()).isEqualTo(4));
    }

    @Test
    void 특수_카드의_값() {
        assertThat(Card.elephant().faceValue()).isEqualTo(10);
        assertThat(Card.tarzan().faceValue()).isEqualTo(10);
        assertThat(Card.fox().faceValue()).isEqualTo(-2);
        assertThat(Card.fox().score()).isEqualTo(new Score(-2));
    }

    @Test
    void 코끼리와_타잔은_같은_숫자로_본다() {
        assertThat(Card.elephant().matches(Card.tarzan())).isTrue();
        assertThat(Card.number(7).matches(Card.number(7))).isTrue();
        assertThat(Card.number(7).matches(Card.number(8))).isFalse();
    }

    @Test
    void 숫자_카드는_0에서_9_사이만_만들_수_있다() {
        assertThatThrownBy(() -> Card.number(10)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> Card.number(-1)).isInstanceOf(IllegalArgumentException.class);
    }

    private long countOf(List<Card> cards, CardKind kind) {
        return cards.stream().filter(card -> card.is(kind)).count();
    }
}
```

`backend/src/test/java/com/boardgame/papersafari/ColumnScoreTest.java`
```java
package com.boardgame.papersafari;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class ColumnScoreTest {

    @Test
    void 다른_숫자면_두_값을_더한다() {
        assertThat(ColumnScore.of(Card.number(3), Card.number(5))).isEqualTo(new Score(8));
        assertThat(ColumnScore.of(Card.fox(), Card.number(4))).isEqualTo(new Score(2));
        assertThat(ColumnScore.of(Card.elephant(), Card.number(9))).isEqualTo(new Score(19));
    }

    @Test
    void 같은_숫자면_0점이다() {
        assertThat(ColumnScore.of(Card.number(7), Card.number(7))).isEqualTo(Score.ZERO);
        assertThat(ColumnScore.of(Card.elephant(), Card.tarzan())).isEqualTo(Score.ZERO);
    }

    @Test
    void 여우_두_장도_같은_숫자라_0점이다() {
        assertThat(ColumnScore.of(Card.fox(), Card.fox())).isEqualTo(Score.ZERO);
    }

    @Test
    void 와일드가_하나라도_있으면_0점이다() {
        assertThat(ColumnScore.of(Card.wild(), Card.number(9))).isEqualTo(Score.ZERO);
        assertThat(ColumnScore.of(Card.number(9), Card.wild())).isEqualTo(Score.ZERO);
        assertThat(ColumnScore.of(Card.wild(), Card.wild())).isEqualTo(Score.ZERO);
    }
}
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest='CardTest,ColumnScoreTest'`
Expected: FAIL — `cannot find symbol: class Card`

- [ ] **Step 3: 구현**

`CardKind.java`
```java
package com.boardgame.papersafari;

public enum CardKind {
    NUMBER, ELEPHANT, TARZAN, FOX, WILD
}
```

`CardValue.java`
```java
package com.boardgame.papersafari;

public record CardValue(int value) {

    public static final CardValue ZERO = new CardValue(0);
    public static final CardValue TEN = new CardValue(10);
    public static final CardValue MINUS_TWO = new CardValue(-2);
}
```

`Score.java`
```java
package com.boardgame.papersafari;

public record Score(int value) implements Comparable<Score> {

    public static final Score ZERO = new Score(0);

    public Score plus(Score other) {
        return new Score(value + other.value);
    }

    @Override
    public int compareTo(Score other) {
        return Integer.compare(value, other.value);
    }
}
```

`Card.java`
```java
package com.boardgame.papersafari;

public record Card(CardKind kind, CardValue value) {

    private static final int MIN_NUMBER = 0;
    private static final int MAX_NUMBER = 9;

    public static Card number(int value) {
        if (value < MIN_NUMBER || value > MAX_NUMBER) {
            throw new IllegalArgumentException("숫자 카드는 0~9만 가능합니다: " + value);
        }
        return new Card(CardKind.NUMBER, new CardValue(value));
    }

    public static Card elephant() {
        return new Card(CardKind.ELEPHANT, CardValue.TEN);
    }

    public static Card tarzan() {
        return new Card(CardKind.TARZAN, CardValue.TEN);
    }

    public static Card fox() {
        return new Card(CardKind.FOX, CardValue.MINUS_TWO);
    }

    public static Card wild() {
        return new Card(CardKind.WILD, CardValue.ZERO);
    }

    public boolean is(CardKind other) {
        return kind == other;
    }

    public boolean matches(Card other) {
        return value.equals(other.value);
    }

    public Score score() {
        return new Score(value.value());
    }

    public int faceValue() {
        return value.value();
    }
}
```

`ColumnScore.java`
```java
package com.boardgame.papersafari;

final class ColumnScore {

    private ColumnScore() {
    }

    static Score of(Card top, Card bottom) {
        if (top.is(CardKind.WILD) || bottom.is(CardKind.WILD)) {
            return Score.ZERO;
        }
        if (top.matches(bottom)) {
            return Score.ZERO;
        }
        return top.score().plus(bottom.score());
    }
}
```

`StandardDeck.java`
```java
package com.boardgame.papersafari;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.IntStream;

public final class StandardDeck {

    private static final int COPIES = 4;
    private static final int WILD_COPIES = 2;

    private StandardDeck() {
    }

    public static List<Card> cards() {
        List<Card> cards = new ArrayList<>();
        IntStream.rangeClosed(0, 9).forEach(value -> addCopies(cards, Card.number(value), COPIES));
        addCopies(cards, Card.elephant(), COPIES);
        addCopies(cards, Card.tarzan(), COPIES);
        addCopies(cards, Card.fox(), COPIES);
        addCopies(cards, Card.wild(), WILD_COPIES);
        return cards;
    }

    private static void addCopies(List<Card> cards, Card card, int copies) {
        cards.addAll(Collections.nCopies(copies, card));
    }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest='CardTest,ColumnScoreTest'`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add backend
git commit -m "feat: 페이퍼 사파리 카드, 54장 표준 덱, 열 점수 규칙" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 위치, 칸, 판(Board)

**Files:**
- Create: `backend/src/main/java/com/boardgame/papersafari/{Position,Visibility,Slot,Board}.java`
- Test: `backend/src/test/java/com/boardgame/papersafari/BoardTest.java`

**Interfaces:**
- Consumes: `Card`, `Score`, `ColumnScore`, `BusinessException`, `ErrorCode.INVALID_POSITION`
- Produces:
  - `record Position(int column, int row)` — 범위 밖이면 `INVALID_POSITION`; `static top(int)`, `bottom(int)`, `static List<Position> all()`(행 우선: (0,0),(1,0),(2,0),(0,1),(1,1),(2,1)), `static IntStream columns()`
  - `enum Visibility { FACE_UP, FACE_DOWN }`
  - `record Slot(Card card, Visibility visibility)` — `faceDown(Card)`, `faceUp(Card)`, `reveal()`, `isFaceUp()`
  - `class Board` — `SIZE = 6`, `static deal(List<Card>)`, `reveal(Position)`, `revealAll()`, `Card replace(Position, Card)`(이전 카드 반환, 새 카드 앞면), `Slot slotAt(Position)`, `Card cardAt(Position)`, `isFaceDown(Position)`, `hasFaceUp()`, `hasFaceDown()`, `allFaceUp()`, `Score score()`

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/src/test/java/com/boardgame/papersafari/BoardTest.java`
```java
package com.boardgame.papersafari;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import java.util.List;
import org.junit.jupiter.api.Test;

class BoardTest {

    private final List<Card> hand = List.of(
            Card.number(3), Card.number(7), Card.fox(),
            Card.number(5), Card.number(7), Card.fox());

    @Test
    void 위치는_행_우선_순서로_6칸이다() {
        assertThat(Position.all()).containsExactly(
                new Position(0, 0), new Position(1, 0), new Position(2, 0),
                new Position(0, 1), new Position(1, 1), new Position(2, 1));
    }

    @Test
    void 판_밖의_위치는_만들_수_없다() {
        assertError(() -> new Position(3, 0), ErrorCode.INVALID_POSITION);
        assertError(() -> new Position(0, 2), ErrorCode.INVALID_POSITION);
        assertError(() -> new Position(-1, 0), ErrorCode.INVALID_POSITION);
    }

    @Test
    void 받은_카드는_윗줄부터_뒷면으로_놓인다() {
        Board board = Board.deal(hand);

        assertThat(board.cardAt(Position.top(0))).isEqualTo(Card.number(3));
        assertThat(board.cardAt(Position.bottom(0))).isEqualTo(Card.number(5));
        assertThat(board.hasFaceUp()).isFalse();
        assertThat(board.isFaceDown(Position.top(0))).isTrue();
    }

    @Test
    void 뒤집으면_앞면이_된다() {
        Board board = Board.deal(hand);

        board.reveal(Position.top(1));

        assertThat(board.isFaceDown(Position.top(1))).isFalse();
        assertThat(board.hasFaceUp()).isTrue();
    }

    @Test
    void 교체하면_이전_카드를_돌려주고_새_카드는_앞면이다() {
        Board board = Board.deal(hand);

        Card previous = board.replace(Position.bottom(2), Card.number(0));

        assertThat(previous).isEqualTo(Card.fox());
        assertThat(board.cardAt(Position.bottom(2))).isEqualTo(Card.number(0));
        assertThat(board.isFaceDown(Position.bottom(2))).isFalse();
    }

    @Test
    void 모두_뒤집으면_전부_공개_상태다() {
        Board board = Board.deal(hand);

        board.revealAll();

        assertThat(board.allFaceUp()).isTrue();
        assertThat(board.hasFaceDown()).isFalse();
    }

    @Test
    void 판_점수는_세_열_점수의_합이다() {
        Board board = Board.deal(hand);

        assertThat(board.score()).isEqualTo(new Score(8));
    }
}
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest=BoardTest`
Expected: FAIL — `cannot find symbol: class Board`

- [ ] **Step 3: 구현**

`Position.java`
```java
package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.List;
import java.util.stream.IntStream;

public record Position(int column, int row) {

    public static final int COLUMNS = 3;
    public static final int ROWS = 2;
    private static final int TOP = 0;
    private static final int BOTTOM = 1;

    public Position {
        if (column < 0 || column >= COLUMNS || row < 0 || row >= ROWS) {
            throw new BusinessException(ErrorCode.INVALID_POSITION);
        }
    }

    public static Position top(int column) {
        return new Position(column, TOP);
    }

    public static Position bottom(int column) {
        return new Position(column, BOTTOM);
    }

    public static List<Position> all() {
        return IntStream.range(0, ROWS).boxed()
                .flatMap(row -> IntStream.range(0, COLUMNS).mapToObj(column -> new Position(column, row)))
                .toList();
    }

    public static IntStream columns() {
        return IntStream.range(0, COLUMNS);
    }
}
```

`Visibility.java`
```java
package com.boardgame.papersafari;

public enum Visibility {
    FACE_UP, FACE_DOWN
}
```

`Slot.java`
```java
package com.boardgame.papersafari;

public record Slot(Card card, Visibility visibility) {

    public static Slot faceDown(Card card) {
        return new Slot(card, Visibility.FACE_DOWN);
    }

    public static Slot faceUp(Card card) {
        return new Slot(card, Visibility.FACE_UP);
    }

    public Slot reveal() {
        return faceUp(card);
    }

    public boolean isFaceUp() {
        return visibility == Visibility.FACE_UP;
    }
}
```

`Board.java`
```java
package com.boardgame.papersafari;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

public class Board {

    public static final int SIZE = 6;

    private final Map<Position, Slot> slots;

    private Board(Map<Position, Slot> slots) {
        this.slots = slots;
    }

    public static Board deal(List<Card> cards) {
        if (cards.size() != SIZE) {
            throw new IllegalArgumentException("판에는 카드 6장이 필요합니다: " + cards.size());
        }
        List<Position> positions = Position.all();
        Map<Position, Slot> slots = new LinkedHashMap<>();
        IntStream.range(0, SIZE).forEach(index -> slots.put(positions.get(index), Slot.faceDown(cards.get(index))));
        return new Board(slots);
    }

    public void reveal(Position position) {
        slots.put(position, slotAt(position).reveal());
    }

    public void revealAll() {
        Position.all().forEach(this::reveal);
    }

    public Card replace(Position position, Card card) {
        Card previous = cardAt(position);
        slots.put(position, Slot.faceUp(card));
        return previous;
    }

    public Slot slotAt(Position position) {
        return slots.get(position);
    }

    public Card cardAt(Position position) {
        return slotAt(position).card();
    }

    public boolean isFaceDown(Position position) {
        return !slotAt(position).isFaceUp();
    }

    public boolean hasFaceUp() {
        return slots.values().stream().anyMatch(Slot::isFaceUp);
    }

    public boolean hasFaceDown() {
        return slots.values().stream().anyMatch(slot -> !slot.isFaceUp());
    }

    public boolean allFaceUp() {
        return !hasFaceDown();
    }

    public Score score() {
        return Position.columns().mapToObj(this::columnScore).reduce(Score.ZERO, Score::plus);
    }

    private Score columnScore(int column) {
        return ColumnScore.of(cardAt(Position.top(column)), cardAt(Position.bottom(column)));
    }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest=BoardTest`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add backend
git commit -m "feat: 카드 위치, 칸, 3x2 판과 판 점수 계산" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 덱, 버린 더미, 테이블(덱 재활용)

**Files:**
- Create: `backend/src/main/java/com/boardgame/papersafari/{CardShuffler,RandomCardShuffler,Deck,DiscardPile,Table}.java`
- Test: `backend/src/test/java/com/boardgame/papersafari/StackedShuffler.java`(테스트 픽스처), `TableTest.java`

**Interfaces:**
- Consumes: `Card`, `StandardDeck.cards()`, `Board.SIZE`, `ErrorCode.DECK_EXHAUSTED`, `ErrorCode.EMPTY_DISCARD_PILE`
- Produces:
  - `interface CardShuffler { List<Card> shuffle(List<Card> cards); }`, `class RandomCardShuffler implements CardShuffler`
  - `class Deck` — `static of(List<Card>)`(리스트 첫 원소가 맨 위), `Card draw()`, `List<Card> drawMany(int)`, `isEmpty()`, `int size()`, `refill(List<Card>)`
  - `class DiscardPile` — `place(Card)`, `Card takeTop()`, `Optional<Card> top()`, `List<Card> takeAllButTop()`
  - `class Table` — `static setUp(CardShuffler)`, `List<Card> dealHand()`, `openDiscard()`, `Card drawFromDeck()`(비었으면 재활용), `Card drawFromDiscard()`, `discard(Card)`, `int deckSize()`, `Optional<Card> discardTop()`
  - 테스트: `StackedShuffler.of(List<Card>)`, `StackedShuffler.rounds(List<List<Card>>)` — 호출마다 준비된 순서를 하나씩 반환, 다 쓰면 입력을 그대로 반환

- [ ] **Step 1: 테스트 픽스처와 실패하는 테스트 작성**

`backend/src/test/java/com/boardgame/papersafari/StackedShuffler.java`
```java
package com.boardgame.papersafari;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;

final class StackedShuffler implements CardShuffler {

    private final Deque<List<Card>> stacks;

    private StackedShuffler(List<List<Card>> stacks) {
        this.stacks = new ArrayDeque<>(stacks);
    }

    static StackedShuffler of(List<Card> stack) {
        return new StackedShuffler(List.of(stack));
    }

    static StackedShuffler rounds(List<List<Card>> stacks) {
        return new StackedShuffler(stacks);
    }

    @Override
    public List<Card> shuffle(List<Card> cards) {
        if (stacks.isEmpty()) {
            return new ArrayList<>(cards);
        }
        return new ArrayList<>(stacks.poll());
    }
}
```

`backend/src/test/java/com/boardgame/papersafari/TableTest.java`
```java
package com.boardgame.papersafari;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class TableTest {

    private Table tableOf(Card... cards) {
        return Table.setUp(StackedShuffler.of(List.of(cards)));
    }

    @Test
    void 셔플된_순서의_맨_앞부터_뽑는다() {
        Table table = tableOf(Card.number(1), Card.number(2), Card.number(3));

        assertThat(table.drawFromDeck()).isEqualTo(Card.number(1));
        assertThat(table.deckSize()).isEqualTo(2);
    }

    @Test
    void 패는_6장씩_나눠준다() {
        Table table = tableOf(Card.number(1), Card.number(2), Card.number(3),
                Card.number(4), Card.number(5), Card.number(6), Card.number(7));

        assertThat(table.dealHand()).containsExactly(Card.number(1), Card.number(2), Card.number(3),
                Card.number(4), Card.number(5), Card.number(6));
        assertThat(table.deckSize()).isEqualTo(1);
    }

    @Test
    void 버린_더미를_열면_덱_맨_위_카드가_공개된다() {
        Table table = tableOf(Card.number(1), Card.number(2));

        table.openDiscard();

        assertThat(table.discardTop()).contains(Card.number(1));
        assertThat(table.deckSize()).isEqualTo(1);
    }

    @Test
    void 버린_더미에서_가져오면_맨_위가_빠지고_비면_가져올_수_없다() {
        Table table = tableOf(Card.number(1));
        table.openDiscard();

        assertThat(table.drawFromDiscard()).isEqualTo(Card.number(1));
        assertThat(table.discardTop()).isEmpty();
        assertError(table::drawFromDiscard, ErrorCode.EMPTY_DISCARD_PILE);
    }

    @Test
    void 덱이_비면_버린_더미의_맨_위만_남기고_섞어서_다시_쓴다() {
        Table table = tableOf(Card.number(1), Card.number(2));
        table.openDiscard();
        table.discard(Card.number(3));
        table.discard(Card.number(4));
        assertThat(table.drawFromDeck()).isEqualTo(Card.number(2));

        Card recycled = table.drawFromDeck();

        assertThat(recycled).isEqualTo(Card.number(3));
        assertThat(table.discardTop()).contains(Card.number(4));
        assertThat(table.deckSize()).isEqualTo(1);
    }

    @Test
    void 덱이_비고_버린_더미에_한_장뿐이면_더_뽑을_수_없다() {
        Table table = tableOf(Card.number(1));
        table.openDiscard();

        assertError(table::drawFromDeck, ErrorCode.DECK_EXHAUSTED);
    }

    @Test
    void 무작위_셔플은_같은_카드_구성을_유지하고_원본을_바꾸지_않는다() {
        List<Card> original = StandardDeck.cards();
        List<Card> snapshot = new ArrayList<>(original);

        List<Card> shuffled = new RandomCardShuffler().shuffle(original);

        assertThat(shuffled).containsExactlyInAnyOrderElementsOf(snapshot);
        assertThat(original).containsExactlyElementsOf(snapshot);
    }
}
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest=TableTest`
Expected: FAIL — `cannot find symbol: class CardShuffler`

- [ ] **Step 3: 구현**

`CardShuffler.java`
```java
package com.boardgame.papersafari;

import java.util.List;

public interface CardShuffler {

    List<Card> shuffle(List<Card> cards);
}
```

`RandomCardShuffler.java`
```java
package com.boardgame.papersafari;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public class RandomCardShuffler implements CardShuffler {

    @Override
    public List<Card> shuffle(List<Card> cards) {
        List<Card> copy = new ArrayList<>(cards);
        Collections.shuffle(copy);
        return copy;
    }
}
```

`Deck.java`
```java
package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.List;
import java.util.stream.IntStream;

public class Deck {

    private final Deque<Card> cards;

    private Deck(List<Card> cards) {
        this.cards = new ArrayDeque<>(cards);
    }

    public static Deck of(List<Card> cards) {
        return new Deck(cards);
    }

    public Card draw() {
        if (cards.isEmpty()) {
            throw new BusinessException(ErrorCode.DECK_EXHAUSTED);
        }
        return cards.pop();
    }

    public List<Card> drawMany(int count) {
        return IntStream.range(0, count).mapToObj(index -> draw()).toList();
    }

    public void refill(List<Card> newCards) {
        cards.addAll(newCards);
    }

    public boolean isEmpty() {
        return cards.isEmpty();
    }

    public int size() {
        return cards.size();
    }
}
```

`DiscardPile.java`
```java
package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.Optional;

public class DiscardPile {

    private final Deque<Card> cards = new ArrayDeque<>();

    public void place(Card card) {
        cards.push(card);
    }

    public Card takeTop() {
        if (cards.isEmpty()) {
            throw new BusinessException(ErrorCode.EMPTY_DISCARD_PILE);
        }
        return cards.pop();
    }

    public Optional<Card> top() {
        return Optional.ofNullable(cards.peek());
    }

    public List<Card> takeAllButTop() {
        if (cards.size() <= 1) {
            return List.of();
        }
        Card top = cards.pop();
        List<Card> rest = new ArrayList<>(cards);
        cards.clear();
        cards.push(top);
        return rest;
    }
}
```

`Table.java`
```java
package com.boardgame.papersafari;

import java.util.List;
import java.util.Optional;

public class Table {

    private final Deck deck;
    private final DiscardPile discardPile;
    private final CardShuffler shuffler;

    private Table(Deck deck, DiscardPile discardPile, CardShuffler shuffler) {
        this.deck = deck;
        this.discardPile = discardPile;
        this.shuffler = shuffler;
    }

    public static Table setUp(CardShuffler shuffler) {
        Deck deck = Deck.of(shuffler.shuffle(StandardDeck.cards()));
        return new Table(deck, new DiscardPile(), shuffler);
    }

    public List<Card> dealHand() {
        return deck.drawMany(Board.SIZE);
    }

    public void openDiscard() {
        discardPile.place(deck.draw());
    }

    public Card drawFromDeck() {
        refillIfEmpty();
        return deck.draw();
    }

    public Card drawFromDiscard() {
        return discardPile.takeTop();
    }

    public void discard(Card card) {
        discardPile.place(card);
    }

    public int deckSize() {
        return deck.size();
    }

    public Optional<Card> discardTop() {
        return discardPile.top();
    }

    private void refillIfEmpty() {
        if (!deck.isEmpty()) {
            return;
        }
        deck.refill(shuffler.shuffle(discardPile.takeAllButTop()));
    }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest=TableTest`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add backend
git commit -m "feat: 덱, 버린 카드 더미, 덱 재활용을 담당하는 테이블" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 좌석, 토큰, 라운드 결과

**Files:**
- Create: `backend/src/main/java/com/boardgame/papersafari/{PlayerId,Seats,TokenCount,Tokens,RoundOutcome,RoundResult}.java`
- Test: `backend/src/test/java/com/boardgame/papersafari/SeatsTest.java`, `TokensTest.java`, `RoundResultTest.java`

**Interfaces:**
- Consumes: `Score`, `ErrorCode.INVALID_PLAYER_COUNT`, `ErrorCode.NOT_A_PLAYER`
- Produces:
  - `record PlayerId(long value)`
  - `class Seats` — `MIN_PLAYERS=2`, `MAX_PLAYERS=5`, `static of(List<PlayerId>)`, `PlayerId next(PlayerId)`, `PlayerId leftOf(PlayerId)`(= next), `PlayerId at(int)`(모듈러), `requireSeated(PlayerId)`, `remove(PlayerId)`, `Optional<PlayerId> soleSurvivor()`, `List<PlayerId> asList()`
  - `record TokenCount(int value)` — `ZERO`, `next()`, `hasReached(TokenCount)`
  - `class Tokens` — `static forPlayers(Seats)`, `award(PlayerId)`, `TokenCount countOf(PlayerId)`, `Optional<PlayerId> champion()`(3개 이상), `Map<Long,Integer> toView()`
  - `enum RoundOutcome { WIN, DRAW, LOSE }`
  - `class RoundResult` — `static of(Map<PlayerId, Score>)`, `Optional<PlayerId> winner()`, `boolean isDraw()`, `RoundOutcome outcomeOf(PlayerId)`, `Score scoreOf(PlayerId)`

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/src/test/java/com/boardgame/papersafari/SeatsTest.java`
```java
package com.boardgame.papersafari;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import java.util.List;
import java.util.stream.LongStream;
import org.junit.jupiter.api.Test;

class SeatsTest {

    private final PlayerId a = new PlayerId(1L);
    private final PlayerId b = new PlayerId(2L);
    private final PlayerId c = new PlayerId(3L);

    @Test
    void 인원은_2명부터_5명까지다() {
        assertError(() -> Seats.of(List.of(a)), ErrorCode.INVALID_PLAYER_COUNT);
        assertError(() -> Seats.of(players(6)), ErrorCode.INVALID_PLAYER_COUNT);
        assertThat(Seats.of(players(5)).asList()).hasSize(5);
    }

    @Test
    void 다음_사람과_왼쪽_사람은_좌석_순서의_다음이고_끝에서_처음으로_돈다() {
        Seats seats = Seats.of(List.of(a, b, c));

        assertThat(seats.next(a)).isEqualTo(b);
        assertThat(seats.leftOf(b)).isEqualTo(c);
        assertThat(seats.next(c)).isEqualTo(a);
        assertThat(seats.at(4)).isEqualTo(b);
    }

    @Test
    void 빠진_사람은_순서에서_제외된다() {
        Seats seats = Seats.of(List.of(a, b, c));

        seats.remove(b);

        assertThat(seats.next(a)).isEqualTo(c);
        assertThat(seats.soleSurvivor()).isEmpty();
    }

    @Test
    void 한_명만_남으면_그_사람이_유일한_생존자다() {
        Seats seats = Seats.of(List.of(a, b));

        seats.remove(a);

        assertThat(seats.soleSurvivor()).contains(b);
    }

    @Test
    void 좌석에_없는_사람은_NOT_A_PLAYER() {
        Seats seats = Seats.of(List.of(a, b));

        assertError(() -> seats.requireSeated(c), ErrorCode.NOT_A_PLAYER);
        assertError(() -> seats.remove(c), ErrorCode.NOT_A_PLAYER);
    }

    private List<PlayerId> players(int count) {
        return LongStream.rangeClosed(1, count).mapToObj(PlayerId::new).toList();
    }
}
```

`backend/src/test/java/com/boardgame/papersafari/TokensTest.java`
```java
package com.boardgame.papersafari;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class TokensTest {

    private final PlayerId a = new PlayerId(1L);
    private final PlayerId b = new PlayerId(2L);

    @Test
    void 토큰을_받으면_하나씩_늘어난다() {
        Tokens tokens = Tokens.forPlayers(Seats.of(List.of(a, b)));

        tokens.award(a);
        tokens.award(a);

        assertThat(tokens.countOf(a)).isEqualTo(new TokenCount(2));
        assertThat(tokens.countOf(b)).isEqualTo(TokenCount.ZERO);
        assertThat(tokens.champion()).isEmpty();
    }

    @Test
    void 토큰_3개를_모으면_챔피언이다() {
        Tokens tokens = Tokens.forPlayers(Seats.of(List.of(a, b)));

        tokens.award(b);
        tokens.award(b);
        tokens.award(b);

        assertThat(tokens.champion()).contains(b);
        assertThat(tokens.toView()).isEqualTo(Map.of(1L, 0, 2L, 3));
    }
}
```

`backend/src/test/java/com/boardgame/papersafari/RoundResultTest.java`
```java
package com.boardgame.papersafari;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class RoundResultTest {

    private final PlayerId a = new PlayerId(1L);
    private final PlayerId b = new PlayerId(2L);
    private final PlayerId c = new PlayerId(3L);

    @Test
    void 최저점_단독이면_그_사람이_라운드_승자다() {
        RoundResult result = RoundResult.of(scores(5, 12, 8));

        assertThat(result.winner()).contains(a);
        assertThat(result.isDraw()).isFalse();
        assertThat(result.outcomeOf(a)).isEqualTo(RoundOutcome.WIN);
        assertThat(result.outcomeOf(b)).isEqualTo(RoundOutcome.LOSE);
        assertThat(result.scoreOf(c)).isEqualTo(new Score(8));
    }

    @Test
    void 최저점이_같으면_무승부이고_동점자는_무_나머지는_패다() {
        RoundResult result = RoundResult.of(scores(4, 4, 9));

        assertThat(result.winner()).isEmpty();
        assertThat(result.isDraw()).isTrue();
        assertThat(result.outcomeOf(a)).isEqualTo(RoundOutcome.DRAW);
        assertThat(result.outcomeOf(b)).isEqualTo(RoundOutcome.DRAW);
        assertThat(result.outcomeOf(c)).isEqualTo(RoundOutcome.LOSE);
    }

    @Test
    void 음수_점수도_비교된다() {
        RoundResult result = RoundResult.of(scores(-2, 0, 1));

        assertThat(result.winner()).contains(a);
    }

    private Map<PlayerId, Score> scores(int first, int second, int third) {
        Map<PlayerId, Score> scores = new LinkedHashMap<>();
        scores.put(a, new Score(first));
        scores.put(b, new Score(second));
        scores.put(c, new Score(third));
        return scores;
    }
}
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest='SeatsTest,TokensTest,RoundResultTest'`
Expected: FAIL — `cannot find symbol: class PlayerId`

- [ ] **Step 3: 구현**

`PlayerId.java`
```java
package com.boardgame.papersafari;

public record PlayerId(long value) {
}
```

`Seats.java`
```java
package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;

public class Seats {

    public static final int MIN_PLAYERS = 2;
    public static final int MAX_PLAYERS = 5;

    private final List<PlayerId> players;

    private Seats(List<PlayerId> players) {
        this.players = players;
    }

    public static Seats of(List<PlayerId> players) {
        if (players.size() < MIN_PLAYERS || players.size() > MAX_PLAYERS) {
            throw new BusinessException(ErrorCode.INVALID_PLAYER_COUNT);
        }
        if (new HashSet<>(players).size() != players.size()) {
            throw new IllegalArgumentException("중복된 플레이어가 있습니다.");
        }
        return new Seats(new ArrayList<>(players));
    }

    public PlayerId next(PlayerId player) {
        return at(indexOf(player) + 1);
    }

    public PlayerId leftOf(PlayerId player) {
        return next(player);
    }

    public PlayerId at(int index) {
        return players.get(Math.floorMod(index, players.size()));
    }

    public void requireSeated(PlayerId player) {
        indexOf(player);
    }

    public void remove(PlayerId player) {
        players.remove(indexOf(player));
    }

    public Optional<PlayerId> soleSurvivor() {
        if (players.size() != 1) {
            return Optional.empty();
        }
        return Optional.of(players.get(0));
    }

    public List<PlayerId> asList() {
        return List.copyOf(players);
    }

    private int indexOf(PlayerId player) {
        int index = players.indexOf(player);
        if (index < 0) {
            throw new BusinessException(ErrorCode.NOT_A_PLAYER);
        }
        return index;
    }
}
```

`TokenCount.java`
```java
package com.boardgame.papersafari;

public record TokenCount(int value) {

    public static final TokenCount ZERO = new TokenCount(0);

    public TokenCount next() {
        return new TokenCount(value + 1);
    }

    public boolean hasReached(TokenCount goal) {
        return value >= goal.value;
    }
}
```

`Tokens.java`
```java
package com.boardgame.papersafari;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Optional;

public class Tokens {

    private static final TokenCount WINNING_COUNT = new TokenCount(3);

    private final Map<PlayerId, TokenCount> counts;

    private Tokens(Map<PlayerId, TokenCount> counts) {
        this.counts = counts;
    }

    public static Tokens forPlayers(Seats seats) {
        Map<PlayerId, TokenCount> counts = new LinkedHashMap<>();
        seats.asList().forEach(player -> counts.put(player, TokenCount.ZERO));
        return new Tokens(counts);
    }

    public void award(PlayerId player) {
        counts.computeIfPresent(player, (key, count) -> count.next());
    }

    public TokenCount countOf(PlayerId player) {
        return counts.getOrDefault(player, TokenCount.ZERO);
    }

    public Optional<PlayerId> champion() {
        return counts.entrySet().stream()
                .filter(entry -> entry.getValue().hasReached(WINNING_COUNT))
                .map(Map.Entry::getKey)
                .findFirst();
    }

    public Map<Long, Integer> toView() {
        Map<Long, Integer> view = new LinkedHashMap<>();
        counts.forEach((player, count) -> view.put(player.value(), count.value()));
        return view;
    }
}
```

`RoundOutcome.java`
```java
package com.boardgame.papersafari;

public enum RoundOutcome {
    WIN, DRAW, LOSE
}
```

`RoundResult.java`
```java
package com.boardgame.papersafari;

import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

public class RoundResult {

    private final Map<PlayerId, Score> scores;

    private RoundResult(Map<PlayerId, Score> scores) {
        this.scores = scores;
    }

    public static RoundResult of(Map<PlayerId, Score> scores) {
        return new RoundResult(new LinkedHashMap<>(scores));
    }

    public Optional<PlayerId> winner() {
        List<PlayerId> lowest = lowestPlayers();
        if (lowest.size() != 1) {
            return Optional.empty();
        }
        return Optional.of(lowest.get(0));
    }

    public boolean isDraw() {
        return winner().isEmpty();
    }

    public RoundOutcome outcomeOf(PlayerId player) {
        if (!lowestPlayers().contains(player)) {
            return RoundOutcome.LOSE;
        }
        if (isDraw()) {
            return RoundOutcome.DRAW;
        }
        return RoundOutcome.WIN;
    }

    public Score scoreOf(PlayerId player) {
        return scores.get(player);
    }

    private List<PlayerId> lowestPlayers() {
        Score lowest = Collections.min(scores.values());
        return scores.entrySet().stream()
                .filter(entry -> entry.getValue().equals(lowest))
                .map(Map.Entry::getKey)
                .toList();
    }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest='SeatsTest,TokensTest,RoundResultTest'`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add backend
git commit -m "feat: 좌석 순서, 승리 토큰, 라운드 승/무/패 판정" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 라운드 진행(준비·뽑기·교체·버리기·즉시 종료·이탈)

**Files:**
- Create: `backend/src/main/java/com/boardgame/papersafari/{DrawSource,DrawnCard,TurnPhase,Step,Turn,KnownCards,PlayerBoards,PaperSafariRound}.java`
- Test: `backend/src/test/java/com/boardgame/papersafari/Fixtures.java`, `DrawnCardTest.java`, `PaperSafariRoundTest.java`

**Interfaces:**
- Consumes: `Table`, `Board`, `Seats`, `RoundResult`, `Position`, `Card`, `StackedShuffler`(테스트)
- Produces:
  - `enum DrawSource { DECK, DISCARD }`
  - `record DrawnCard(Card card, DrawSource source)` — `fromDeck()`, `triggersTarzan()`, `triggersElephant()`, `validateDiscardable()`
  - `enum TurnPhase { SETUP_FLIP, DRAW, PLACE, PEEK, ROUND_OVER }` + `isPlaying()`
  - `record Step(TurnPhase phase, DrawnCard drawn)` (package-private)
  - `class Turn` — `static setUp(Seats, PlayerId starter)`, `requirePhase(TurnPhase)`, `require(PlayerId, TurnPhase)`, `beginPlaying()`, `hold(DrawnCard)`, `DrawnCard drawn()`, `awaitPeek()`, `passToNext()`, `finishRound()`, `isRoundOver()`, `isSettingUp()`, `PlayerId leftOf(PlayerId)`, `PlayerId current()`, `TurnPhase phase()`, `Optional<DrawnCard> leave(PlayerId)`
  - `class KnownCards` — `remember`, `forget`, `knows(PlayerId, Position)`
  - `class PlayerBoards` — `static deal(Seats, Table)`, `flipInitial`, `everyoneFlipped()`, `Card replace(PlayerId, Position, Card)`, `peek(PlayerId, Position)`, `knows`, `hasFaceDown(PlayerId)`, `anyAllFaceUp()`, `revealAll()`, `Map<PlayerId, Score> scores()`, `remove(PlayerId)`, `Board boardOf(PlayerId)`
  - `class PaperSafariRound` — `static start(Seats, PlayerId starter, CardShuffler)`, `flipInitial`, `drawFromDeck`, `drawFromDiscard`, `swapAt`, `discardDrawn`, `leave`, `isOver()`, `RoundResult result()`, `TurnPhase phase()`, `PlayerId currentPlayer()`, `Board boardOf(PlayerId)`, `Optional<Card> discardTop()`, `int deckSize()`
  - 테스트 `Fixtures`: `ALICE(1)`, `BOB(2)`, `CAROL(3)`, `FIRST=(0,0)`, `REST`(나머지 5칸, 행 우선), `WINNER_HAND=[1,2,3,4,5,6]`, `LOSER_HAND=[9,9,9,8,8,8]`, `numbers(int...)`, `zeros(int)`, `stack(List<List<Card>> hands, Card discardTop, List<Card> deck)`, `round(List<PlayerId>, List<Card>)`(첫 플레이어가 시작), `flipFirst(round, players)`

- [ ] **Step 1: 테스트 픽스처와 실패하는 테스트 작성**

`backend/src/test/java/com/boardgame/papersafari/Fixtures.java`
```java
package com.boardgame.papersafari;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

final class Fixtures {

    static final PlayerId ALICE = new PlayerId(1L);
    static final PlayerId BOB = new PlayerId(2L);
    static final PlayerId CAROL = new PlayerId(3L);

    static final Position FIRST = new Position(0, 0);
    static final List<Position> REST = List.of(
            new Position(1, 0), new Position(2, 0),
            new Position(0, 1), new Position(1, 1), new Position(2, 1));

    // 열 쌍: (1,4) (2,5) (3,6)
    static final List<Card> WINNER_HAND = numbers(1, 2, 3, 4, 5, 6);
    // 열 쌍: (9,8) (9,8) (9,8) → 51점
    static final List<Card> LOSER_HAND = numbers(9, 9, 9, 8, 8, 8);

    private Fixtures() {
    }

    static List<Card> numbers(int... values) {
        return Arrays.stream(values).mapToObj(Card::number).toList();
    }

    static List<Card> zeros(int count) {
        return Collections.nCopies(count, Card.number(0));
    }

    static List<Card> stack(List<List<Card>> hands, Card discardTop, List<Card> deck) {
        List<Card> cards = new ArrayList<>();
        hands.forEach(cards::addAll);
        cards.add(discardTop);
        cards.addAll(deck);
        return cards;
    }

    static PaperSafariRound round(List<PlayerId> players, List<Card> stacked) {
        return PaperSafariRound.start(Seats.of(players), players.get(0), StackedShuffler.of(stacked));
    }

    static void flipFirst(PaperSafariRound round, List<PlayerId> players) {
        players.forEach(player -> round.flipInitial(player, FIRST));
    }
}
```

`backend/src/test/java/com/boardgame/papersafari/DrawnCardTest.java`
```java
package com.boardgame.papersafari;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import org.junit.jupiter.api.Test;

class DrawnCardTest {

    @Test
    void 특수_효과는_덱에서_뽑았을_때만_발동한다() {
        assertThat(new DrawnCard(Card.tarzan(), DrawSource.DECK).triggersTarzan()).isTrue();
        assertThat(new DrawnCard(Card.tarzan(), DrawSource.DISCARD).triggersTarzan()).isFalse();
        assertThat(new DrawnCard(Card.elephant(), DrawSource.DECK).triggersElephant()).isTrue();
        assertThat(new DrawnCard(Card.elephant(), DrawSource.DISCARD).triggersElephant()).isFalse();
    }

    @Test
    void 버린_더미에서_가져온_카드와_덱의_타잔은_버릴_수_없다() {
        assertError(() -> new DrawnCard(Card.number(3), DrawSource.DISCARD).validateDiscardable(),
                ErrorCode.MUST_SWAP_DISCARD_CARD);
        assertError(() -> new DrawnCard(Card.tarzan(), DrawSource.DECK).validateDiscardable(),
                ErrorCode.MUST_SWAP_TARZAN);
    }

    @Test
    void 덱에서_뽑은_일반_카드와_코끼리는_버릴_수_있다() {
        new DrawnCard(Card.number(3), DrawSource.DECK).validateDiscardable();
        new DrawnCard(Card.elephant(), DrawSource.DECK).validateDiscardable();
    }
}
```

`backend/src/test/java/com/boardgame/papersafari/PaperSafariRoundTest.java`
```java
package com.boardgame.papersafari;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static com.boardgame.papersafari.Fixtures.ALICE;
import static com.boardgame.papersafari.Fixtures.BOB;
import static com.boardgame.papersafari.Fixtures.CAROL;
import static com.boardgame.papersafari.Fixtures.FIRST;
import static com.boardgame.papersafari.Fixtures.LOSER_HAND;
import static com.boardgame.papersafari.Fixtures.REST;
import static com.boardgame.papersafari.Fixtures.WINNER_HAND;
import static com.boardgame.papersafari.Fixtures.flipFirst;
import static com.boardgame.papersafari.Fixtures.round;
import static com.boardgame.papersafari.Fixtures.stack;
import static com.boardgame.papersafari.Fixtures.zeros;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import java.util.List;
import org.junit.jupiter.api.Test;

class PaperSafariRoundTest {

    private static final List<PlayerId> TWO = List.of(ALICE, BOB);
    private static final List<PlayerId> THREE = List.of(ALICE, BOB, CAROL);

    private PaperSafariRound newRound(List<Card> deck) {
        return round(TWO, stack(List.of(WINNER_HAND, LOSER_HAND), Card.number(7), deck));
    }

    private PaperSafariRound startedRound(List<Card> deck) {
        PaperSafariRound round = newRound(deck);
        flipFirst(round, TWO);
        return round;
    }

    private void aliceRevealsAll(PaperSafariRound round) {
        for (Position position : REST) {
            round.drawFromDeck(ALICE);
            round.swapAt(ALICE, position);
            if (round.isOver()) {
                return;
            }
            round.drawFromDeck(BOB);
            round.discardDrawn(BOB);
        }
    }

    @Test
    void 시작하면_각자_6장을_뒷면으로_받고_버린_더미_한_장을_공개한다() {
        PaperSafariRound round = newRound(zeros(3));

        Board alice = round.boardOf(ALICE);
        assertThat(alice.cardAt(new Position(0, 0))).isEqualTo(Card.number(1));
        assertThat(alice.cardAt(new Position(0, 1))).isEqualTo(Card.number(4));
        assertThat(alice.hasFaceUp()).isFalse();
        assertThat(round.boardOf(BOB).cardAt(new Position(0, 0))).isEqualTo(Card.number(9));
        assertThat(round.discardTop()).contains(Card.number(7));
        assertThat(round.deckSize()).isEqualTo(3);
        assertThat(round.phase()).isEqualTo(TurnPhase.SETUP_FLIP);
    }

    @Test
    void 모두_한_장씩_뒤집으면_시작_플레이어부터_진행한다() {
        PaperSafariRound round = newRound(zeros(3));

        round.flipInitial(ALICE, FIRST);
        assertThat(round.phase()).isEqualTo(TurnPhase.SETUP_FLIP);
        round.flipInitial(BOB, new Position(2, 1));

        assertThat(round.phase()).isEqualTo(TurnPhase.DRAW);
        assertThat(round.currentPlayer()).isEqualTo(ALICE);
        assertThat(round.boardOf(BOB).isFaceDown(new Position(2, 1))).isFalse();
    }

    @Test
    void 준비_단계에서_두_장을_뒤집을_수_없다() {
        PaperSafariRound round = newRound(zeros(3));
        round.flipInitial(ALICE, FIRST);

        assertError(() -> round.flipInitial(ALICE, new Position(1, 0)), ErrorCode.ALREADY_FLIPPED);
    }

    @Test
    void 준비_단계에서는_카드를_뽑을_수_없다() {
        PaperSafariRound round = newRound(zeros(3));

        assertError(() -> round.drawFromDeck(ALICE), ErrorCode.INVALID_PHASE);
    }

    @Test
    void 참가자가_아니면_뒤집을_수_없다() {
        PaperSafariRound round = newRound(zeros(3));

        assertError(() -> round.flipInitial(CAROL, FIRST), ErrorCode.NOT_A_PLAYER);
    }

    @Test
    void 자기_차례가_아니면_뽑을_수_없다() {
        PaperSafariRound round = startedRound(zeros(1));

        assertError(() -> round.drawFromDeck(BOB), ErrorCode.NOT_YOUR_TURN);
        assertError(() -> round.drawFromDeck(CAROL), ErrorCode.NOT_YOUR_TURN);
    }

    @Test
    void 뽑기_전에는_교체할_수_없다() {
        PaperSafariRound round = startedRound(zeros(1));

        assertError(() -> round.swapAt(ALICE, FIRST), ErrorCode.INVALID_PHASE);
    }

    @Test
    void 덱에서_뽑아_교체하면_새_카드는_앞면이_되고_원래_카드는_버린_더미로_간다() {
        PaperSafariRound round = startedRound(zeros(1));

        round.drawFromDeck(ALICE);
        round.swapAt(ALICE, new Position(1, 1));

        Board alice = round.boardOf(ALICE);
        assertThat(alice.cardAt(new Position(1, 1))).isEqualTo(Card.number(0));
        assertThat(alice.isFaceDown(new Position(1, 1))).isFalse();
        assertThat(round.discardTop()).contains(Card.number(5));
        assertThat(round.currentPlayer()).isEqualTo(BOB);
        assertThat(round.phase()).isEqualTo(TurnPhase.DRAW);
    }

    @Test
    void 덱에서_뽑은_카드는_그대로_버릴_수_있다() {
        PaperSafariRound round = startedRound(zeros(1));

        round.drawFromDeck(ALICE);
        round.discardDrawn(ALICE);

        assertThat(round.discardTop()).contains(Card.number(0));
        assertThat(round.boardOf(ALICE).isFaceDown(new Position(1, 1))).isTrue();
        assertThat(round.currentPlayer()).isEqualTo(BOB);
    }

    @Test
    void 버린_더미에서_가져온_카드는_버릴_수_없고_상태도_그대로다() {
        PaperSafariRound round = startedRound(zeros(1));

        round.drawFromDiscard(ALICE);

        assertError(() -> round.discardDrawn(ALICE), ErrorCode.MUST_SWAP_DISCARD_CARD);
        assertThat(round.phase()).isEqualTo(TurnPhase.PLACE);
        assertThat(round.currentPlayer()).isEqualTo(ALICE);
    }

    @Test
    void 버린_더미에서_가져와_교체할_수_있다() {
        PaperSafariRound round = startedRound(zeros(1));

        round.drawFromDiscard(ALICE);
        round.swapAt(ALICE, new Position(2, 0));

        assertThat(round.boardOf(ALICE).cardAt(new Position(2, 0))).isEqualTo(Card.number(7));
        assertThat(round.discardTop()).contains(Card.number(3));
    }

    @Test
    void 누군가_6장을_모두_공개하면_즉시_라운드가_끝나고_모든_카드가_공개된다() {
        PaperSafariRound round = startedRound(zeros(9));

        aliceRevealsAll(round);

        assertThat(round.isOver()).isTrue();
        assertThat(round.phase()).isEqualTo(TurnPhase.ROUND_OVER);
        assertThat(round.boardOf(BOB).allFaceUp()).isTrue();
        RoundResult result = round.result();
        assertThat(result.scoreOf(ALICE)).isEqualTo(new Score(1));
        assertThat(result.scoreOf(BOB)).isEqualTo(new Score(51));
        assertThat(result.winner()).contains(ALICE);
    }

    @Test
    void 라운드가_끝나면_어떤_행동도_할_수_없다() {
        PaperSafariRound round = startedRound(zeros(9));
        aliceRevealsAll(round);

        assertError(() -> round.drawFromDeck(BOB), ErrorCode.INVALID_PHASE);
        assertError(() -> round.flipInitial(BOB, FIRST), ErrorCode.INVALID_PHASE);
    }

    @Test
    void 라운드가_끝나기_전에는_결과를_볼_수_없다() {
        PaperSafariRound round = startedRound(zeros(1));

        assertError(round::result, ErrorCode.ROUND_NOT_OVER);
    }

    @Test
    void 차례인_플레이어가_나가면_들고_있던_카드는_버려지고_다음_사람_차례가_된다() {
        PaperSafariRound round = round(THREE,
                stack(List.of(WINNER_HAND, LOSER_HAND, LOSER_HAND), Card.number(7), zeros(1)));
        flipFirst(round, THREE);
        round.drawFromDeck(ALICE);

        round.leave(ALICE);

        assertThat(round.discardTop()).contains(Card.number(0));
        assertThat(round.currentPlayer()).isEqualTo(BOB);
        assertThat(round.phase()).isEqualTo(TurnPhase.DRAW);
        assertError(() -> round.boardOf(ALICE), ErrorCode.NOT_A_PLAYER);
    }

    @Test
    void 준비_단계에서_안_뒤집은_사람이_나가면_나머지로_진행을_시작한다() {
        PaperSafariRound round = round(THREE,
                stack(List.of(WINNER_HAND, LOSER_HAND, LOSER_HAND), Card.number(7), zeros(1)));
        round.flipInitial(ALICE, FIRST);
        round.flipInitial(BOB, FIRST);

        round.leave(CAROL);

        assertThat(round.phase()).isEqualTo(TurnPhase.DRAW);
        assertThat(round.currentPlayer()).isEqualTo(ALICE);
    }
}
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest='DrawnCardTest,PaperSafariRoundTest'`
Expected: FAIL — `cannot find symbol: class PaperSafariRound`

- [ ] **Step 3: 구현**

`DrawSource.java`
```java
package com.boardgame.papersafari;

public enum DrawSource {
    DECK, DISCARD
}
```

`DrawnCard.java`
```java
package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;

public record DrawnCard(Card card, DrawSource source) {

    public boolean fromDeck() {
        return source == DrawSource.DECK;
    }

    public boolean triggersTarzan() {
        return fromDeck() && card.is(CardKind.TARZAN);
    }

    public boolean triggersElephant() {
        return fromDeck() && card.is(CardKind.ELEPHANT);
    }

    public void validateDiscardable() {
        if (!fromDeck()) {
            throw new BusinessException(ErrorCode.MUST_SWAP_DISCARD_CARD);
        }
        if (triggersTarzan()) {
            throw new BusinessException(ErrorCode.MUST_SWAP_TARZAN);
        }
    }
}
```

`TurnPhase.java`
```java
package com.boardgame.papersafari;

public enum TurnPhase {
    SETUP_FLIP, DRAW, PLACE, PEEK, ROUND_OVER;

    public boolean isPlaying() {
        return this == DRAW || this == PLACE || this == PEEK;
    }
}
```

`Step.java`
```java
package com.boardgame.papersafari;

import java.util.Optional;

record Step(TurnPhase phase, DrawnCard drawn) {

    static Step of(TurnPhase phase) {
        return new Step(phase, null);
    }

    static Step placing(DrawnCard drawn) {
        return new Step(TurnPhase.PLACE, drawn);
    }

    boolean isIn(TurnPhase other) {
        return phase == other;
    }

    Optional<DrawnCard> held() {
        return Optional.ofNullable(drawn);
    }

    Step afterLeave() {
        if (!phase.isPlaying()) {
            return this;
        }
        return of(TurnPhase.DRAW);
    }
}
```

`Turn.java`
```java
package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.Optional;

public class Turn {

    private final Seats seats;
    private PlayerId current;
    private Step step;

    private Turn(Seats seats, PlayerId current, Step step) {
        this.seats = seats;
        this.current = current;
        this.step = step;
    }

    public static Turn setUp(Seats seats, PlayerId starter) {
        return new Turn(seats, starter, Step.of(TurnPhase.SETUP_FLIP));
    }

    public void requirePhase(TurnPhase phase) {
        if (!step.isIn(phase)) {
            throw new BusinessException(ErrorCode.INVALID_PHASE);
        }
    }

    public void require(PlayerId player, TurnPhase phase) {
        requirePhase(phase);
        if (!current.equals(player)) {
            throw new BusinessException(ErrorCode.NOT_YOUR_TURN);
        }
    }

    public void beginPlaying() {
        step = Step.of(TurnPhase.DRAW);
    }

    public void hold(DrawnCard drawn) {
        step = Step.placing(drawn);
    }

    public DrawnCard drawn() {
        return step.drawn();
    }

    public void awaitPeek() {
        step = Step.of(TurnPhase.PEEK);
    }

    public void passToNext() {
        current = seats.next(current);
        step = Step.of(TurnPhase.DRAW);
    }

    public void finishRound() {
        step = Step.of(TurnPhase.ROUND_OVER);
    }

    public boolean isRoundOver() {
        return step.isIn(TurnPhase.ROUND_OVER);
    }

    public boolean isSettingUp() {
        return step.isIn(TurnPhase.SETUP_FLIP);
    }

    public PlayerId leftOf(PlayerId player) {
        return seats.leftOf(player);
    }

    public PlayerId current() {
        return current;
    }

    public TurnPhase phase() {
        return step.phase();
    }

    public Optional<DrawnCard> leave(PlayerId player) {
        if (!current.equals(player)) {
            return Optional.empty();
        }
        Optional<DrawnCard> released = step.held();
        current = seats.next(player);
        step = step.afterLeave();
        return released;
    }
}
```

`KnownCards.java`
```java
package com.boardgame.papersafari;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class KnownCards {

    private final Map<PlayerId, Set<Position>> known = new HashMap<>();

    public void remember(PlayerId player, Position position) {
        known.computeIfAbsent(player, key -> new HashSet<>()).add(position);
    }

    public void forget(PlayerId player, Position position) {
        known.getOrDefault(player, new HashSet<>()).remove(position);
    }

    public boolean knows(PlayerId player, Position position) {
        return known.getOrDefault(player, Set.of()).contains(position);
    }
}
```

`PlayerBoards.java`
```java
package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.LinkedHashMap;
import java.util.Map;

public class PlayerBoards {

    private final Map<PlayerId, Board> boards;
    private final KnownCards knownCards;

    private PlayerBoards(Map<PlayerId, Board> boards, KnownCards knownCards) {
        this.boards = boards;
        this.knownCards = knownCards;
    }

    public static PlayerBoards deal(Seats seats, Table table) {
        Map<PlayerId, Board> boards = new LinkedHashMap<>();
        seats.asList().forEach(player -> boards.put(player, Board.deal(table.dealHand())));
        return new PlayerBoards(boards, new KnownCards());
    }

    public void flipInitial(PlayerId player, Position position) {
        Board board = boardOf(player);
        if (board.hasFaceUp()) {
            throw new BusinessException(ErrorCode.ALREADY_FLIPPED);
        }
        board.reveal(position);
    }

    public boolean everyoneFlipped() {
        return boards.values().stream().allMatch(Board::hasFaceUp);
    }

    public Card replace(PlayerId player, Position position, Card card) {
        knownCards.forget(player, position);
        return boardOf(player).replace(position, card);
    }

    public void peek(PlayerId player, Position position) {
        if (!boardOf(player).isFaceDown(position)) {
            throw new BusinessException(ErrorCode.NOT_FACE_DOWN);
        }
        knownCards.remember(player, position);
    }

    public boolean knows(PlayerId player, Position position) {
        return knownCards.knows(player, position);
    }

    public boolean hasFaceDown(PlayerId player) {
        return boardOf(player).hasFaceDown();
    }

    public boolean anyAllFaceUp() {
        return boards.values().stream().anyMatch(Board::allFaceUp);
    }

    public void revealAll() {
        boards.values().forEach(Board::revealAll);
    }

    public Map<PlayerId, Score> scores() {
        Map<PlayerId, Score> scores = new LinkedHashMap<>();
        boards.forEach((player, board) -> scores.put(player, board.score()));
        return scores;
    }

    public void remove(PlayerId player) {
        boards.remove(player);
    }

    public Board boardOf(PlayerId player) {
        Board board = boards.get(player);
        if (board == null) {
            throw new BusinessException(ErrorCode.NOT_A_PLAYER);
        }
        return board;
    }
}
```

`PaperSafariRound.java`
```java
package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.Optional;

public class PaperSafariRound {

    private final Table table;
    private final PlayerBoards boards;
    private final Turn turn;

    private PaperSafariRound(Table table, PlayerBoards boards, Turn turn) {
        this.table = table;
        this.boards = boards;
        this.turn = turn;
    }

    public static PaperSafariRound start(Seats seats, PlayerId starter, CardShuffler shuffler) {
        Table table = Table.setUp(shuffler);
        PlayerBoards boards = PlayerBoards.deal(seats, table);
        table.openDiscard();
        return new PaperSafariRound(table, boards, Turn.setUp(seats, starter));
    }

    public void flipInitial(PlayerId player, Position position) {
        turn.requirePhase(TurnPhase.SETUP_FLIP);
        boards.flipInitial(player, position);
        startPlayingIfReady();
    }

    public void drawFromDeck(PlayerId player) {
        turn.require(player, TurnPhase.DRAW);
        turn.hold(new DrawnCard(table.drawFromDeck(), DrawSource.DECK));
    }

    public void drawFromDiscard(PlayerId player) {
        turn.require(player, TurnPhase.DRAW);
        turn.hold(new DrawnCard(table.drawFromDiscard(), DrawSource.DISCARD));
    }

    public void swapAt(PlayerId player, Position position) {
        turn.require(player, TurnPhase.PLACE);
        DrawnCard drawn = turn.drawn();
        table.discard(boards.replace(player, position, drawn.card()));
        finishTurn();
    }

    public void discardDrawn(PlayerId player) {
        turn.require(player, TurnPhase.PLACE);
        DrawnCard drawn = turn.drawn();
        drawn.validateDiscardable();
        table.discard(drawn.card());
        finishTurn();
    }

    public void leave(PlayerId player) {
        turn.leave(player).ifPresent(drawn -> table.discard(drawn.card()));
        boards.remove(player);
        startPlayingIfReady();
    }

    public boolean isOver() {
        return turn.isRoundOver();
    }

    public RoundResult result() {
        if (!isOver()) {
            throw new BusinessException(ErrorCode.ROUND_NOT_OVER);
        }
        return RoundResult.of(boards.scores());
    }

    public TurnPhase phase() {
        return turn.phase();
    }

    public PlayerId currentPlayer() {
        return turn.current();
    }

    public Board boardOf(PlayerId player) {
        return boards.boardOf(player);
    }

    public Optional<Card> discardTop() {
        return table.discardTop();
    }

    public int deckSize() {
        return table.deckSize();
    }

    private void startPlayingIfReady() {
        if (!turn.isSettingUp() || !boards.everyoneFlipped()) {
            return;
        }
        turn.beginPlaying();
    }

    private void finishTurn() {
        if (boards.anyAllFaceUp()) {
            boards.revealAll();
            turn.finishRound();
            return;
        }
        turn.passToNext();
    }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest='DrawnCardTest,PaperSafariRoundTest'`
Expected: PASS

- [ ] **Step 5: 전체 테스트 회귀 확인 후 커밋**

Run: `mvn -q -f backend/pom.xml test`
Expected: PASS

```bash
git add backend
git commit -m "feat: 페이퍼 사파리 라운드 진행(준비, 뽑기, 교체, 버리기, 즉시 종료, 이탈)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 특수 카드(코끼리 엿보기, 타잔 밀어내기)

**Files:**
- Modify: `backend/src/main/java/com/boardgame/papersafari/PaperSafariRound.java` (`swapAt` 교체, `peekAt`·`knows`·`sendAway`·`pushToLeft` 추가)
- Test: `backend/src/test/java/com/boardgame/papersafari/SpecialCardTest.java`

**Interfaces:**
- Consumes: `DrawnCard.triggersTarzan()/triggersElephant()`, `Turn.awaitPeek()/leftOf()`, `PlayerBoards.peek()/knows()/hasFaceDown()`
- Produces: `PaperSafariRound.peekAt(PlayerId, Position)`, `PaperSafariRound.knows(PlayerId, Position)`

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/src/test/java/com/boardgame/papersafari/SpecialCardTest.java`
```java
package com.boardgame.papersafari;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static com.boardgame.papersafari.Fixtures.ALICE;
import static com.boardgame.papersafari.Fixtures.BOB;
import static com.boardgame.papersafari.Fixtures.CAROL;
import static com.boardgame.papersafari.Fixtures.FIRST;
import static com.boardgame.papersafari.Fixtures.LOSER_HAND;
import static com.boardgame.papersafari.Fixtures.REST;
import static com.boardgame.papersafari.Fixtures.WINNER_HAND;
import static com.boardgame.papersafari.Fixtures.flipFirst;
import static com.boardgame.papersafari.Fixtures.round;
import static com.boardgame.papersafari.Fixtures.stack;
import static com.boardgame.papersafari.Fixtures.zeros;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;

class SpecialCardTest {

    private static final List<PlayerId> TWO = List.of(ALICE, BOB);
    private static final List<PlayerId> THREE = List.of(ALICE, BOB, CAROL);

    private PaperSafariRound started(List<PlayerId> players, Card discardTop, List<Card> deck) {
        List<List<Card>> hands = new ArrayList<>();
        hands.add(WINNER_HAND);
        hands.addAll(Collections.nCopies(players.size() - 1, LOSER_HAND));
        PaperSafariRound round = round(players, stack(hands, discardTop, deck));
        flipFirst(round, players);
        return round;
    }

    private List<Card> zerosThen(int count, Card last) {
        List<Card> deck = new ArrayList<>(zeros(count));
        deck.add(last);
        return deck;
    }

    @Test
    void 덱에서_뽑은_코끼리로_교체하면_뒷면_카드_한_장을_엿본다() {
        PaperSafariRound round = started(TWO, Card.number(7), List.of(Card.elephant()));

        round.drawFromDeck(ALICE);
        round.swapAt(ALICE, new Position(1, 0));

        assertThat(round.phase()).isEqualTo(TurnPhase.PEEK);
        assertThat(round.currentPlayer()).isEqualTo(ALICE);

        round.peekAt(ALICE, new Position(2, 0));

        assertThat(round.knows(ALICE, new Position(2, 0))).isTrue();
        assertThat(round.currentPlayer()).isEqualTo(BOB);
        assertThat(round.phase()).isEqualTo(TurnPhase.DRAW);
    }

    @Test
    void 엿보기는_뒷면_카드만_가능하다() {
        PaperSafariRound round = started(TWO, Card.number(7), List.of(Card.elephant()));
        round.drawFromDeck(ALICE);
        round.swapAt(ALICE, new Position(1, 0));

        assertError(() -> round.peekAt(ALICE, FIRST), ErrorCode.NOT_FACE_DOWN);
        assertError(() -> round.peekAt(ALICE, new Position(1, 0)), ErrorCode.NOT_FACE_DOWN);
        assertThat(round.phase()).isEqualTo(TurnPhase.PEEK);
    }

    @Test
    void 엿보기_단계에서는_다른_행동을_할_수_없다() {
        PaperSafariRound round = started(TWO, Card.number(7), List.of(Card.elephant()));
        round.drawFromDeck(ALICE);
        round.swapAt(ALICE, new Position(1, 0));

        assertError(() -> round.drawFromDeck(ALICE), ErrorCode.INVALID_PHASE);
        assertError(() -> round.peekAt(BOB, new Position(1, 0)), ErrorCode.NOT_YOUR_TURN);
    }

    @Test
    void 버린_더미에서_가져온_코끼리는_효과가_없다() {
        PaperSafariRound round = started(TWO, Card.elephant(), zeros(1));

        round.drawFromDiscard(ALICE);
        round.swapAt(ALICE, new Position(1, 0));

        assertThat(round.phase()).isEqualTo(TurnPhase.DRAW);
        assertThat(round.currentPlayer()).isEqualTo(BOB);
    }

    @Test
    void 코끼리를_버리면_효과가_없다() {
        PaperSafariRound round = started(TWO, Card.number(7), List.of(Card.elephant()));

        round.drawFromDeck(ALICE);
        round.discardDrawn(ALICE);

        assertThat(round.phase()).isEqualTo(TurnPhase.DRAW);
        assertThat(round.currentPlayer()).isEqualTo(BOB);
    }

    @Test
    void 코끼리로_마지막_뒷면_칸을_채우면_엿보기_없이_라운드가_끝난다() {
        PaperSafariRound round = started(TWO, Card.number(7), zerosThen(8, Card.elephant()));
        for (int index = 0; index < 4; index++) {
            round.drawFromDeck(ALICE);
            round.swapAt(ALICE, REST.get(index));
            round.drawFromDeck(BOB);
            round.discardDrawn(BOB);
        }

        round.drawFromDeck(ALICE);
        round.swapAt(ALICE, REST.get(4));

        assertThat(round.isOver()).isTrue();
    }

    @Test
    void 덱에서_뽑은_타잔은_빠진_카드를_왼쪽_사람의_같은_칸으로_보낸다() {
        PaperSafariRound round = started(THREE, Card.number(7), List.of(Card.tarzan()));
        Position position = new Position(1, 1);

        round.drawFromDeck(ALICE);
        round.swapAt(ALICE, position);

        assertThat(round.boardOf(ALICE).cardAt(position)).isEqualTo(Card.tarzan());
        assertThat(round.boardOf(BOB).cardAt(position)).isEqualTo(Card.number(5));
        assertThat(round.boardOf(BOB).isFaceDown(position)).isFalse();
        assertThat(round.discardTop()).contains(Card.number(8));
        assertThat(round.boardOf(CAROL).isFaceDown(position)).isTrue();
        assertThat(round.currentPlayer()).isEqualTo(BOB);
    }

    @Test
    void 덱에서_뽑은_타잔은_버릴_수_없다() {
        PaperSafariRound round = started(TWO, Card.number(7), List.of(Card.tarzan()));
        round.drawFromDeck(ALICE);

        assertError(() -> round.discardDrawn(ALICE), ErrorCode.MUST_SWAP_TARZAN);
    }

    @Test
    void 버린_더미에서_가져온_타잔은_일반_카드처럼_교체된다() {
        PaperSafariRound round = started(TWO, Card.tarzan(), zeros(1));
        Position position = new Position(0, 1);

        round.drawFromDiscard(ALICE);
        round.swapAt(ALICE, position);

        assertThat(round.boardOf(ALICE).cardAt(position)).isEqualTo(Card.tarzan());
        assertThat(round.boardOf(BOB).isFaceDown(position)).isTrue();
        assertThat(round.discardTop()).contains(Card.number(4));
    }

    @Test
    void 마지막_좌석의_왼쪽은_첫_좌석이다() {
        PaperSafariRound round = started(TWO, Card.number(7), List.of(Card.number(0), Card.tarzan()));
        Position position = new Position(2, 0);
        round.drawFromDeck(ALICE);
        round.discardDrawn(ALICE);

        round.drawFromDeck(BOB);
        round.swapAt(BOB, position);

        assertThat(round.boardOf(ALICE).cardAt(position)).isEqualTo(Card.number(9));
        assertThat(round.discardTop()).contains(Card.number(3));
    }

    @Test
    void 타잔으로_왼쪽_사람의_카드가_모두_공개되면_즉시_라운드가_끝난다() {
        PaperSafariRound round = started(TWO, Card.number(7), zerosThen(8, Card.tarzan()));
        for (int index = 0; index < 4; index++) {
            round.drawFromDeck(ALICE);
            round.discardDrawn(ALICE);
            round.drawFromDeck(BOB);
            round.swapAt(BOB, REST.get(index));
        }

        round.drawFromDeck(ALICE);
        round.swapAt(ALICE, new Position(2, 1));

        assertThat(round.isOver()).isTrue();
        assertThat(round.boardOf(BOB).cardAt(new Position(2, 1))).isEqualTo(Card.number(6));
    }

    @Test
    void 타잔으로_밀려난_카드에_대한_엿보기_정보는_사라진다() {
        PaperSafariRound round = started(TWO, Card.number(7),
                List.of(Card.number(0), Card.elephant(), Card.tarzan()));
        Position peeked = new Position(2, 0);
        round.drawFromDeck(ALICE);
        round.discardDrawn(ALICE);
        round.drawFromDeck(BOB);
        round.swapAt(BOB, new Position(1, 0));
        round.peekAt(BOB, peeked);
        assertThat(round.knows(BOB, peeked)).isTrue();

        round.drawFromDeck(ALICE);
        round.swapAt(ALICE, peeked);

        assertThat(round.knows(BOB, peeked)).isFalse();
        assertThat(round.boardOf(BOB).cardAt(peeked)).isEqualTo(Card.number(3));
    }
}
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest=SpecialCardTest`
Expected: FAIL — `cannot find symbol: method peekAt(PlayerId,Position)`

- [ ] **Step 3: 구현 — `PaperSafariRound`의 `swapAt`을 아래로 교체하고 메서드 추가**

기존 `swapAt` 메서드 전체를 다음으로 교체:
```java
    public void swapAt(PlayerId player, Position position) {
        turn.require(player, TurnPhase.PLACE);
        DrawnCard drawn = turn.drawn();
        Card replaced = boards.replace(player, position, drawn.card());
        sendAway(player, position, replaced, drawn);
        if (drawn.triggersElephant() && boards.hasFaceDown(player)) {
            turn.awaitPeek();
            return;
        }
        finishTurn();
    }

    public void peekAt(PlayerId player, Position position) {
        turn.require(player, TurnPhase.PEEK);
        boards.peek(player, position);
        finishTurn();
    }

    public boolean knows(PlayerId player, Position position) {
        return boards.knows(player, position);
    }
```

`finishTurn()` 위에 private 메서드 추가:
```java
    private void sendAway(PlayerId player, Position position, Card replaced, DrawnCard drawn) {
        if (drawn.triggersTarzan()) {
            pushToLeft(player, position, replaced);
            return;
        }
        table.discard(replaced);
    }

    private void pushToLeft(PlayerId player, Position position, Card card) {
        PlayerId left = turn.leftOf(player);
        table.discard(boards.replace(left, position, card));
    }
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest='SpecialCardTest,PaperSafariRoundTest'`
Expected: PASS

- [ ] **Step 5: 커밋**

```bash
git add backend
git commit -m "feat: 코끼리 엿보기와 타잔 밀어내기 특수 카드" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 게임(라운드 반복, 토큰, 승리, 기권)

**Files:**
- Create: `backend/src/main/java/com/boardgame/papersafari/{RoundNumber,RoundFactory,RoundSequence,GameStatus,PaperSafariGame}.java`
- Test: `backend/src/test/java/com/boardgame/papersafari/GameFixtures.java`, `PaperSafariGameTest.java`

**Interfaces:**
- Consumes: `PaperSafariRound`(Task 6·7 전체 공개 메서드), `Seats`, `Tokens`, `RoundResult`, `CardShuffler`, `RandomCardShuffler`
- Produces:
  - `record RoundNumber(int value)` — `FIRST`, `next()`, `index()`(= value-1)
  - `class RoundFactory` — `RoundFactory(CardShuffler, int starterOffset)`, `static random()`, `PaperSafariRound create(Seats, RoundNumber)` (시작 플레이어 = `seats.at(starterOffset + number.index())`)
  - `class RoundSequence` — `static begin(RoundFactory, Seats)`, `next(Seats)`, `PaperSafariRound current()`, `RoundNumber number()`
  - `enum GameStatus { IN_ROUND, ROUND_OVER, GAME_OVER }`
  - `class PaperSafariGame` — `static start(List<PlayerId>, RoundFactory)`, `flipInitial`, `drawFromDeck`, `drawFromDiscard`, `swapAt`, `discardDrawn`, `peekAt`, `startNextRound()`, `forfeit(PlayerId)`, `GameStatus status()`, `Optional<PlayerId> winner()`, `Optional<RoundResult> lastRoundResult()`, `RoundNumber roundNumber()`, `PlayerId currentPlayer()`, `TurnPhase phase()`, `TokenCount tokensOf(PlayerId)`
  - 테스트 `GameFixtures`: `game(List<PlayerId>, List<List<Card>> roundStacks)`, `roundWonBy(PlayerId)`, `tiedRound()`, `playRound(game, finisher, other)`

- [ ] **Step 1: 테스트 픽스처와 실패하는 테스트 작성**

`backend/src/test/java/com/boardgame/papersafari/GameFixtures.java`
```java
package com.boardgame.papersafari;

import static com.boardgame.papersafari.Fixtures.ALICE;
import static com.boardgame.papersafari.Fixtures.BOB;
import static com.boardgame.papersafari.Fixtures.FIRST;
import static com.boardgame.papersafari.Fixtures.LOSER_HAND;
import static com.boardgame.papersafari.Fixtures.REST;
import static com.boardgame.papersafari.Fixtures.WINNER_HAND;
import static com.boardgame.papersafari.Fixtures.numbers;
import static com.boardgame.papersafari.Fixtures.stack;
import static com.boardgame.papersafari.Fixtures.zeros;

import java.util.List;

final class GameFixtures {

    private GameFixtures() {
    }

    static PaperSafariGame game(List<PlayerId> players, List<List<Card>> roundStacks) {
        return PaperSafariGame.start(players, new RoundFactory(StackedShuffler.rounds(roundStacks), 0));
    }

    // ALICE·BOB 2인 라운드: winner는 1점, 상대는 51점
    static List<Card> roundWonBy(PlayerId winner) {
        if (winner.equals(ALICE)) {
            return stack(List.of(WINNER_HAND, LOSER_HAND), Card.number(7), zeros(10));
        }
        return stack(List.of(LOSER_HAND, WINNER_HAND), Card.number(7), zeros(10));
    }

    // ALICE가 모두 공개해 1점, BOB도 1점 → 무승부
    static List<Card> tiedRound() {
        return stack(List.of(WINNER_HAND, numbers(1, 0, 0, 0, 0, 0)), Card.number(7), zeros(10));
    }

    // 2인 게임에서 finisher가 0으로 5칸을 채워 라운드를 끝낸다. other는 자기 차례에 뽑아서 버린다.
    static void playRound(PaperSafariGame game, PlayerId finisher, PlayerId other) {
        game.flipInitial(ALICE, FIRST);
        game.flipInitial(BOB, FIRST);
        for (Position position : REST) {
            passIfTurnOf(game, other);
            game.drawFromDeck(finisher);
            game.swapAt(finisher, position);
        }
    }

    private static void passIfTurnOf(PaperSafariGame game, PlayerId player) {
        if (!game.currentPlayer().equals(player)) {
            return;
        }
        game.drawFromDeck(player);
        game.discardDrawn(player);
    }
}
```

`backend/src/test/java/com/boardgame/papersafari/PaperSafariGameTest.java`
```java
package com.boardgame.papersafari;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static com.boardgame.papersafari.Fixtures.ALICE;
import static com.boardgame.papersafari.Fixtures.BOB;
import static com.boardgame.papersafari.Fixtures.CAROL;
import static com.boardgame.papersafari.Fixtures.FIRST;
import static com.boardgame.papersafari.Fixtures.LOSER_HAND;
import static com.boardgame.papersafari.Fixtures.WINNER_HAND;
import static com.boardgame.papersafari.Fixtures.stack;
import static com.boardgame.papersafari.Fixtures.zeros;
import static com.boardgame.papersafari.GameFixtures.game;
import static com.boardgame.papersafari.GameFixtures.playRound;
import static com.boardgame.papersafari.GameFixtures.roundWonBy;
import static com.boardgame.papersafari.GameFixtures.tiedRound;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import java.util.List;
import org.junit.jupiter.api.Test;

class PaperSafariGameTest {

    private static final List<PlayerId> TWO = List.of(ALICE, BOB);
    private static final List<PlayerId> THREE = List.of(ALICE, BOB, CAROL);

    @Test
    void 라운드_승자는_토큰을_하나_받는다() {
        PaperSafariGame game = game(TWO, List.of(roundWonBy(ALICE)));

        playRound(game, ALICE, BOB);

        assertThat(game.status()).isEqualTo(GameStatus.ROUND_OVER);
        assertThat(game.tokensOf(ALICE)).isEqualTo(new TokenCount(1));
        assertThat(game.tokensOf(BOB)).isEqualTo(TokenCount.ZERO);
        assertThat(game.lastRoundResult()).hasValueSatisfying(result ->
                assertThat(result.winner()).contains(ALICE));
    }

    @Test
    void 최저점이_같으면_라운드_무승부로_아무도_토큰을_받지_않는다() {
        PaperSafariGame game = game(TWO, List.of(tiedRound()));

        playRound(game, ALICE, BOB);

        assertThat(game.tokensOf(ALICE)).isEqualTo(TokenCount.ZERO);
        assertThat(game.tokensOf(BOB)).isEqualTo(TokenCount.ZERO);
        assertThat(game.lastRoundResult()).hasValueSatisfying(result -> {
            assertThat(result.outcomeOf(ALICE)).isEqualTo(RoundOutcome.DRAW);
            assertThat(result.outcomeOf(BOB)).isEqualTo(RoundOutcome.DRAW);
        });
    }

    @Test
    void 다음_라운드는_다음_좌석부터_시작한다() {
        PaperSafariGame game = game(TWO, List.of(roundWonBy(ALICE), roundWonBy(ALICE)));
        playRound(game, ALICE, BOB);

        game.startNextRound();

        assertThat(game.roundNumber()).isEqualTo(new RoundNumber(2));
        assertThat(game.currentPlayer()).isEqualTo(BOB);
        assertThat(game.phase()).isEqualTo(TurnPhase.SETUP_FLIP);
        assertThat(game.status()).isEqualTo(GameStatus.IN_ROUND);
        assertThat(game.lastRoundResult()).isEmpty();
    }

    @Test
    void 라운드가_끝나기_전에는_다음_라운드를_시작할_수_없다() {
        PaperSafariGame game = game(TWO, List.of(roundWonBy(ALICE)));

        assertError(game::startNextRound, ErrorCode.ROUND_NOT_OVER);
    }

    @Test
    void 토큰_3개를_먼저_모으면_게임에서_승리하고_더_이상_진행할_수_없다() {
        PaperSafariGame game = game(TWO, List.of(
                roundWonBy(ALICE), roundWonBy(BOB), roundWonBy(ALICE), roundWonBy(ALICE)));

        playRound(game, ALICE, BOB);
        game.startNextRound();
        playRound(game, BOB, ALICE);
        game.startNextRound();
        playRound(game, ALICE, BOB);
        game.startNextRound();
        playRound(game, ALICE, BOB);

        assertThat(game.status()).isEqualTo(GameStatus.GAME_OVER);
        assertThat(game.winner()).contains(ALICE);
        assertThat(game.tokensOf(ALICE)).isEqualTo(new TokenCount(3));
        assertThat(game.tokensOf(BOB)).isEqualTo(new TokenCount(1));
        assertError(game::startNextRound, ErrorCode.GAME_ALREADY_OVER);
        assertError(() -> game.forfeit(BOB), ErrorCode.GAME_ALREADY_OVER);
    }

    @Test
    void 기권해서_한_명만_남으면_남은_사람이_승리한다() {
        PaperSafariGame game = game(TWO, List.of(roundWonBy(ALICE)));

        game.forfeit(BOB);

        assertThat(game.status()).isEqualTo(GameStatus.GAME_OVER);
        assertThat(game.winner()).contains(ALICE);
        assertError(() -> game.flipInitial(ALICE, FIRST), ErrorCode.GAME_ALREADY_OVER);
    }

    @Test
    void 기권한_사람은_차례_순환에서_빠진다() {
        PaperSafariGame game = game(THREE, List.of(
                stack(List.of(WINNER_HAND, LOSER_HAND, LOSER_HAND), Card.number(7), zeros(5))));
        THREE.forEach(player -> game.flipInitial(player, FIRST));
        game.drawFromDeck(ALICE);

        game.forfeit(ALICE);

        assertThat(game.status()).isEqualTo(GameStatus.IN_ROUND);
        assertThat(game.currentPlayer()).isEqualTo(BOB);
        assertThat(game.phase()).isEqualTo(TurnPhase.DRAW);
        game.drawFromDeck(BOB);
        game.discardDrawn(BOB);
        assertThat(game.currentPlayer()).isEqualTo(CAROL);
        game.drawFromDeck(CAROL);
        game.discardDrawn(CAROL);
        assertThat(game.currentPlayer()).isEqualTo(BOB);
    }

    @Test
    void 참가자가_아니면_기권할_수_없다() {
        PaperSafariGame game = game(TWO, List.of(roundWonBy(ALICE)));

        assertError(() -> game.forfeit(CAROL), ErrorCode.NOT_A_PLAYER);
    }
}
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest=PaperSafariGameTest`
Expected: FAIL — `cannot find symbol: class PaperSafariGame`

- [ ] **Step 3: 구현**

`RoundNumber.java`
```java
package com.boardgame.papersafari;

public record RoundNumber(int value) {

    public static final RoundNumber FIRST = new RoundNumber(1);

    public RoundNumber next() {
        return new RoundNumber(value + 1);
    }

    public int index() {
        return value - 1;
    }
}
```

`RoundFactory.java`
```java
package com.boardgame.papersafari;

import java.util.concurrent.ThreadLocalRandom;

public class RoundFactory {

    private final CardShuffler shuffler;
    private final int starterOffset;

    public RoundFactory(CardShuffler shuffler, int starterOffset) {
        this.shuffler = shuffler;
        this.starterOffset = starterOffset;
    }

    public static RoundFactory random() {
        int offset = ThreadLocalRandom.current().nextInt(Seats.MAX_PLAYERS);
        return new RoundFactory(new RandomCardShuffler(), offset);
    }

    public PaperSafariRound create(Seats seats, RoundNumber number) {
        PlayerId starter = seats.at(starterOffset + number.index());
        return PaperSafariRound.start(seats, starter, shuffler);
    }
}
```

`RoundSequence.java`
```java
package com.boardgame.papersafari;

public class RoundSequence {

    private final RoundFactory factory;
    private PaperSafariRound current;
    private RoundNumber number;

    private RoundSequence(RoundFactory factory, PaperSafariRound current, RoundNumber number) {
        this.factory = factory;
        this.current = current;
        this.number = number;
    }

    public static RoundSequence begin(RoundFactory factory, Seats seats) {
        return new RoundSequence(factory, factory.create(seats, RoundNumber.FIRST), RoundNumber.FIRST);
    }

    public void next(Seats seats) {
        number = number.next();
        current = factory.create(seats, number);
    }

    public PaperSafariRound current() {
        return current;
    }

    public RoundNumber number() {
        return number;
    }
}
```

`GameStatus.java`
```java
package com.boardgame.papersafari;

public enum GameStatus {
    IN_ROUND, ROUND_OVER, GAME_OVER
}
```

`PaperSafariGame.java`
```java
package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.List;
import java.util.Optional;

public class PaperSafariGame {

    private final Seats seats;
    private final Tokens tokens;
    private final RoundSequence rounds;

    private PaperSafariGame(Seats seats, Tokens tokens, RoundSequence rounds) {
        this.seats = seats;
        this.tokens = tokens;
        this.rounds = rounds;
    }

    public static PaperSafariGame start(List<PlayerId> players, RoundFactory factory) {
        Seats seats = Seats.of(players);
        return new PaperSafariGame(seats, Tokens.forPlayers(seats), RoundSequence.begin(factory, seats));
    }

    public void flipInitial(PlayerId player, Position position) {
        requireInProgress();
        round().flipInitial(player, position);
    }

    public void drawFromDeck(PlayerId player) {
        requireInProgress();
        round().drawFromDeck(player);
    }

    public void drawFromDiscard(PlayerId player) {
        requireInProgress();
        round().drawFromDiscard(player);
    }

    public void swapAt(PlayerId player, Position position) {
        requireInProgress();
        round().swapAt(player, position);
        settleRound();
    }

    public void discardDrawn(PlayerId player) {
        requireInProgress();
        round().discardDrawn(player);
        settleRound();
    }

    public void peekAt(PlayerId player, Position position) {
        requireInProgress();
        round().peekAt(player, position);
        settleRound();
    }

    public void startNextRound() {
        requireInProgress();
        if (!round().isOver()) {
            throw new BusinessException(ErrorCode.ROUND_NOT_OVER);
        }
        rounds.next(seats);
    }

    public void forfeit(PlayerId player) {
        requireInProgress();
        seats.requireSeated(player);
        round().leave(player);
        seats.remove(player);
    }

    public GameStatus status() {
        if (winner().isPresent()) {
            return GameStatus.GAME_OVER;
        }
        if (round().isOver()) {
            return GameStatus.ROUND_OVER;
        }
        return GameStatus.IN_ROUND;
    }

    public Optional<PlayerId> winner() {
        return tokens.champion().or(seats::soleSurvivor);
    }

    public Optional<RoundResult> lastRoundResult() {
        if (!round().isOver()) {
            return Optional.empty();
        }
        return Optional.of(round().result());
    }

    public RoundNumber roundNumber() {
        return rounds.number();
    }

    public PlayerId currentPlayer() {
        return round().currentPlayer();
    }

    public TurnPhase phase() {
        return round().phase();
    }

    public TokenCount tokensOf(PlayerId player) {
        return tokens.countOf(player);
    }

    private PaperSafariRound round() {
        return rounds.current();
    }

    private void settleRound() {
        if (!round().isOver()) {
            return;
        }
        RoundResult result = round().result();
        result.winner().ifPresent(tokens::award);
    }

    private void requireInProgress() {
        if (winner().isPresent()) {
            throw new BusinessException(ErrorCode.GAME_ALREADY_OVER);
        }
    }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest=PaperSafariGameTest`
Expected: PASS

- [ ] **Step 5: 전체 회귀 확인 후 커밋**

Run: `mvn -q -f backend/pom.xml test`
Expected: PASS

```bash
git add backend
git commit -m "feat: 페이퍼 사파리 게임(라운드 반복, 토큰 3개 승리, 기권)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 플레이어 시점 뷰(정보 은닉)

**Files:**
- Create: `backend/src/main/java/com/boardgame/papersafari/view/{CardView,SlotView,BoardView,HeldView,RoundView,PlayerResultView,RoundResultView,PaperSafariView}.java`
- Modify: `Table.java`(`discardTopView` 추가), `Turn.java`(`heldViewFor` 추가), `PlayerBoards.java`(`viewFor` 추가), `PaperSafariRound.java`(`viewFor` 추가), `RoundResult.java`(`toView` 추가), `PaperSafariGame.java`(`viewFor` 추가)
- Test: `backend/src/test/java/com/boardgame/papersafari/PaperSafariViewTest.java`

**Interfaces:**
- Consumes: Task 2~8의 도메인 전부
- Produces (계획 3에서 STOMP로 그대로 직렬화):
  - `record CardView(CardKind kind, int value)` + `static of(Card)`
  - `record SlotView(int column, int row, boolean faceUp, boolean known, CardView card)` + `static of(Position, Slot, boolean knownByViewer)` — 앞면이거나 본인이 엿본 칸만 `card`가 채워짐
  - `record BoardView(long playerId, List<SlotView> slots)`
  - `record HeldView(long playerId, DrawSource source, CardView card)` + `static of(PlayerId holder, DrawnCard, boolean visible)` — 들고 있는 본인만 `card`가 채워짐
  - `record RoundView(TurnPhase phase, long currentPlayerId, int deckSize, CardView discardTop, HeldView held, List<BoardView> boards)`
  - `record PlayerResultView(long playerId, int score, RoundOutcome outcome)`, `record RoundResultView(List<PlayerResultView> players)`
  - `record PaperSafariView(long viewerId, GameStatus status, int roundNumber, RoundView round, Map<Long, Integer> tokens, RoundResultView lastRoundResult, Long winnerId)`
  - `PaperSafariGame.viewFor(PlayerId) → PaperSafariView`

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/src/test/java/com/boardgame/papersafari/PaperSafariViewTest.java`
```java
package com.boardgame.papersafari;

import static com.boardgame.papersafari.Fixtures.ALICE;
import static com.boardgame.papersafari.Fixtures.BOB;
import static com.boardgame.papersafari.Fixtures.FIRST;
import static com.boardgame.papersafari.Fixtures.LOSER_HAND;
import static com.boardgame.papersafari.Fixtures.WINNER_HAND;
import static com.boardgame.papersafari.Fixtures.stack;
import static com.boardgame.papersafari.GameFixtures.game;
import static com.boardgame.papersafari.GameFixtures.playRound;
import static com.boardgame.papersafari.GameFixtures.roundWonBy;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.papersafari.view.BoardView;
import com.boardgame.papersafari.view.CardView;
import com.boardgame.papersafari.view.HeldView;
import com.boardgame.papersafari.view.PaperSafariView;
import com.boardgame.papersafari.view.PlayerResultView;
import com.boardgame.papersafari.view.SlotView;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;

class PaperSafariViewTest {

    private static final List<PlayerId> TWO = List.of(ALICE, BOB);

    private PaperSafariGame startedGame(Card... deck) {
        PaperSafariGame game = game(TWO, List.of(
                stack(List.of(WINNER_HAND, LOSER_HAND), Card.number(7), List.of(deck))));
        game.flipInitial(ALICE, FIRST);
        game.flipInitial(BOB, FIRST);
        return game;
    }

    private SlotView slotOf(PaperSafariView view, PlayerId owner, Position position) {
        BoardView board = view.round().boards().stream()
                .filter(candidate -> candidate.playerId() == owner.value())
                .findFirst().orElseThrow();
        return board.slots().stream()
                .filter(slot -> slot.column() == position.column() && slot.row() == position.row())
                .findFirst().orElseThrow();
    }

    @Test
    void 뒷면_카드는_주인에게도_상대에게도_보이지_않는다() {
        PaperSafariGame game = startedGame(Card.number(0));

        PaperSafariView view = game.viewFor(ALICE);

        SlotView bobFirst = slotOf(view, BOB, FIRST);
        assertThat(bobFirst.faceUp()).isTrue();
        assertThat(bobFirst.card()).isEqualTo(new CardView(CardKind.NUMBER, 9));
        SlotView bobHidden = slotOf(view, BOB, new Position(1, 0));
        assertThat(bobHidden.faceUp()).isFalse();
        assertThat(bobHidden.card()).isNull();
        assertThat(slotOf(view, ALICE, new Position(1, 0)).card()).isNull();
    }

    @Test
    void 엿본_카드는_본인에게만_보인다() {
        PaperSafariGame game = startedGame(Card.elephant());
        Position peeked = new Position(2, 0);
        game.drawFromDeck(ALICE);
        game.swapAt(ALICE, new Position(1, 0));
        game.peekAt(ALICE, peeked);

        SlotView mine = slotOf(game.viewFor(ALICE), ALICE, peeked);
        SlotView theirs = slotOf(game.viewFor(BOB), ALICE, peeked);

        assertThat(mine.known()).isTrue();
        assertThat(mine.faceUp()).isFalse();
        assertThat(mine.card()).isEqualTo(new CardView(CardKind.NUMBER, 3));
        assertThat(theirs.known()).isFalse();
        assertThat(theirs.card()).isNull();
    }

    @Test
    void 들고_있는_카드는_본인에게만_보이고_상대에게는_출처만_보인다() {
        PaperSafariGame game = startedGame(Card.number(0));
        game.drawFromDeck(ALICE);

        HeldView mine = game.viewFor(ALICE).round().held();
        HeldView theirs = game.viewFor(BOB).round().held();

        assertThat(mine).isEqualTo(new HeldView(1L, DrawSource.DECK, new CardView(CardKind.NUMBER, 0)));
        assertThat(theirs).isEqualTo(new HeldView(1L, DrawSource.DECK, null));
    }

    @Test
    void 공통_정보는_모두에게_같다() {
        PaperSafariGame game = startedGame(Card.number(0), Card.number(0));

        PaperSafariView view = game.viewFor(BOB);

        assertThat(view.viewerId()).isEqualTo(2L);
        assertThat(view.status()).isEqualTo(GameStatus.IN_ROUND);
        assertThat(view.roundNumber()).isEqualTo(1);
        assertThat(view.round().phase()).isEqualTo(TurnPhase.DRAW);
        assertThat(view.round().currentPlayerId()).isEqualTo(1L);
        assertThat(view.round().deckSize()).isEqualTo(2);
        assertThat(view.round().discardTop()).isEqualTo(new CardView(CardKind.NUMBER, 7));
        assertThat(view.round().held()).isNull();
        assertThat(view.tokens()).isEqualTo(Map.of(1L, 0, 2L, 0));
        assertThat(view.lastRoundResult()).isNull();
        assertThat(view.winnerId()).isNull();
    }

    @Test
    void 라운드가_끝나면_모든_카드와_결과를_보여준다() {
        PaperSafariGame game = game(TWO, List.of(roundWonBy(ALICE)));
        playRound(game, ALICE, BOB);

        PaperSafariView view = game.viewFor(BOB);

        assertThat(view.status()).isEqualTo(GameStatus.ROUND_OVER);
        assertThat(slotOf(view, ALICE, new Position(1, 1)).card()).isEqualTo(new CardView(CardKind.NUMBER, 0));
        assertThat(slotOf(view, BOB, new Position(2, 1)).card()).isEqualTo(new CardView(CardKind.NUMBER, 8));
        assertThat(view.lastRoundResult().players()).containsExactly(
                new PlayerResultView(1L, 1, RoundOutcome.WIN),
                new PlayerResultView(2L, 51, RoundOutcome.LOSE));
        assertThat(view.tokens()).isEqualTo(Map.of(1L, 1, 2L, 0));
    }
}
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest=PaperSafariViewTest`
Expected: FAIL — `package com.boardgame.papersafari.view does not exist`

- [ ] **Step 3: 뷰 레코드 구현**

`view/CardView.java`
```java
package com.boardgame.papersafari.view;

import com.boardgame.papersafari.Card;
import com.boardgame.papersafari.CardKind;

public record CardView(CardKind kind, int value) {

    public static CardView of(Card card) {
        return new CardView(card.kind(), card.faceValue());
    }
}
```

`view/SlotView.java`
```java
package com.boardgame.papersafari.view;

import com.boardgame.papersafari.Position;
import com.boardgame.papersafari.Slot;

public record SlotView(int column, int row, boolean faceUp, boolean known, CardView card) {

    public static SlotView of(Position position, Slot slot, boolean knownByViewer) {
        boolean faceUp = slot.isFaceUp();
        boolean known = knownByViewer && !faceUp;
        CardView card = (faceUp || known) ? CardView.of(slot.card()) : null;
        return new SlotView(position.column(), position.row(), faceUp, known, card);
    }
}
```

`view/BoardView.java`
```java
package com.boardgame.papersafari.view;

import java.util.List;

public record BoardView(long playerId, List<SlotView> slots) {
}
```

`view/HeldView.java`
```java
package com.boardgame.papersafari.view;

import com.boardgame.papersafari.DrawSource;
import com.boardgame.papersafari.DrawnCard;
import com.boardgame.papersafari.PlayerId;

public record HeldView(long playerId, DrawSource source, CardView card) {

    public static HeldView of(PlayerId holder, DrawnCard drawn, boolean visible) {
        CardView card = visible ? CardView.of(drawn.card()) : null;
        return new HeldView(holder.value(), drawn.source(), card);
    }
}
```

`view/RoundView.java`
```java
package com.boardgame.papersafari.view;

import com.boardgame.papersafari.TurnPhase;
import java.util.List;

public record RoundView(
        TurnPhase phase,
        long currentPlayerId,
        int deckSize,
        CardView discardTop,
        HeldView held,
        List<BoardView> boards) {
}
```

`view/PlayerResultView.java`
```java
package com.boardgame.papersafari.view;

import com.boardgame.papersafari.RoundOutcome;

public record PlayerResultView(long playerId, int score, RoundOutcome outcome) {
}
```

`view/RoundResultView.java`
```java
package com.boardgame.papersafari.view;

import java.util.List;

public record RoundResultView(List<PlayerResultView> players) {
}
```

`view/PaperSafariView.java`
```java
package com.boardgame.papersafari.view;

import com.boardgame.papersafari.GameStatus;
import java.util.Map;

public record PaperSafariView(
        long viewerId,
        GameStatus status,
        int roundNumber,
        RoundView round,
        Map<Long, Integer> tokens,
        RoundResultView lastRoundResult,
        Long winnerId) {
}
```

- [ ] **Step 4: 도메인에 뷰 생성 메서드 추가**

`Table.java` — import `com.boardgame.papersafari.view.CardView` 추가 후 메서드 추가:
```java
    public CardView discardTopView() {
        return discardPile.top().map(CardView::of).orElse(null);
    }
```

`Turn.java` — import `com.boardgame.papersafari.view.HeldView` 추가 후 메서드 추가:
```java
    public HeldView heldViewFor(PlayerId viewer) {
        return step.held()
                .map(drawn -> HeldView.of(current, drawn, current.equals(viewer)))
                .orElse(null);
    }
```

`PlayerBoards.java` — import `com.boardgame.papersafari.view.BoardView`, `com.boardgame.papersafari.view.SlotView`, `java.util.List` 추가 후 메서드 추가:
```java
    public List<BoardView> viewFor(PlayerId viewer) {
        return boards.entrySet().stream()
                .map(entry -> boardView(viewer, entry.getKey(), entry.getValue()))
                .toList();
    }

    private BoardView boardView(PlayerId viewer, PlayerId owner, Board board) {
        List<SlotView> slots = Position.all().stream()
                .map(position -> slotView(viewer, owner, board, position))
                .toList();
        return new BoardView(owner.value(), slots);
    }

    private SlotView slotView(PlayerId viewer, PlayerId owner, Board board, Position position) {
        boolean known = viewer.equals(owner) && knownCards.knows(owner, position);
        return SlotView.of(position, board.slotAt(position), known);
    }
```

`PaperSafariRound.java` — import `com.boardgame.papersafari.view.RoundView` 추가 후 메서드 추가:
```java
    public RoundView viewFor(PlayerId viewer) {
        return new RoundView(
                turn.phase(),
                currentPlayer().value(),
                table.deckSize(),
                table.discardTopView(),
                turn.heldViewFor(viewer),
                boards.viewFor(viewer));
    }
```

`RoundResult.java` — import `com.boardgame.papersafari.view.PlayerResultView`, `com.boardgame.papersafari.view.RoundResultView` 추가 후 메서드 추가:
```java
    public RoundResultView toView() {
        List<PlayerResultView> players = scores.keySet().stream()
                .map(this::playerView)
                .toList();
        return new RoundResultView(players);
    }

    private PlayerResultView playerView(PlayerId player) {
        return new PlayerResultView(player.value(), scoreOf(player).value(), outcomeOf(player));
    }
```

`PaperSafariGame.java` — import `com.boardgame.papersafari.view.PaperSafariView`, `com.boardgame.papersafari.view.RoundResultView` 추가 후 메서드 추가:
```java
    public PaperSafariView viewFor(PlayerId viewer) {
        RoundResultView result = lastRoundResult().map(RoundResult::toView).orElse(null);
        Long winnerId = winner().map(PlayerId::value).orElse(null);
        return new PaperSafariView(
                viewer.value(),
                status(),
                roundNumber().value(),
                round().viewFor(viewer),
                tokens.toView(),
                result,
                winnerId);
    }
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest=PaperSafariViewTest`
Expected: PASS

- [ ] **Step 6: 전체 회귀 확인 후 커밋**

Run: `mvn -q -f backend/pom.xml test`
Expected: PASS (전체 테스트 0 failures)

```bash
git add backend
git commit -m "feat: 플레이어 시점 뷰로 비공개 정보 은닉" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## 계획 1 완료 기준

- `mvn -q -f backend/pom.xml test` 전체 통과
- 스펙 §3(규칙 전부), §4(도메인 모델), §5.3(정보 은닉), §5.5의 도메인 측(기권 → 패배자 제외, 1명 남으면 승리, 들고 있던 카드 처리), §8의 `ErrorCode`/`BusinessException`이 테스트로 검증됨
- 다음: 계획 2(회원/인증 + 전역 예외 처리) 문서 작성
