# 계획 3: 방(대기실) + 실시간 진행 + 끊김/기권 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인한 사용자가 방을 만들고(6자리 코드)·참가·시작하고, STOMP WebSocket으로 페이퍼 사파리를 실시간 진행하며, 끊긴 플레이어를 60초 뒤 기권 처리할 수 있게 한다. 라운드/게임 종료는 스프링 이벤트로 발행해 계획 4(전적)가 받는다.

**Architecture:** `game` 패키지는 게임 종류와 무관한 계약(`GameType`, `GameSession`, `GameAction`, `GameOutcome`, 이벤트)을 둔다. 페이퍼 사파리는 `PaperSafariSession`이 `GameSession`을 구현한다. `room` 패키지는 메모리 기반 방 도메인(`Room`, `RoomMembers`, `RoomRegistry`)과 `RoomService`(전역 `synchronized`로 직렬화)를 두고, REST(`/api/rooms`)와 STOMP(`/app/rooms/{code}/...`)로 노출한다. 서버는 매 변경마다 방 정보를 `/topic/rooms/{code}`로, 각 참가자 시점의 게임 화면을 `/user/queue/game`으로 보낸다.

**Tech Stack:** Java 21, Spring Boot 3.5.16, spring-boot-starter-websocket(STOMP, simple broker), Spring Security 세션, JUnit 5, AssertJ, MockMvc, `@MockitoBean`, `@RecordApplicationEvents`, `WebSocketStompClient`

**Spec:** `docs/superpowers/specs/2026-10-05-board-game-platform-design.md` (§2 게임 확장성/상태, §5 방과 실시간 흐름 전부)

### 로드맵 위치
1. ~~페이퍼 사파리 규칙 엔진~~ 2. ~~회원/인증~~ 3. **방 + 실시간 + 끊김/기권** ← 이 문서 4. 전적·승률·순위표 5. 프론트엔드 + Docker

### 스펙 대비 구체화한 결정
- 방 상태 변경은 `RoomService`의 `synchronized` 메서드 하나의 락으로 직렬화한다(지인용 규모; 스펙의 "방 단위 잠금"보다 단순하고 방 간 이동(한 사람 한 방) 경합도 함께 막는다).
- 연결 끊김 후 기권 처리된 사람과 게임 중 "나가기"를 누른 사람은 방에서도 빠진다(스펙 §5.5 "판에서 빠짐").
- WebSocket에 한 번도 연결하지 않은 참가자는 "연결 안 됨"으로 표시하지만 기권 처리 대상은 아니다(끊긴 시각이 없음).
- 다음 라운드 "준비"는 게임 행동 `READY`로 보낸다. 남은(기권 안 한) 참가자 전원이 준비하면 시작.
- 라운드/게임 결과는 `RoundCompletedEvent`/`GameCompletedEvent`(+ 시작 시 `GameStartedEvent`)로 발행한다. 같은 게임의 이벤트는 `matchKey`(UUID)로 묶인다.

## Global Constraints

- Java 21, Spring Boot **3.5.16**, Maven. 기본 패키지 `com.boardgame`. 명령은 저장소 루트에서 `mvn -q -f backend/pom.xml ...`.
- 객체지향 생활 체조(CLAUDE.md): 메서드당 들여쓰기 1단계, `else` 금지, 도메인 원시값 VO 래핑(요청/응답 DTO·이벤트 record는 원시값 허용), 한 줄 점 하나(스트림/Optional/빌더 체인 예외), 로직은 도메인에, 클래스 상태 필드 3개 이하(스프링 빈의 주입 의존성, JPA id는 제외).
- 에러: `BusinessException(ErrorCode)`, REST 응답 본문 `{"status": int, "code": "...", "message": "..."}`; STOMP 에러는 같은 형식으로 `/user/queue/errors`.
- STOMP: 엔드포인트 `/ws`(인증 필요, 허용 origin 패턴 `app.websocket.allowed-origin-patterns`, `*` 금지), 앱 prefix `/app`, 브로커 `/topic`·`/queue`, 사용자 prefix `/user`. 사용자 식별은 `Principal.getName()` = 회원 id 문자열(`LoginMember.idOf(Principal)`).
- 게임 화면은 방에 남아 있는 회원에게만 보낸다. `GAME_OVER` 이후에는 `forfeit`를 부르지 않는다(나가기만 처리).
- 테스트 메서드명은 한국어 문장. 커밋 메시지 마지막 줄: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Review Focus

1. 라운드가 끝난 뒤(ROUND_OVER) 누가 나가도 라운드 결과 이벤트가 두 번 나가지 않음 (Task 1 테스트)
2. 진행 중인 2인 게임에서 한 명이 나가면 게임 종료 이벤트가 나가고 방은 대기 상태로 돌아가 남은 사람이 방장 (Task 3 테스트)
3. 차례가 아닌 사람이 STOMP로 행동을 보내면 연결이 끊기지 않고 본인 `/user/queue/errors`로 `NOT_YOUR_TURN`을 받음 (Task 4 테스트)
4. 상대가 덱에서 뽑은 카드는 내 화면에 값이 보이지 않음 — 실제 STOMP 전송 경로에서 확인 (Task 4 테스트)
5. 끊긴 지 60초가 안 된 사람을 기권 처리하려 하면 거부, 60초가 지나면 기권 → 게임 종료 이벤트 (Task 5 테스트)

---

## File Structure

```
backend/pom.xml                                               (Modify: websocket 스타터)
backend/src/main/resources/application.yml                    (Modify: app.websocket.allowed-origin-patterns)
backend/src/main/java/com/boardgame/common/error/ErrorCode.java (Modify)
backend/src/main/java/com/boardgame/common/config/ClockConfig.java
backend/src/main/java/com/boardgame/common/security/SecurityConfig.java (Modify: /ws/** 인증)
backend/src/main/java/com/boardgame/common/security/LoginMember.java   (Modify: idOf)
backend/src/main/java/com/boardgame/common/websocket/WebSocketConfig.java
backend/src/main/java/com/boardgame/game/
  GameType.java GameAction.java ResultType.java GameOutcome.java RoundCompleted.java RoundEntry.java
  GameCompleted.java MatchEntry.java GameSession.java GameSessionFactory.java GameSessionFactories.java
backend/src/main/java/com/boardgame/game/event/
  GameStartedEvent.java RoundCompletedEvent.java GameCompletedEvent.java
backend/src/main/java/com/boardgame/papersafari/
  Seats.java (Modify: contains) PaperSafariGame.java (Modify: isSeated)
  PaperSafariCommand.java PaperSafariSession.java PaperSafariSessionFactory.java
backend/src/main/java/com/boardgame/papersafari/view/PaperSafariSessionView.java
backend/src/main/java/com/boardgame/room/domain/
  RoomCode.java RoomCodeGenerator.java RandomRoomCodeGenerator.java RoomName.java RoomProfile.java
  Participant.java RoomMembers.java RoomGame.java RoomStatus.java Room.java RoomRegistry.java
backend/src/main/java/com/boardgame/room/application/
  RoomNotifier.java OutcomePublisher.java RoomService.java PresenceTracker.java PresenceEventListener.java
backend/src/main/java/com/boardgame/room/infra/StompRoomNotifier.java
backend/src/main/java/com/boardgame/room/api/
  CreateRoomRequest.java RoomResponse.java RoomMemberResponse.java RoomSummaryResponse.java
  RoomController.java GameMessageController.java
backend/src/test/java/com/boardgame/papersafari/PaperSafariSessionTest.java
backend/src/test/java/com/boardgame/room/domain/
  RoomCodeTest.java RoomNameTest.java FakeGameSession.java RoomTest.java RoomRegistryTest.java
backend/src/test/java/com/boardgame/room/application/OutcomePublisherTest.java PresenceTrackerTest.java
backend/src/test/java/com/boardgame/room/api/RoomApiTest.java StompGameFlowTest.java RoomForfeitApiTest.java
backend/src/test/java/com/boardgame/common/security/LoginMemberTest.java (Modify)
backend/src/test/java/com/boardgame/support/MutableClock.java ApiUsers.java
```

---

### Task 1: 게임 공통 계약과 페이퍼 사파리 세션

**Files:**
- Create: `backend/src/main/java/com/boardgame/game/{GameType,GameAction,ResultType,GameOutcome,RoundCompleted,RoundEntry,GameCompleted,MatchEntry,GameSession,GameSessionFactory,GameSessionFactories}.java`
- Create: `backend/src/main/java/com/boardgame/papersafari/{PaperSafariCommand,PaperSafariSession,PaperSafariSessionFactory}.java`, `backend/src/main/java/com/boardgame/papersafari/view/PaperSafariSessionView.java`
- Modify: `backend/src/main/java/com/boardgame/papersafari/Seats.java`, `PaperSafariGame.java`
- Test: `backend/src/test/java/com/boardgame/papersafari/PaperSafariSessionTest.java`

**Interfaces:**
- Consumes: `PaperSafariGame`(start/flipInitial/drawFromDeck/drawFromDiscard/swapAt/discardDrawn/peekAt/startNextRound/forfeit/status/winner/lastRoundResult/roundNumber/tokensOf/viewFor), `RoundFactory(CardShuffler, IntUnaryOperator)`, `RoundFactory.random()`, `RoundResult.players()/outcomeOf/scoreOf`, 테스트 `StackedShuffler.rounds`, `Fixtures`, `GameFixtures.roundWonBy`
- Produces:
  - `enum GameType { PAPER_SAFARI }` — `displayName()`, `minPlayers()`, `maxPlayers()`
  - `record GameAction(String type, Integer column, Integer row)`
  - `enum ResultType { WIN, DRAW, LOSE }`
  - `sealed interface GameOutcome permits RoundCompleted, GameCompleted`
  - `record RoundCompleted(int roundNumber, List<RoundEntry> entries)`, `record RoundEntry(long memberId, ResultType result, int score)`
  - `record GameCompleted(List<MatchEntry> entries)`, `record MatchEntry(long memberId, ResultType result, int tokens, int seat)`
  - `interface GameSession { List<GameOutcome> act(long memberId, GameAction action); List<GameOutcome> forfeit(long memberId); Object viewFor(long memberId); boolean isFinished(); boolean isPlaying(long memberId); }`
  - `interface GameSessionFactory { GameType type(); GameSession create(List<Long> memberIds); }`
  - `@Component GameSessionFactories` — `GameSession create(GameType type, List<Long> memberIds)`
  - `PaperSafariSession implements GameSession` — 생성자 `(List<Long> memberIds, RoundFactory factory)`; 행동 타입 `FLIP`(위치), `DRAW_DECK`, `DRAW_DISCARD`, `SWAP`(위치), `DISCARD`, `PEEK`(위치), `READY`
  - `record PaperSafariSessionView(PaperSafariView game, List<Long> readyPlayerIds)`
  - `Seats.contains(PlayerId)`, `PaperSafariGame.isSeated(PlayerId)`

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/src/test/java/com/boardgame/papersafari/PaperSafariSessionTest.java`
```java
package com.boardgame.papersafari;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static com.boardgame.papersafari.Fixtures.ALICE;
import static com.boardgame.papersafari.Fixtures.FIRST;
import static com.boardgame.papersafari.Fixtures.REST;
import static com.boardgame.papersafari.GameFixtures.roundWonBy;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.MatchEntry;
import com.boardgame.game.ResultType;
import com.boardgame.game.RoundCompleted;
import com.boardgame.game.RoundEntry;
import com.boardgame.papersafari.view.PaperSafariSessionView;
import com.boardgame.papersafari.view.PaperSafariView;
import java.util.List;
import org.junit.jupiter.api.Test;

class PaperSafariSessionTest {

    private static final long A = 1L;
    private static final long B = 2L;

    private PaperSafariSession session(List<List<Card>> rounds) {
        return new PaperSafariSession(List.of(A, B), new RoundFactory(StackedShuffler.rounds(rounds), count -> 0));
    }

    private List<GameOutcome> act(PaperSafariSession session, long memberId, String type) {
        return session.act(memberId, new GameAction(type, null, null));
    }

    private List<GameOutcome> act(PaperSafariSession session, long memberId, String type, Position position) {
        return session.act(memberId, new GameAction(type, position.column(), position.row()));
    }

    private PaperSafariSessionView sessionView(PaperSafariSession session, long memberId) {
        return (PaperSafariSessionView) session.viewFor(memberId);
    }

    private PaperSafariView view(PaperSafariSession session, long memberId) {
        return sessionView(session, memberId).game();
    }

    // finisher가 0으로 5칸을 채워 라운드를 끝낸다. other는 자기 차례에 뽑아서 버린다. 마지막 행동의 결과를 돌려준다.
    private List<GameOutcome> playRound(PaperSafariSession session, long finisher, long other) {
        act(session, A, "FLIP", FIRST);
        act(session, B, "FLIP", FIRST);
        List<GameOutcome> last = List.of();
        for (Position position : REST) {
            passIfTurnOf(session, other);
            act(session, finisher, "DRAW_DECK");
            last = act(session, finisher, "SWAP", position);
        }
        return last;
    }

    private void passIfTurnOf(PaperSafariSession session, long player) {
        if (view(session, player).round().currentPlayerId() != player) {
            return;
        }
        act(session, player, "DRAW_DECK");
        act(session, player, "DISCARD");
    }

    private void readyAll(PaperSafariSession session) {
        act(session, A, "READY");
        act(session, B, "READY");
    }

    @Test
    void 행동_종류에_따라_게임을_진행한다() {
        PaperSafariSession session = session(List.of(roundWonBy(ALICE)));

        List<GameOutcome> outcomes = act(session, A, "FLIP", FIRST);
        act(session, B, "FLIP", FIRST);

        assertThat(outcomes).isEmpty();
        assertThat(view(session, A).round().phase()).isEqualTo(TurnPhase.DRAW);
        assertThat(session.isPlaying(A)).isTrue();
        assertThat(session.isFinished()).isFalse();
    }

    @Test
    void 알_수_없는_행동이나_위치가_빠진_행동은_INVALID_INPUT() {
        PaperSafariSession session = session(List.of(roundWonBy(ALICE)));

        assertError(() -> act(session, A, "JUMP"), ErrorCode.INVALID_INPUT);
        assertError(() -> act(session, A, "FLIP"), ErrorCode.INVALID_INPUT);
        assertError(() -> session.act(A, new GameAction(null, null, null)), ErrorCode.INVALID_INPUT);
    }

    @Test
    void 라운드가_끝나면_라운드_결과를_돌려준다() {
        PaperSafariSession session = session(List.of(roundWonBy(ALICE)));

        List<GameOutcome> outcomes = playRound(session, A, B);

        assertThat(outcomes).containsExactly(new RoundCompleted(1, List.of(
                new RoundEntry(A, ResultType.WIN, 1),
                new RoundEntry(B, ResultType.LOSE, 51))));
    }

    @Test
    void 라운드가_끝나기_전에는_준비할_수_없다() {
        PaperSafariSession session = session(List.of(roundWonBy(ALICE)));

        assertError(() -> act(session, A, "READY"), ErrorCode.INVALID_PHASE);
    }

    @Test
    void 남은_참가자가_모두_준비하면_다음_라운드가_시작된다() {
        PaperSafariSession session = session(List.of(roundWonBy(ALICE), roundWonBy(ALICE)));
        playRound(session, A, B);

        assertThat(act(session, A, "READY")).isEmpty();
        assertThat(sessionView(session, B).readyPlayerIds()).containsExactly(A);
        act(session, B, "READY");

        assertThat(view(session, A).roundNumber()).isEqualTo(2);
        assertThat(view(session, A).round().phase()).isEqualTo(TurnPhase.SETUP_FLIP);
        assertThat(sessionView(session, A).readyPlayerIds()).isEmpty();
    }

    @Test
    void 마지막_라운드가_끝나면_라운드_결과와_게임_결과를_함께_돌려준다() {
        PaperSafariSession session = session(List.of(roundWonBy(ALICE), roundWonBy(ALICE), roundWonBy(ALICE)));
        playRound(session, A, B);
        readyAll(session);
        playRound(session, A, B);
        readyAll(session);

        List<GameOutcome> outcomes = playRound(session, A, B);

        assertThat(outcomes).containsExactly(
                new RoundCompleted(3, List.of(new RoundEntry(A, ResultType.WIN, 1), new RoundEntry(B, ResultType.LOSE, 51))),
                new GameCompleted(List.of(new MatchEntry(A, ResultType.WIN, 3, 0), new MatchEntry(B, ResultType.LOSE, 0, 1))));
        assertThat(session.isFinished()).isTrue();
    }

    @Test
    void 기권으로_한_명만_남으면_게임_결과만_돌려준다() {
        PaperSafariSession session = session(List.of(roundWonBy(ALICE)));

        List<GameOutcome> outcomes = session.forfeit(B);

        assertThat(outcomes).containsExactly(new GameCompleted(List.of(
                new MatchEntry(A, ResultType.WIN, 0, 0),
                new MatchEntry(B, ResultType.LOSE, 0, 1))));
        assertThat(session.isFinished()).isTrue();
        assertThat(session.isPlaying(A)).isFalse();
    }

    @Test
    void 라운드가_끝난_뒤_기권해도_라운드_결과는_다시_보내지_않는다() {
        PaperSafariSession session = session(List.of(roundWonBy(ALICE)));
        playRound(session, A, B);

        List<GameOutcome> outcomes = session.forfeit(B);

        assertThat(outcomes).hasSize(1);
        assertThat(outcomes.get(0)).isEqualTo(new GameCompleted(List.of(
                new MatchEntry(A, ResultType.WIN, 1, 0),
                new MatchEntry(B, ResultType.LOSE, 0, 1))));
    }
}
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest=PaperSafariSessionTest`
Expected: FAIL — `package com.boardgame.game does not exist`

- [ ] **Step 3: 게임 공통 계약 구현**

`backend/src/main/java/com/boardgame/game/GameType.java`
```java
package com.boardgame.game;

public enum GameType {
    PAPER_SAFARI("페이퍼 사파리", 2, 5);

    private final String displayName;
    private final int minPlayers;
    private final int maxPlayers;

    GameType(String displayName, int minPlayers, int maxPlayers) {
        this.displayName = displayName;
        this.minPlayers = minPlayers;
        this.maxPlayers = maxPlayers;
    }

    public String displayName() {
        return displayName;
    }

    public int minPlayers() {
        return minPlayers;
    }

    public int maxPlayers() {
        return maxPlayers;
    }
}
```

`backend/src/main/java/com/boardgame/game/GameAction.java`
```java
package com.boardgame.game;

public record GameAction(String type, Integer column, Integer row) {
}
```

`backend/src/main/java/com/boardgame/game/ResultType.java`
```java
package com.boardgame.game;

public enum ResultType {
    WIN, DRAW, LOSE
}
```

`backend/src/main/java/com/boardgame/game/GameOutcome.java`
```java
package com.boardgame.game;

public sealed interface GameOutcome permits RoundCompleted, GameCompleted {
}
```

`backend/src/main/java/com/boardgame/game/RoundEntry.java`
```java
package com.boardgame.game;

public record RoundEntry(long memberId, ResultType result, int score) {
}
```

`backend/src/main/java/com/boardgame/game/RoundCompleted.java`
```java
package com.boardgame.game;

import java.util.List;

public record RoundCompleted(int roundNumber, List<RoundEntry> entries) implements GameOutcome {
}
```

`backend/src/main/java/com/boardgame/game/MatchEntry.java`
```java
package com.boardgame.game;

public record MatchEntry(long memberId, ResultType result, int tokens, int seat) {
}
```

`backend/src/main/java/com/boardgame/game/GameCompleted.java`
```java
package com.boardgame.game;

import java.util.List;

public record GameCompleted(List<MatchEntry> entries) implements GameOutcome {
}
```

`backend/src/main/java/com/boardgame/game/GameSession.java`
```java
package com.boardgame.game;

import java.util.List;

public interface GameSession {

    List<GameOutcome> act(long memberId, GameAction action);

    List<GameOutcome> forfeit(long memberId);

    Object viewFor(long memberId);

    boolean isFinished();

    boolean isPlaying(long memberId);
}
```

`backend/src/main/java/com/boardgame/game/GameSessionFactory.java`
```java
package com.boardgame.game;

import java.util.List;

public interface GameSessionFactory {

    GameType type();

    GameSession create(List<Long> memberIds);
}
```

`backend/src/main/java/com/boardgame/game/GameSessionFactories.java`
```java
package com.boardgame.game;

import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class GameSessionFactories {

    private final Map<GameType, GameSessionFactory> factories = new EnumMap<>(GameType.class);

    public GameSessionFactories(List<GameSessionFactory> factories) {
        factories.forEach(factory -> this.factories.put(factory.type(), factory));
    }

    public GameSession create(GameType type, List<Long> memberIds) {
        GameSessionFactory factory = factories.get(type);
        if (factory == null) {
            throw new IllegalStateException("등록되지 않은 게임입니다: " + type);
        }
        return factory.create(memberIds);
    }
}
```

- [ ] **Step 4: 페이퍼 사파리 세션 구현**

`Seats.java` — `size()` 메서드 아래에 추가:
```java
    public boolean contains(PlayerId player) {
        return seated.contains(player);
    }
```

`PaperSafariGame.java` — `tokensOf` 메서드 아래에 추가:
```java
    public boolean isSeated(PlayerId player) {
        return seats.contains(player);
    }
```

`backend/src/main/java/com/boardgame/papersafari/view/PaperSafariSessionView.java`
```java
package com.boardgame.papersafari.view;

import java.util.List;

public record PaperSafariSessionView(PaperSafariView game, List<Long> readyPlayerIds) {
}
```

`backend/src/main/java/com/boardgame/papersafari/PaperSafariCommand.java`
```java
package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameAction;
import java.util.Arrays;

enum PaperSafariCommand {
    FLIP {
        @Override
        void apply(PaperSafariGame game, PlayerId player, GameAction action) {
            game.flipInitial(player, positionOf(action));
        }
    },
    DRAW_DECK {
        @Override
        void apply(PaperSafariGame game, PlayerId player, GameAction action) {
            game.drawFromDeck(player);
        }
    },
    DRAW_DISCARD {
        @Override
        void apply(PaperSafariGame game, PlayerId player, GameAction action) {
            game.drawFromDiscard(player);
        }
    },
    SWAP {
        @Override
        void apply(PaperSafariGame game, PlayerId player, GameAction action) {
            game.swapAt(player, positionOf(action));
        }
    },
    DISCARD {
        @Override
        void apply(PaperSafariGame game, PlayerId player, GameAction action) {
            game.discardDrawn(player);
        }
    },
    PEEK {
        @Override
        void apply(PaperSafariGame game, PlayerId player, GameAction action) {
            game.peekAt(player, positionOf(action));
        }
    };

    abstract void apply(PaperSafariGame game, PlayerId player, GameAction action);

    static PaperSafariCommand of(String type) {
        return Arrays.stream(values())
                .filter(command -> command.name().equals(type))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_INPUT));
    }

    private static Position positionOf(GameAction action) {
        if (action.column() == null || action.row() == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        return new Position(action.column(), action.row());
    }
}
```

`backend/src/main/java/com/boardgame/papersafari/PaperSafariSession.java`
```java
package com.boardgame.papersafari;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.GameSession;
import com.boardgame.game.MatchEntry;
import com.boardgame.game.ResultType;
import com.boardgame.game.RoundCompleted;
import com.boardgame.game.RoundEntry;
import com.boardgame.papersafari.view.PaperSafariSessionView;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.IntStream;

public class PaperSafariSession implements GameSession {

    private static final String READY = "READY";

    private final PaperSafariGame game;
    private final List<Long> participants;
    private final Set<Long> readyVotes = new HashSet<>();

    public PaperSafariSession(List<Long> memberIds, RoundFactory factory) {
        this.participants = List.copyOf(memberIds);
        this.game = PaperSafariGame.start(memberIds.stream().map(PlayerId::new).toList(), factory);
    }

    @Override
    public List<GameOutcome> act(long memberId, GameAction action) {
        GameStatus before = game.status();
        apply(memberId, action);
        return outcomesSince(before);
    }

    @Override
    public List<GameOutcome> forfeit(long memberId) {
        GameStatus before = game.status();
        game.forfeit(new PlayerId(memberId));
        readyVotes.remove(memberId);
        startNextRoundIfAllReady();
        return outcomesSince(before);
    }

    @Override
    public Object viewFor(long memberId) {
        List<Long> ready = readyVotes.stream().sorted().toList();
        return new PaperSafariSessionView(game.viewFor(new PlayerId(memberId)), ready);
    }

    @Override
    public boolean isFinished() {
        return game.status() == GameStatus.GAME_OVER;
    }

    @Override
    public boolean isPlaying(long memberId) {
        return !isFinished() && game.isSeated(new PlayerId(memberId));
    }

    private void apply(long memberId, GameAction action) {
        if (READY.equals(action.type())) {
            voteReady(memberId);
            return;
        }
        PaperSafariCommand.of(action.type()).apply(game, new PlayerId(memberId), action);
    }

    private void voteReady(long memberId) {
        if (game.status() != GameStatus.ROUND_OVER) {
            throw new BusinessException(ErrorCode.INVALID_PHASE);
        }
        if (!game.isSeated(new PlayerId(memberId))) {
            throw new BusinessException(ErrorCode.NOT_A_PLAYER);
        }
        readyVotes.add(memberId);
        startNextRoundIfAllReady();
    }

    private void startNextRoundIfAllReady() {
        if (game.status() != GameStatus.ROUND_OVER || !allSeatedReady()) {
            return;
        }
        readyVotes.clear();
        game.startNextRound();
    }

    private boolean allSeatedReady() {
        return participants.stream()
                .filter(memberId -> game.isSeated(new PlayerId(memberId)))
                .allMatch(readyVotes::contains);
    }

    private List<GameOutcome> outcomesSince(GameStatus before) {
        List<GameOutcome> outcomes = new ArrayList<>();
        roundCompletedSince(before).ifPresent(outcomes::add);
        gameCompletedSince(before).ifPresent(outcomes::add);
        return outcomes;
    }

    private Optional<GameOutcome> roundCompletedSince(GameStatus before) {
        if (before != GameStatus.IN_ROUND) {
            return Optional.empty();
        }
        return game.lastRoundResult().map(this::toRoundCompleted);
    }

    private Optional<GameOutcome> gameCompletedSince(GameStatus before) {
        if (before == GameStatus.GAME_OVER || !isFinished()) {
            return Optional.empty();
        }
        return Optional.of(toGameCompleted());
    }

    private RoundCompleted toRoundCompleted(RoundResult result) {
        List<RoundEntry> entries = result.players().stream()
                .map(player -> roundEntry(result, player))
                .toList();
        RoundNumber number = game.roundNumber();
        return new RoundCompleted(number.value(), entries);
    }

    private RoundEntry roundEntry(RoundResult result, PlayerId player) {
        ResultType type = ResultType.valueOf(result.outcomeOf(player).name());
        Score score = result.scoreOf(player);
        return new RoundEntry(player.value(), type, score.value());
    }

    private GameCompleted toGameCompleted() {
        PlayerId winner = game.winner().orElseThrow();
        List<MatchEntry> entries = IntStream.range(0, participants.size())
                .mapToObj(seat -> matchEntry(seat, winner))
                .toList();
        return new GameCompleted(entries);
    }

    private MatchEntry matchEntry(int seat, PlayerId winner) {
        PlayerId player = new PlayerId(participants.get(seat));
        ResultType result = player.equals(winner) ? ResultType.WIN : ResultType.LOSE;
        TokenCount tokens = game.tokensOf(player);
        return new MatchEntry(player.value(), result, tokens.value(), seat);
    }
}
```

`backend/src/main/java/com/boardgame/papersafari/PaperSafariSessionFactory.java`
```java
package com.boardgame.papersafari;

import com.boardgame.game.GameSession;
import com.boardgame.game.GameSessionFactory;
import com.boardgame.game.GameType;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class PaperSafariSessionFactory implements GameSessionFactory {

    @Override
    public GameType type() {
        return GameType.PAPER_SAFARI;
    }

    @Override
    public GameSession create(List<Long> memberIds) {
        return new PaperSafariSession(memberIds, RoundFactory.random());
    }
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest=PaperSafariSessionTest`
Expected: PASS (8 tests)

- [ ] **Step 6: 전체 회귀 확인 후 커밋**

Run: `mvn -q -f backend/pom.xml test`
Expected: PASS

```bash
git add backend
git commit -m "feat: 게임 공통 계약과 페이퍼 사파리 세션" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 방 도메인(메모리)

**Files:**
- Modify: `backend/src/main/java/com/boardgame/common/error/ErrorCode.java`
- Create: `backend/src/main/java/com/boardgame/room/domain/{RoomCode,RoomCodeGenerator,RandomRoomCodeGenerator,RoomName,RoomProfile,Participant,RoomMembers,RoomGame,RoomStatus,Room,RoomRegistry}.java`
- Test: `backend/src/test/java/com/boardgame/room/domain/{RoomCodeTest,RoomNameTest,FakeGameSession,RoomTest,RoomRegistryTest}.java`

**Interfaces:**
- Consumes: Task 1 `GameType`, `GameSession`, `GameAction`, `GameOutcome`, `GameCompleted`; `ErrorAssertions.assertError`
- Produces:
  - ErrorCode: `ROOM_NOT_FOUND`(404), `ROOM_FULL`(409), `ALREADY_IN_ROOM`(409), `NOT_IN_ROOM`(403), `NOT_ROOM_HOST`(403), `NOT_ENOUGH_PLAYERS`(409), `ROOM_ALREADY_PLAYING`(409), `GAME_NOT_STARTED`(409), `INVALID_ROOM_NAME`(400)
  - `record RoomCode(String value)` — 6자 `[A-Z0-9]`, 아니면 `ROOM_NOT_FOUND`; `static parse(String)`(대문자화)
  - `interface RoomCodeGenerator { RoomCode next(); }`, `@Component RandomRoomCodeGenerator`(헷갈리는 0·O·1·I 제외)
  - `record RoomName(String value)` — 앞뒤 공백 제거 1~20자, 아니면 `INVALID_ROOM_NAME`
  - `record RoomProfile(RoomCode code, RoomName name, GameType gameType)`, `record Participant(long memberId, String nickname)`
  - `class RoomMembers` — `add(Participant, GameType)`, `remove(long)`, `contains(long)`, `requireMember(long)`(`NOT_IN_ROOM`), `hostId()`, `isHost(long)`, `isEmpty()`, `size()`, `ids()`, `asList()`
  - `record RoomGame(GameSession session, String matchKey, Instant startedAt)` — `isFinished()`, `isPlaying(long)`, `act`, `forfeit`, `viewFor`
  - `enum RoomStatus { WAITING, PLAYING }`
  - `class Room` — `static open(RoomProfile, Participant host)`, `join(Participant)`, `List<GameOutcome> leave(long)`, `RoomGame start(long requesterId, Function<List<Long>, GameSession> sessionCreator, String matchKey, Instant startedAt)`, `List<GameOutcome> act(long, GameAction)`, `Optional<Object> viewFor(long)`, `RoomStatus status()`, `boolean isPlaying(long)`, `boolean isWaitingFor(GameType)`(null이면 종류 무관), `RoomGame currentGame()`, `requireMember(long)`, `contains(long)`, `isEmpty()`, `RoomCode code()`, `String codeValue()`, `String nameValue()`, `GameType gameType()`, `long hostId()`, `List<Participant> participants()`, `List<Long> memberIds()`
  - `@Component RoomRegistry` — `save(Room)`(회원 색인 갱신, 빈 방 삭제), `Room get(RoomCode)`(`ROOM_NOT_FOUND`), `Optional<Room> findByMember(long)`, `List<Room> all()`, `boolean exists(RoomCode)`

- [ ] **Step 1: 에러 코드 추가**

`ErrorCode.java` — `INVALID_PLAYER_COUNT(` 줄 바로 위에 추가:
```java
    ROOM_NOT_FOUND(HttpStatus.NOT_FOUND, "방을 찾을 수 없습니다."),
    ROOM_FULL(HttpStatus.CONFLICT, "방이 가득 찼습니다."),
    ALREADY_IN_ROOM(HttpStatus.CONFLICT, "이미 다른 방에 참여 중입니다."),
    NOT_IN_ROOM(HttpStatus.FORBIDDEN, "이 방의 참가자가 아닙니다."),
    NOT_ROOM_HOST(HttpStatus.FORBIDDEN, "방장만 할 수 있습니다."),
    NOT_ENOUGH_PLAYERS(HttpStatus.CONFLICT, "인원이 부족해 시작할 수 없습니다."),
    ROOM_ALREADY_PLAYING(HttpStatus.CONFLICT, "이미 게임이 진행 중인 방입니다."),
    GAME_NOT_STARTED(HttpStatus.CONFLICT, "게임이 시작되지 않았습니다."),
    INVALID_ROOM_NAME(HttpStatus.BAD_REQUEST, "방 이름은 1~20자로 입력해 주세요."),

```

- [ ] **Step 2: 실패하는 테스트 작성**

`backend/src/test/java/com/boardgame/room/domain/RoomCodeTest.java`
```java
package com.boardgame.room.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class RoomCodeTest {

    @Test
    void 소문자로_입력해도_대문자_코드가_된다() {
        assertThat(RoomCode.parse("ab12cd")).isEqualTo(new RoomCode("AB12CD"));
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"ABC", "ABCDEFG", "AB-12C"})
    void 형식이_맞지_않으면_ROOM_NOT_FOUND(String value) {
        assertError(() -> RoomCode.parse(value), ErrorCode.ROOM_NOT_FOUND);
    }

    @Test
    void 생성기는_헷갈리는_문자_없이_6자리_코드를_만든다() {
        RandomRoomCodeGenerator generator = new RandomRoomCodeGenerator();

        IntStream.range(0, 200).forEach(index -> assertThat(generator.next().value())
                .matches("^[A-Z0-9]{6}$")
                .doesNotContain("0", "O", "1", "I"));
    }
}
```

`backend/src/test/java/com/boardgame/room/domain/RoomNameTest.java`
```java
package com.boardgame.room.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullAndEmptySource;
import org.junit.jupiter.params.provider.ValueSource;

class RoomNameTest {

    @Test
    void 앞뒤_공백을_지우고_20자까지_허용한다() {
        assertThat(new RoomName("  즐거운 방  ").value()).isEqualTo("즐거운 방");
        assertThat(new RoomName("가".repeat(20)).value()).hasSize(20);
    }

    @ParameterizedTest
    @NullAndEmptySource
    @ValueSource(strings = {"   ", "가가가가가가가가가가가가가가가가가가가가가"})
    void 길이가_맞지_않으면_INVALID_ROOM_NAME(String value) {
        assertError(() -> new RoomName(value), ErrorCode.INVALID_ROOM_NAME);
    }
}
```

`backend/src/test/java/com/boardgame/room/domain/FakeGameSession.java`
```java
package com.boardgame.room.domain;

import com.boardgame.game.GameAction;
import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.GameSession;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class FakeGameSession implements GameSession {

    private final List<Long> players;
    private final Set<Long> forfeited = new HashSet<>();
    private final List<GameAction> actions = new ArrayList<>();
    private boolean finished;

    public FakeGameSession(List<Long> players) {
        this.players = List.copyOf(players);
    }

    @Override
    public List<GameOutcome> act(long memberId, GameAction action) {
        actions.add(action);
        return List.of();
    }

    @Override
    public List<GameOutcome> forfeit(long memberId) {
        forfeited.add(memberId);
        if (players.size() - forfeited.size() > 1) {
            return List.of();
        }
        finished = true;
        return List.of(new GameCompleted(List.of()));
    }

    @Override
    public Object viewFor(long memberId) {
        return "view-" + memberId;
    }

    @Override
    public boolean isFinished() {
        return finished;
    }

    @Override
    public boolean isPlaying(long memberId) {
        return !finished && players.contains(memberId) && !forfeited.contains(memberId);
    }

    public void finish() {
        finished = true;
    }

    public List<GameAction> actions() {
        return actions;
    }
}
```

`backend/src/test/java/com/boardgame/room/domain/RoomTest.java`
```java
package com.boardgame.room.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameType;
import java.time.Instant;
import java.util.List;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;

class RoomTest {

    private static final Instant NOW = Instant.parse("2026-10-05T10:00:00Z");
    private final Participant alice = new Participant(1L, "앨리스");
    private final Participant bob = new Participant(2L, "밥");
    private final Participant carol = new Participant(3L, "캐롤");
    private final AtomicReference<FakeGameSession> created = new AtomicReference<>();

    private Room openRoom() {
        return Room.open(new RoomProfile(new RoomCode("ABCDEF"), new RoomName("방"), GameType.PAPER_SAFARI), alice);
    }

    private RoomGame start(Room room, long requester) {
        return room.start(requester, ids -> {
            FakeGameSession session = new FakeGameSession(ids);
            created.set(session);
            return session;
        }, "match-1", NOW);
    }

    @Test
    void 방을_열면_만든_사람이_방장이고_대기_중이다() {
        Room room = openRoom();

        assertThat(room.hostId()).isEqualTo(1L);
        assertThat(room.status()).isEqualTo(RoomStatus.WAITING);
        assertThat(room.codeValue()).isEqualTo("ABCDEF");
        assertThat(room.nameValue()).isEqualTo("방");
        assertThat(room.participants()).containsExactly(alice);
        assertThat(room.isWaitingFor(GameType.PAPER_SAFARI)).isTrue();
        assertThat(room.isWaitingFor(null)).isTrue();
    }

    @Test
    void 참가하면_순서대로_들어오고_이미_있으면_무시한다() {
        Room room = openRoom();

        room.join(bob);
        room.join(bob);

        assertThat(room.memberIds()).containsExactly(1L, 2L);
    }

    @Test
    void 최대_인원을_넘으면_ROOM_FULL() {
        Room room = openRoom();
        room.join(new Participant(2L, "둘"));
        room.join(new Participant(3L, "셋"));
        room.join(new Participant(4L, "넷"));
        room.join(new Participant(5L, "다섯"));

        assertError(() -> room.join(new Participant(6L, "여섯")), ErrorCode.ROOM_FULL);
    }

    @Test
    void 방장이_나가면_다음_사람이_방장이다() {
        Room room = openRoom();
        room.join(bob);

        room.leave(1L);

        assertThat(room.hostId()).isEqualTo(2L);
        assertThat(room.contains(1L)).isFalse();
    }

    @Test
    void 참가자가_아니면_NOT_IN_ROOM() {
        Room room = openRoom();

        assertError(() -> room.leave(9L), ErrorCode.NOT_IN_ROOM);
        assertError(() -> room.act(9L, new GameAction("DRAW_DECK", null, null)), ErrorCode.NOT_IN_ROOM);
        assertError(() -> start(room, 9L), ErrorCode.NOT_IN_ROOM);
    }

    @Test
    void 방장만_시작할_수_있고_혼자서는_시작할_수_없다() {
        Room room = openRoom();
        assertError(() -> start(room, 1L), ErrorCode.NOT_ENOUGH_PLAYERS);
        room.join(bob);

        assertError(() -> start(room, 2L), ErrorCode.NOT_ROOM_HOST);
    }

    @Test
    void 시작하면_진행_중이고_새로운_사람은_참가할_수_없다() {
        Room room = openRoom();
        room.join(bob);

        RoomGame game = start(room, 1L);

        assertThat(game.matchKey()).isEqualTo("match-1");
        assertThat(game.startedAt()).isEqualTo(NOW);
        assertThat(room.status()).isEqualTo(RoomStatus.PLAYING);
        assertThat(room.isWaitingFor(GameType.PAPER_SAFARI)).isFalse();
        assertThat(room.isPlaying(2L)).isTrue();
        assertThat(room.viewFor(2L)).contains("view-2");
        room.join(bob);
        assertError(() -> room.join(carol), ErrorCode.ROOM_ALREADY_PLAYING);
        assertError(() -> start(room, 1L), ErrorCode.ROOM_ALREADY_PLAYING);
    }

    @Test
    void 시작_전에는_게임_행동을_할_수_없다() {
        Room room = openRoom();

        assertError(() -> room.act(1L, new GameAction("DRAW_DECK", null, null)), ErrorCode.GAME_NOT_STARTED);
        assertThat(room.viewFor(1L)).isEmpty();
    }

    @Test
    void 진행_중_행동은_세션으로_전달된다() {
        Room room = openRoom();
        room.join(bob);
        start(room, 1L);

        room.act(2L, new GameAction("DRAW_DECK", null, null));

        assertThat(created.get().actions()).containsExactly(new GameAction("DRAW_DECK", null, null));
    }

    @Test
    void 진행_중에_나가면_기권_처리되고_결과를_돌려준다() {
        Room room = openRoom();
        room.join(bob);
        start(room, 1L);

        assertThat(room.leave(2L)).containsExactly(new GameCompleted(List.of()));
        assertThat(room.status()).isEqualTo(RoomStatus.WAITING);
        assertThat(room.memberIds()).containsExactly(1L);
    }

    @Test
    void 게임이_끝나면_대기_상태로_돌아가_다시_시작할_수_있다() {
        Room room = openRoom();
        room.join(bob);
        start(room, 1L);
        created.get().finish();

        assertThat(room.status()).isEqualTo(RoomStatus.WAITING);
        assertThat(room.leave(2L)).isEmpty();
        room.join(carol);
        RoomGame second = start(room, 1L);

        assertThat(second.session()).isSameAs(created.get());
        assertThat(room.currentGame()).isSameAs(second);
    }
}
```

`backend/src/test/java/com/boardgame/room/domain/RoomRegistryTest.java`
```java
package com.boardgame.room.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameType;
import org.junit.jupiter.api.Test;

class RoomRegistryTest {

    private final RoomRegistry registry = new RoomRegistry();

    private Room room(String code, long hostId) {
        RoomProfile profile = new RoomProfile(new RoomCode(code), new RoomName("방"), GameType.PAPER_SAFARI);
        return Room.open(profile, new Participant(hostId, "호스트" + hostId));
    }

    @Test
    void 저장한_방을_코드와_회원으로_찾는다() {
        Room room = room("ABCDEF", 1L);
        room.join(new Participant(2L, "밥"));

        registry.save(room);

        assertThat(registry.get(new RoomCode("ABCDEF"))).isSameAs(room);
        assertThat(registry.findByMember(2L)).containsSame(room);
        assertThat(registry.exists(new RoomCode("ABCDEF"))).isTrue();
        assertThat(registry.all()).containsExactly(room);
    }

    @Test
    void 나간_회원은_색인에서_빠지고_빈_방은_사라진다() {
        Room room = room("ABCDEF", 1L);
        room.join(new Participant(2L, "밥"));
        registry.save(room);

        room.leave(2L);
        registry.save(room);
        assertThat(registry.findByMember(2L)).isEmpty();

        room.leave(1L);
        registry.save(room);
        assertThat(registry.exists(new RoomCode("ABCDEF"))).isFalse();
        assertThat(registry.findByMember(1L)).isEmpty();
    }

    @Test
    void 없는_코드는_ROOM_NOT_FOUND() {
        assertError(() -> registry.get(new RoomCode("ZZZZZZ")), ErrorCode.ROOM_NOT_FOUND);
    }
}
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest='RoomCodeTest,RoomNameTest,RoomTest,RoomRegistryTest'`
Expected: FAIL — `cannot find symbol: class RoomCode`

- [ ] **Step 4: 구현**

`backend/src/main/java/com/boardgame/room/domain/RoomCode.java`
```java
package com.boardgame.room.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.Locale;
import java.util.regex.Pattern;

public record RoomCode(String value) {

    private static final Pattern FORMAT = Pattern.compile("^[A-Z0-9]{6}$");

    public RoomCode {
        if (value == null || !FORMAT.matcher(value).matches()) {
            throw new BusinessException(ErrorCode.ROOM_NOT_FOUND);
        }
    }

    public static RoomCode parse(String raw) {
        if (raw == null) {
            throw new BusinessException(ErrorCode.ROOM_NOT_FOUND);
        }
        return new RoomCode(raw.toUpperCase(Locale.ROOT));
    }
}
```

`backend/src/main/java/com/boardgame/room/domain/RoomCodeGenerator.java`
```java
package com.boardgame.room.domain;

public interface RoomCodeGenerator {

    RoomCode next();
}
```

`backend/src/main/java/com/boardgame/room/domain/RandomRoomCodeGenerator.java`
```java
package com.boardgame.room.domain;

import java.security.SecureRandom;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.springframework.stereotype.Component;

@Component
public class RandomRoomCodeGenerator implements RoomCodeGenerator {

    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int LENGTH = 6;

    private final SecureRandom random = new SecureRandom();

    @Override
    public RoomCode next() {
        String value = IntStream.range(0, LENGTH)
                .mapToObj(index -> String.valueOf(ALPHABET.charAt(random.nextInt(ALPHABET.length()))))
                .collect(Collectors.joining());
        return new RoomCode(value);
    }
}
```

`backend/src/main/java/com/boardgame/room/domain/RoomName.java`
```java
package com.boardgame.room.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;

public record RoomName(String value) {

    private static final int MAX_LENGTH = 20;

    public RoomName {
        if (value == null || value.isBlank() || value.strip().length() > MAX_LENGTH) {
            throw new BusinessException(ErrorCode.INVALID_ROOM_NAME);
        }
        value = value.strip();
    }
}
```

`backend/src/main/java/com/boardgame/room/domain/RoomProfile.java`
```java
package com.boardgame.room.domain;

import com.boardgame.game.GameType;

public record RoomProfile(RoomCode code, RoomName name, GameType gameType) {
}
```

`backend/src/main/java/com/boardgame/room/domain/Participant.java`
```java
package com.boardgame.room.domain;

public record Participant(long memberId, String nickname) {
}
```

`backend/src/main/java/com/boardgame/room/domain/RoomMembers.java`
```java
package com.boardgame.room.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameType;
import java.util.ArrayList;
import java.util.List;

public class RoomMembers {

    private final List<Participant> members = new ArrayList<>();

    public void add(Participant participant, GameType gameType) {
        if (contains(participant.memberId())) {
            return;
        }
        if (members.size() >= gameType.maxPlayers()) {
            throw new BusinessException(ErrorCode.ROOM_FULL);
        }
        members.add(participant);
    }

    public void remove(long memberId) {
        members.removeIf(member -> member.memberId() == memberId);
    }

    public boolean contains(long memberId) {
        return members.stream().anyMatch(member -> member.memberId() == memberId);
    }

    public void requireMember(long memberId) {
        if (!contains(memberId)) {
            throw new BusinessException(ErrorCode.NOT_IN_ROOM);
        }
    }

    public long hostId() {
        return members.get(0).memberId();
    }

    public boolean isHost(long memberId) {
        return !members.isEmpty() && hostId() == memberId;
    }

    public boolean isEmpty() {
        return members.isEmpty();
    }

    public int size() {
        return members.size();
    }

    public List<Long> ids() {
        return members.stream().map(Participant::memberId).toList();
    }

    public List<Participant> asList() {
        return List.copyOf(members);
    }
}
```

`backend/src/main/java/com/boardgame/room/domain/RoomGame.java`
```java
package com.boardgame.room.domain;

import com.boardgame.game.GameAction;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.GameSession;
import java.time.Instant;
import java.util.List;

public record RoomGame(GameSession session, String matchKey, Instant startedAt) {

    public boolean isFinished() {
        return session.isFinished();
    }

    public boolean isPlaying(long memberId) {
        return session.isPlaying(memberId);
    }

    public List<GameOutcome> act(long memberId, GameAction action) {
        return session.act(memberId, action);
    }

    public List<GameOutcome> forfeit(long memberId) {
        return session.forfeit(memberId);
    }

    public Object viewFor(long memberId) {
        return session.viewFor(memberId);
    }
}
```

`backend/src/main/java/com/boardgame/room/domain/RoomStatus.java`
```java
package com.boardgame.room.domain;

public enum RoomStatus {
    WAITING, PLAYING
}
```

`backend/src/main/java/com/boardgame/room/domain/Room.java`
```java
package com.boardgame.room.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.GameSession;
import com.boardgame.game.GameType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;

public class Room {

    private final RoomProfile profile;
    private final RoomMembers members;
    private RoomGame game;

    private Room(RoomProfile profile, RoomMembers members) {
        this.profile = profile;
        this.members = members;
    }

    public static Room open(RoomProfile profile, Participant host) {
        RoomMembers members = new RoomMembers();
        members.add(host, profile.gameType());
        return new Room(profile, members);
    }

    public void join(Participant participant) {
        if (members.contains(participant.memberId())) {
            return;
        }
        requireWaiting();
        members.add(participant, profile.gameType());
    }

    public List<GameOutcome> leave(long memberId) {
        members.requireMember(memberId);
        List<GameOutcome> outcomes = forfeitIfPlaying(memberId);
        members.remove(memberId);
        return outcomes;
    }

    public RoomGame start(long requesterId, Function<List<Long>, GameSession> sessionCreator,
                          String matchKey, Instant startedAt) {
        members.requireMember(requesterId);
        if (!members.isHost(requesterId)) {
            throw new BusinessException(ErrorCode.NOT_ROOM_HOST);
        }
        requireWaiting();
        if (members.size() < gameType().minPlayers()) {
            throw new BusinessException(ErrorCode.NOT_ENOUGH_PLAYERS);
        }
        game = new RoomGame(sessionCreator.apply(members.ids()), matchKey, startedAt);
        return game;
    }

    public List<GameOutcome> act(long memberId, GameAction action) {
        members.requireMember(memberId);
        if (status() != RoomStatus.PLAYING) {
            throw new BusinessException(ErrorCode.GAME_NOT_STARTED);
        }
        return game.act(memberId, action);
    }

    public Optional<Object> viewFor(long memberId) {
        if (game == null) {
            return Optional.empty();
        }
        return Optional.of(game.viewFor(memberId));
    }

    public RoomStatus status() {
        if (game == null || game.isFinished()) {
            return RoomStatus.WAITING;
        }
        return RoomStatus.PLAYING;
    }

    public boolean isPlaying(long memberId) {
        return status() == RoomStatus.PLAYING && game.isPlaying(memberId);
    }

    public boolean isWaitingFor(GameType type) {
        return status() == RoomStatus.WAITING && (type == null || type == gameType());
    }

    public RoomGame currentGame() {
        if (game == null) {
            throw new BusinessException(ErrorCode.GAME_NOT_STARTED);
        }
        return game;
    }

    public void requireMember(long memberId) {
        members.requireMember(memberId);
    }

    public boolean contains(long memberId) {
        return members.contains(memberId);
    }

    public boolean isEmpty() {
        return members.isEmpty();
    }

    public RoomCode code() {
        return profile.code();
    }

    public String codeValue() {
        return code().value();
    }

    public String nameValue() {
        RoomName name = profile.name();
        return name.value();
    }

    public GameType gameType() {
        return profile.gameType();
    }

    public long hostId() {
        return members.hostId();
    }

    public List<Participant> participants() {
        return members.asList();
    }

    public List<Long> memberIds() {
        return members.ids();
    }

    private List<GameOutcome> forfeitIfPlaying(long memberId) {
        if (!isPlaying(memberId)) {
            return List.of();
        }
        return game.forfeit(memberId);
    }

    private void requireWaiting() {
        if (status() == RoomStatus.PLAYING) {
            throw new BusinessException(ErrorCode.ROOM_ALREADY_PLAYING);
        }
    }
}
```

`backend/src/main/java/com/boardgame/room/domain/RoomRegistry.java`
```java
package com.boardgame.room.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class RoomRegistry {

    private final Map<RoomCode, Room> rooms = new ConcurrentHashMap<>();
    private final Map<Long, RoomCode> memberRooms = new ConcurrentHashMap<>();

    public void save(Room room) {
        RoomCode code = room.code();
        memberRooms.entrySet().removeIf(entry -> entry.getValue().equals(code) && !room.contains(entry.getKey()));
        room.memberIds().forEach(memberId -> memberRooms.put(memberId, code));
        rooms.put(code, room);
        removeIfEmpty(room);
    }

    public Room get(RoomCode code) {
        Room room = rooms.get(code);
        if (room == null) {
            throw new BusinessException(ErrorCode.ROOM_NOT_FOUND);
        }
        return room;
    }

    public Optional<Room> findByMember(long memberId) {
        return Optional.ofNullable(memberRooms.get(memberId)).map(rooms::get);
    }

    public List<Room> all() {
        return rooms.values().stream()
                .sorted(Comparator.comparing(Room::codeValue))
                .toList();
    }

    public boolean exists(RoomCode code) {
        return rooms.containsKey(code);
    }

    private void removeIfEmpty(Room room) {
        if (!room.isEmpty()) {
            return;
        }
        rooms.remove(room.code());
    }
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest='RoomCodeTest,RoomNameTest,RoomTest,RoomRegistryTest'`
Expected: PASS

- [ ] **Step 6: 전체 회귀 확인 후 커밋**

Run: `mvn -q -f backend/pom.xml test`
Expected: PASS

```bash
git add backend
git commit -m "feat: 메모리 기반 방 도메인(코드, 이름, 참가자, 방장, 진행 상태)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 방 REST API, WebSocket 설정, 결과 이벤트 발행

**Files:**
- Modify: `backend/pom.xml`, `backend/src/main/resources/application.yml`, `backend/src/main/java/com/boardgame/common/security/SecurityConfig.java`
- Create: `backend/src/main/java/com/boardgame/common/config/ClockConfig.java`, `backend/src/main/java/com/boardgame/common/websocket/WebSocketConfig.java`
- Create: `backend/src/main/java/com/boardgame/game/event/{GameStartedEvent,RoundCompletedEvent,GameCompletedEvent}.java`
- Create: `backend/src/main/java/com/boardgame/room/application/{RoomNotifier,OutcomePublisher,RoomService}.java`, `backend/src/main/java/com/boardgame/room/infra/StompRoomNotifier.java`
- Create: `backend/src/main/java/com/boardgame/room/api/{CreateRoomRequest,RoomResponse,RoomMemberResponse,RoomSummaryResponse,RoomController}.java`
- Test: `backend/src/test/java/com/boardgame/support/ApiUsers.java`, `backend/src/test/java/com/boardgame/room/application/OutcomePublisherTest.java`, `backend/src/test/java/com/boardgame/room/api/RoomApiTest.java`

**Interfaces:**
- Consumes: Task 1 `GameSessionFactories`, `GameOutcome`/`RoundCompleted`/`GameCompleted`/`MatchEntry`/`ResultType`; Task 2 방 도메인 전부; 계획 2 `LoginMember(long id, String nickname)`
- Produces:
  - 이벤트(계획 4가 구독): `record GameStartedEvent(String matchKey, GameType gameType, List<Long> memberIds, Instant startedAt)`, `record RoundCompletedEvent(String matchKey, GameType gameType, RoundCompleted round)`, `record GameCompletedEvent(String matchKey, GameType gameType, Instant startedAt, Instant endedAt, GameCompleted result)`
  - `interface RoomNotifier { void roomUpdated(RoomResponse room); void gameUpdated(long memberId, Object view); }`
  - `@Component OutcomePublisher` — `publish(Room room, List<GameOutcome> outcomes, Instant now)`
  - `@Service RoomService` — `create(LoginMember, CreateRoomRequest)`, `waitingRooms(GameType)`, `join(String code, LoginMember)`, `leave(String code, long memberId)`, `start(String code, long memberId)`, `get(String code)`, `myRoom(long memberId)`; 내부 `broadcast(Room)`(방 정보 + 각 회원 화면 전송)
  - REST: `POST /api/rooms`(201), `GET /api/rooms?gameType=`, `GET /api/rooms/me`(200/204), `GET /api/rooms/{code}`, `POST /api/rooms/{code}/join`, `POST /api/rooms/{code}/leave`(204), `POST /api/rooms/{code}/start`
  - `record RoomResponse(String code, String name, GameType gameType, String gameTypeName, RoomStatus status, long hostId, int maxPlayers, List<RoomMemberResponse> members)`, `record RoomMemberResponse(long id, String nickname, boolean host)`, `record RoomSummaryResponse(String code, String name, GameType gameType, String gameTypeName, int playerCount, int maxPlayers, String hostNickname)`
  - STOMP 설정: `/ws`, `/app`, `/topic`, `/queue`, `/user`; `/ws/**` 인증 필요
  - `@Bean Clock clock()`; 테스트 지원 `ApiUsers`(MockMvc로 가입+로그인한 사용자 생성)

- [ ] **Step 1: 의존성·설정**

`backend/pom.xml` — `spring-boot-starter-security` 의존성 아래에 추가:
```xml
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-websocket</artifactId>
        </dependency>
```

`backend/src/main/resources/application.yml` — 맨 아래에 추가:
```yaml

app:
  websocket:
    allowed-origin-patterns: "http://localhost:[*],http://127.0.0.1:[*]"
```

`SecurityConfig.java` — `.requestMatchers("/api/**").authenticated()` 줄 바로 아래에 추가:
```java
                        .requestMatchers("/ws/**").authenticated()
```

`backend/src/main/java/com/boardgame/common/config/ClockConfig.java`
```java
package com.boardgame.common.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ClockConfig {

    @Bean
    public Clock clock() {
        return Clock.systemDefaultZone();
    }
}
```

`backend/src/main/java/com/boardgame/common/websocket/WebSocketConfig.java`
```java
package com.boardgame.common.websocket;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final String[] allowedOriginPatterns;

    public WebSocketConfig(@Value("${app.websocket.allowed-origin-patterns}") String[] allowedOriginPatterns) {
        this.allowedOriginPatterns = allowedOriginPatterns;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws").setAllowedOriginPatterns(allowedOriginPatterns);
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic", "/queue");
        registry.setApplicationDestinationPrefixes("/app");
        registry.setUserDestinationPrefix("/user");
    }
}
```

- [ ] **Step 2: 실패하는 테스트 작성**

`backend/src/test/java/com/boardgame/support/ApiUsers.java`
```java
package com.boardgame.support;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jayway.jsonpath.JsonPath;
import java.util.UUID;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

public final class ApiUsers {

    public record User(long id, String nickname, MockHttpSession session) {
    }

    private ApiUsers() {
    }

    public static User create(MockMvc mockMvc) throws Exception {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        String loginId = "u" + suffix;
        String nickname = "n" + suffix.substring(0, 6);
        mockMvc.perform(post("/api/members")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"loginId": "%s", "nickname": "%s", "password": "password1"}
                                """.formatted(loginId, nickname)))
                .andExpect(status().isCreated());
        MvcResult login = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"loginId": "%s", "password": "password1"}
                                """.formatted(loginId)))
                .andExpect(status().isOk())
                .andReturn();
        Number id = JsonPath.read(login.getResponse().getContentAsString(), "$.id");
        return new User(id.longValue(), nickname, (MockHttpSession) login.getRequest().getSession(false));
    }
}
```

`backend/src/test/java/com/boardgame/room/application/OutcomePublisherTest.java`
```java
package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameType;
import com.boardgame.game.MatchEntry;
import com.boardgame.game.ResultType;
import com.boardgame.game.RoundCompleted;
import com.boardgame.game.RoundEntry;
import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.game.event.RoundCompletedEvent;
import com.boardgame.room.domain.FakeGameSession;
import com.boardgame.room.domain.Participant;
import com.boardgame.room.domain.Room;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomName;
import com.boardgame.room.domain.RoomProfile;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class OutcomePublisherTest {

    private static final Instant STARTED = Instant.parse("2026-10-05T10:00:00Z");
    private static final Instant NOW = Instant.parse("2026-10-05T10:20:00Z");

    private final List<Object> published = new ArrayList<>();
    private final OutcomePublisher publisher = new OutcomePublisher(published::add);

    private Room startedRoom() {
        Room room = Room.open(new RoomProfile(new RoomCode("ABCDEF"), new RoomName("방"), GameType.PAPER_SAFARI),
                new Participant(1L, "앨리스"));
        room.join(new Participant(2L, "밥"));
        room.start(1L, FakeGameSession::new, "match-1", STARTED);
        return room;
    }

    @Test
    void 결과가_없으면_아무것도_발행하지_않는다() {
        publisher.publish(startedRoom(), List.of(), NOW);

        assertThat(published).isEmpty();
    }

    @Test
    void 라운드와_게임_결과를_매치_키와_함께_순서대로_발행한다() {
        RoundCompleted round = new RoundCompleted(3, List.of(new RoundEntry(1L, ResultType.WIN, 1)));
        GameCompleted game = new GameCompleted(List.of(new MatchEntry(1L, ResultType.WIN, 3, 0)));

        publisher.publish(startedRoom(), List.of(round, game), NOW);

        assertThat(published).containsExactly(
                new RoundCompletedEvent("match-1", GameType.PAPER_SAFARI, round),
                new GameCompletedEvent("match-1", GameType.PAPER_SAFARI, STARTED, NOW, game));
    }
}
```

`backend/src/test/java/com/boardgame/room/api/RoomApiTest.java`
```java
package com.boardgame.room.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.startsWith;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.atLeastOnce;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.game.GameType;
import com.boardgame.game.MatchEntry;
import com.boardgame.game.ResultType;
import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.game.event.GameStartedEvent;
import com.boardgame.room.application.RoomNotifier;
import com.boardgame.support.ApiUsers;
import com.boardgame.support.ApiUsers.User;
import com.jayway.jsonpath.JsonPath;
import java.util.List;
import java.util.Locale;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
@RecordApplicationEvents
class RoomApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ApplicationEvents events;

    @MockitoBean
    private RoomNotifier notifier;

    private ResultActions createRoom(User host, String name) throws Exception {
        return mockMvc.perform(post("/api/rooms").session(host.session())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"name": "%s", "gameType": "PAPER_SAFARI"}
                        """.formatted(name)));
    }

    private String createdCode(User host) throws Exception {
        String body = createRoom(host, "즐거운 방").andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.code");
    }

    private ResultActions join(User user, String code) throws Exception {
        return mockMvc.perform(post("/api/rooms/{code}/join", code).session(user.session()));
    }

    private ResultActions start(User user, String code) throws Exception {
        return mockMvc.perform(post("/api/rooms/{code}/start", code).session(user.session()));
    }

    private ResultActions leave(User user, String code) throws Exception {
        return mockMvc.perform(post("/api/rooms/{code}/leave", code).session(user.session()));
    }

    @Test
    void 방을_만들면_201과_방_정보를_돌려준다() throws Exception {
        User host = ApiUsers.create(mockMvc);

        createRoom(host, " 즐거운 방 ")
                .andExpect(status().isCreated())
                .andExpect(header().string("Location", startsWith("/api/rooms/")))
                .andExpect(jsonPath("$.code").value(org.hamcrest.Matchers.matchesPattern("^[A-Z0-9]{6}$")))
                .andExpect(jsonPath("$.name").value("즐거운 방"))
                .andExpect(jsonPath("$.gameType").value("PAPER_SAFARI"))
                .andExpect(jsonPath("$.gameTypeName").value("페이퍼 사파리"))
                .andExpect(jsonPath("$.status").value("WAITING"))
                .andExpect(jsonPath("$.hostId").value(host.id()))
                .andExpect(jsonPath("$.maxPlayers").value(5))
                .andExpect(jsonPath("$.members[0].nickname").value(host.nickname()))
                .andExpect(jsonPath("$.members[0].host").value(true));
    }

    @Test
    void 방_이름이_잘못되면_INVALID_ROOM_NAME() throws Exception {
        User host = ApiUsers.create(mockMvc);

        createRoom(host, "   ")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_ROOM_NAME"));
    }

    @Test
    void 대기_중인_방_목록에_보이고_소문자_코드로도_참가한다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = createdCode(host);

        mockMvc.perform(get("/api/rooms").param("gameType", "PAPER_SAFARI").session(guest.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.code == '%s')].playerCount".formatted(code)).value(1))
                .andExpect(jsonPath("$[?(@.code == '%s')].hostNickname".formatted(code)).value(host.nickname()));

        join(guest, code.toLowerCase(Locale.ROOT))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.members.length()").value(2));
        verify(notifier, atLeastOnce()).roomUpdated(argThat(room ->
                room.code().equals(code) && room.members().size() == 2));
    }

    @Test
    void 이미_방에_있으면_새_방을_만들거나_다른_방에_들어갈_수_없다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User other = ApiUsers.create(mockMvc);
        createdCode(host);
        String otherCode = createdCode(other);

        createRoom(host, "두 번째").andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_IN_ROOM"));
        join(host, otherCode).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ALREADY_IN_ROOM"));
    }

    @Test
    void 없는_방은_ROOM_NOT_FOUND() throws Exception {
        User user = ApiUsers.create(mockMvc);

        join(user, "ZZZZZZ").andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ROOM_NOT_FOUND"));
        mockMvc.perform(get("/api/rooms/{code}", "bad").session(user.session()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ROOM_NOT_FOUND"));
    }

    @Test
    void 방장이_아니면_시작할_수_없고_혼자서는_시작할_수_없다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = createdCode(host);

        start(host, code).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("NOT_ENOUGH_PLAYERS"));
        join(guest, code);
        start(guest, code).andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_ROOM_HOST"));
    }

    @Test
    void 시작하면_진행_중이_되고_시작_이벤트와_각자의_화면이_전송된다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = createdCode(host);
        join(guest, code);

        start(host, code).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PLAYING"));

        assertThat(events.stream(GameStartedEvent.class))
                .filteredOn(event -> event.memberIds().contains(host.id()))
                .singleElement()
                .satisfies(event -> {
                    assertThat(event.gameType()).isEqualTo(GameType.PAPER_SAFARI);
                    assertThat(event.memberIds()).containsExactly(host.id(), guest.id());
                    assertThat(event.matchKey()).isNotBlank();
                });
        verify(notifier).gameUpdated(eq(host.id()), any());
        verify(notifier).gameUpdated(eq(guest.id()), any());
    }

    @Test
    void 진행_중인_방에는_새로_참가할_수_없다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        User late = ApiUsers.create(mockMvc);
        String code = createdCode(host);
        join(guest, code);
        start(host, code);

        join(late, code).andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ROOM_ALREADY_PLAYING"));
    }

    @Test
    void 게임_중_나가면_기권으로_게임이_끝나고_방은_대기_상태로_돌아간다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = createdCode(host);
        join(guest, code);
        start(host, code);

        leave(host, code).andExpect(status().isNoContent());

        assertThat(events.stream(GameCompletedEvent.class))
                .filteredOn(event -> event.result().entries().stream().anyMatch(entry -> entry.memberId() == host.id()))
                .singleElement()
                .satisfies(event -> assertThat(event.result().entries()).containsExactly(
                        new MatchEntry(host.id(), ResultType.LOSE, 0, 0),
                        new MatchEntry(guest.id(), ResultType.WIN, 0, 1)));
        mockMvc.perform(get("/api/rooms/{code}", code).session(guest.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("WAITING"))
                .andExpect(jsonPath("$.hostId").value(guest.id()))
                .andExpect(jsonPath("$.members.length()").value(1));
    }

    @Test
    void 내_방을_조회하고_마지막_사람이_나가면_방이_사라진다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = createdCode(host);

        mockMvc.perform(get("/api/rooms/me").session(host.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.code").value(code));

        leave(host, code).andExpect(status().isNoContent());

        mockMvc.perform(get("/api/rooms/me").session(host.session()))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/rooms/{code}", code).session(host.session()))
                .andExpect(status().isNotFound());
    }

    @Test
    void 로그인하지_않으면_방_API와_WebSocket은_401() throws Exception {
        mockMvc.perform(get("/api/rooms"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
        mockMvc.perform(get("/ws"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void 게임_종류가_없으면_INVALID_INPUT() throws Exception {
        User host = ApiUsers.create(mockMvc);

        mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"방\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
        mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"방\", \"gameType\": \"CHESS\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }
}
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest='OutcomePublisherTest,RoomApiTest'`
Expected: FAIL — `cannot find symbol: class OutcomePublisher` / `RoomNotifier`

- [ ] **Step 4: 이벤트·알림·발행 구현**

`backend/src/main/java/com/boardgame/game/event/GameStartedEvent.java`
```java
package com.boardgame.game.event;

import com.boardgame.game.GameType;
import java.time.Instant;
import java.util.List;

public record GameStartedEvent(String matchKey, GameType gameType, List<Long> memberIds, Instant startedAt) {
}
```

`backend/src/main/java/com/boardgame/game/event/RoundCompletedEvent.java`
```java
package com.boardgame.game.event;

import com.boardgame.game.GameType;
import com.boardgame.game.RoundCompleted;

public record RoundCompletedEvent(String matchKey, GameType gameType, RoundCompleted round) {
}
```

`backend/src/main/java/com/boardgame/game/event/GameCompletedEvent.java`
```java
package com.boardgame.game.event;

import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameType;
import java.time.Instant;

public record GameCompletedEvent(String matchKey, GameType gameType, Instant startedAt, Instant endedAt,
                                 GameCompleted result) {
}
```

`backend/src/main/java/com/boardgame/room/application/RoomNotifier.java`
```java
package com.boardgame.room.application;

import com.boardgame.room.api.RoomResponse;

public interface RoomNotifier {

    void roomUpdated(RoomResponse room);

    void gameUpdated(long memberId, Object view);
}
```

`backend/src/main/java/com/boardgame/room/infra/StompRoomNotifier.java`
```java
package com.boardgame.room.infra;

import com.boardgame.room.api.RoomResponse;
import com.boardgame.room.application.RoomNotifier;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class StompRoomNotifier implements RoomNotifier {

    private final SimpMessagingTemplate messagingTemplate;

    public StompRoomNotifier(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @Override
    public void roomUpdated(RoomResponse room) {
        messagingTemplate.convertAndSend("/topic/rooms/" + room.code(), room);
    }

    @Override
    public void gameUpdated(long memberId, Object view) {
        messagingTemplate.convertAndSendToUser(String.valueOf(memberId), "/queue/game", view);
    }
}
```

`backend/src/main/java/com/boardgame/room/application/OutcomePublisher.java`
```java
package com.boardgame.room.application;

import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.RoundCompleted;
import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.game.event.RoundCompletedEvent;
import com.boardgame.room.domain.Room;
import com.boardgame.room.domain.RoomGame;
import java.time.Instant;
import java.util.List;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

@Component
public class OutcomePublisher {

    private final ApplicationEventPublisher eventPublisher;

    public OutcomePublisher(ApplicationEventPublisher eventPublisher) {
        this.eventPublisher = eventPublisher;
    }

    public void publish(Room room, List<GameOutcome> outcomes, Instant now) {
        if (outcomes.isEmpty()) {
            return;
        }
        RoomGame game = room.currentGame();
        outcomes.forEach(outcome -> eventPublisher.publishEvent(toEvent(room, game, outcome, now)));
    }

    private Object toEvent(Room room, RoomGame game, GameOutcome outcome, Instant now) {
        return switch (outcome) {
            case RoundCompleted round -> new RoundCompletedEvent(game.matchKey(), room.gameType(), round);
            case GameCompleted completed ->
                    new GameCompletedEvent(game.matchKey(), room.gameType(), game.startedAt(), now, completed);
        };
    }
}
```

- [ ] **Step 5: 응답 DTO, 서비스, 컨트롤러 구현**

`backend/src/main/java/com/boardgame/room/api/CreateRoomRequest.java`
```java
package com.boardgame.room.api;

import com.boardgame.game.GameType;

public record CreateRoomRequest(String name, GameType gameType) {
}
```

`backend/src/main/java/com/boardgame/room/api/RoomMemberResponse.java`
```java
package com.boardgame.room.api;

public record RoomMemberResponse(long id, String nickname, boolean host) {
}
```

`backend/src/main/java/com/boardgame/room/api/RoomResponse.java`
```java
package com.boardgame.room.api;

import com.boardgame.game.GameType;
import com.boardgame.room.domain.Room;
import com.boardgame.room.domain.RoomStatus;
import java.util.List;

public record RoomResponse(String code, String name, GameType gameType, String gameTypeName, RoomStatus status,
                           long hostId, int maxPlayers, List<RoomMemberResponse> members) {

    public static RoomResponse from(Room room) {
        long hostId = room.hostId();
        List<RoomMemberResponse> members = room.participants().stream()
                .map(participant -> new RoomMemberResponse(participant.memberId(), participant.nickname(),
                        participant.memberId() == hostId))
                .toList();
        GameType gameType = room.gameType();
        return new RoomResponse(room.codeValue(), room.nameValue(), gameType, gameType.displayName(),
                room.status(), hostId, gameType.maxPlayers(), members);
    }
}
```

`backend/src/main/java/com/boardgame/room/api/RoomSummaryResponse.java`
```java
package com.boardgame.room.api;

import com.boardgame.game.GameType;
import com.boardgame.room.domain.Participant;
import com.boardgame.room.domain.Room;
import java.util.List;

public record RoomSummaryResponse(String code, String name, GameType gameType, String gameTypeName,
                                  int playerCount, int maxPlayers, String hostNickname) {

    public static RoomSummaryResponse from(Room room) {
        List<Participant> participants = room.participants();
        GameType gameType = room.gameType();
        Participant host = participants.get(0);
        return new RoomSummaryResponse(room.codeValue(), room.nameValue(), gameType, gameType.displayName(),
                participants.size(), gameType.maxPlayers(), host.nickname());
    }
}
```

`backend/src/main/java/com/boardgame/room/application/RoomService.java`
```java
package com.boardgame.room.application;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.GameSessionFactories;
import com.boardgame.game.GameType;
import com.boardgame.game.event.GameStartedEvent;
import com.boardgame.room.api.CreateRoomRequest;
import com.boardgame.room.api.RoomResponse;
import com.boardgame.room.api.RoomSummaryResponse;
import com.boardgame.room.domain.Participant;
import com.boardgame.room.domain.Room;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomCodeGenerator;
import com.boardgame.room.domain.RoomGame;
import com.boardgame.room.domain.RoomName;
import com.boardgame.room.domain.RoomProfile;
import com.boardgame.room.domain.RoomRegistry;
import java.time.Clock;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Stream;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

@Service
public class RoomService {

    private final RoomRegistry registry;
    private final RoomCodeGenerator codeGenerator;
    private final GameSessionFactories sessionFactories;
    private final RoomNotifier notifier;
    private final OutcomePublisher outcomePublisher;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;

    public RoomService(RoomRegistry registry, RoomCodeGenerator codeGenerator, GameSessionFactories sessionFactories,
                       RoomNotifier notifier, OutcomePublisher outcomePublisher,
                       ApplicationEventPublisher eventPublisher, Clock clock) {
        this.registry = registry;
        this.codeGenerator = codeGenerator;
        this.sessionFactories = sessionFactories;
        this.notifier = notifier;
        this.outcomePublisher = outcomePublisher;
        this.eventPublisher = eventPublisher;
        this.clock = clock;
    }

    public synchronized RoomResponse create(LoginMember member, CreateRoomRequest request) {
        requireNotInAnyRoom(member.id());
        RoomProfile profile = new RoomProfile(newCode(), new RoomName(request.name()), requireGameType(request));
        Room room = Room.open(profile, participantOf(member));
        registry.save(room);
        return broadcast(room);
    }

    public synchronized List<RoomSummaryResponse> waitingRooms(GameType gameType) {
        return registry.all().stream()
                .filter(room -> room.isWaitingFor(gameType))
                .map(RoomSummaryResponse::from)
                .toList();
    }

    public synchronized RoomResponse join(String rawCode, LoginMember member) {
        Room room = find(rawCode);
        requireNotInOtherRoom(member.id(), room);
        room.join(participantOf(member));
        registry.save(room);
        return broadcast(room);
    }

    public synchronized void leave(String rawCode, long memberId) {
        Room room = find(rawCode);
        List<GameOutcome> outcomes = room.leave(memberId);
        registry.save(room);
        outcomePublisher.publish(room, outcomes, clock.instant());
        broadcast(room);
    }

    public synchronized RoomResponse start(String rawCode, long memberId) {
        Room room = find(rawCode);
        GameType gameType = room.gameType();
        RoomGame game = room.start(memberId, memberIds -> sessionFactories.create(gameType, memberIds),
                UUID.randomUUID().toString(), clock.instant());
        eventPublisher.publishEvent(
                new GameStartedEvent(game.matchKey(), gameType, room.memberIds(), game.startedAt()));
        return broadcast(room);
    }

    public synchronized RoomResponse get(String rawCode) {
        return RoomResponse.from(find(rawCode));
    }

    public synchronized Optional<RoomResponse> myRoom(long memberId) {
        return registry.findByMember(memberId).map(RoomResponse::from);
    }

    private RoomResponse broadcast(Room room) {
        RoomResponse response = RoomResponse.from(room);
        if (room.isEmpty()) {
            return response;
        }
        notifier.roomUpdated(response);
        room.memberIds().forEach(memberId -> sendView(room, memberId));
        return response;
    }

    private void sendView(Room room, long memberId) {
        room.viewFor(memberId).ifPresent(view -> notifier.gameUpdated(memberId, view));
    }

    private Room find(String rawCode) {
        return registry.get(RoomCode.parse(rawCode));
    }

    private RoomCode newCode() {
        return Stream.generate(codeGenerator::next)
                .filter(code -> !registry.exists(code))
                .findFirst()
                .orElseThrow();
    }

    private GameType requireGameType(CreateRoomRequest request) {
        if (request.gameType() == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        return request.gameType();
    }

    private void requireNotInAnyRoom(long memberId) {
        if (registry.findByMember(memberId).isPresent()) {
            throw new BusinessException(ErrorCode.ALREADY_IN_ROOM);
        }
    }

    private void requireNotInOtherRoom(long memberId, Room room) {
        boolean inOtherRoom = registry.findByMember(memberId)
                .filter(current -> !current.code().equals(room.code()))
                .isPresent();
        if (inOtherRoom) {
            throw new BusinessException(ErrorCode.ALREADY_IN_ROOM);
        }
    }

    private Participant participantOf(LoginMember member) {
        return new Participant(member.id(), member.nickname());
    }
}
```

`backend/src/main/java/com/boardgame/room/api/RoomController.java`
```java
package com.boardgame.room.api;

import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameType;
import com.boardgame.room.application.RoomService;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rooms")
public class RoomController {

    private final RoomService roomService;

    public RoomController(RoomService roomService) {
        this.roomService = roomService;
    }

    @PostMapping
    public ResponseEntity<RoomResponse> create(@AuthenticationPrincipal LoginMember member,
                                               @RequestBody CreateRoomRequest request) {
        RoomResponse room = roomService.create(member, request);
        return ResponseEntity.created(URI.create("/api/rooms/" + room.code())).body(room);
    }

    @GetMapping
    public List<RoomSummaryResponse> waitingRooms(@RequestParam(required = false) GameType gameType) {
        return roomService.waitingRooms(gameType);
    }

    @GetMapping("/me")
    public ResponseEntity<RoomResponse> myRoom(@AuthenticationPrincipal LoginMember member) {
        return roomService.myRoom(member.id())
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/{code}")
    public RoomResponse get(@PathVariable String code) {
        return roomService.get(code);
    }

    @PostMapping("/{code}/join")
    public RoomResponse join(@PathVariable String code, @AuthenticationPrincipal LoginMember member) {
        return roomService.join(code, member);
    }

    @PostMapping("/{code}/leave")
    public ResponseEntity<Void> leave(@PathVariable String code, @AuthenticationPrincipal LoginMember member) {
        roomService.leave(code, member.id());
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{code}/start")
    public RoomResponse start(@PathVariable String code, @AuthenticationPrincipal LoginMember member) {
        return roomService.start(code, member.id());
    }
}
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest='OutcomePublisherTest,RoomApiTest'`
Expected: PASS

- [ ] **Step 7: 전체 회귀 확인 후 커밋**

Run: `mvn -q -f backend/pom.xml test`
Expected: PASS

```bash
git add backend
git commit -m "feat: 방 REST API, STOMP 설정, 게임 결과 이벤트 발행" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: STOMP 게임 행동과 에러 전달

**Files:**
- Modify: `backend/src/main/java/com/boardgame/common/security/LoginMember.java`, `backend/src/test/java/com/boardgame/common/security/LoginMemberTest.java`
- Modify: `backend/src/main/java/com/boardgame/room/application/RoomService.java` (`act`, `sync` 추가)
- Create: `backend/src/main/java/com/boardgame/room/api/GameMessageController.java`
- Test: `backend/src/test/java/com/boardgame/room/api/StompGameFlowTest.java`

**Interfaces:**
- Consumes: Task 3 `RoomService`, `RoomNotifier`, `OutcomePublisher`, `ErrorResponse.of(ErrorCode)`
- Produces:
  - `static long LoginMember.idOf(Principal principal)` (= `Long.parseLong(principal.getName())`)
  - `RoomService.act(String code, long memberId, GameAction action)`, `RoomService.sync(String code, long memberId)`(요청자에게 현재 화면 1회 전송)
  - STOMP: `SEND /app/rooms/{code}/actions` 본문 `{"type": "...", "column": n, "row": n}`, `SEND /app/rooms/{code}/sync`; 에러는 `/user/queue/errors`로 `ErrorResponse`

- [ ] **Step 1: 실패하는 테스트 작성**

`LoginMemberTest.java` — 기존 테스트 아래에 추가(필요한 import: `java.security.Principal`, `org.springframework.security.authentication.UsernamePasswordAuthenticationToken`, `java.util.List`):
```java
    @Test
    void 인증_토큰에서_회원_id를_꺼낸다() {
        Principal principal = UsernamePasswordAuthenticationToken.authenticated(
                new LoginMember(42L, "앨리스"), null, List.of());

        assertThat(LoginMember.idOf(principal)).isEqualTo(42L);
    }
```

`backend/src/test/java/com/boardgame/room/api/StompGameFlowTest.java`
```java
package com.boardgame.room.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.JsonNode;
import java.lang.reflect.Type;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;
import java.util.function.Predicate;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.web.socket.WebSocketHttpHeaders;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class StompGameFlowTest {

    @LocalServerPort
    private int port;

    @Autowired
    private TestRestTemplate rest;

    private final WebSocketStompClient stompClient = createClient();

    private record Player(long id, String cookie, StompSession stomp,
                          BlockingQueue<JsonNode> views, BlockingQueue<JsonNode> errors) {
    }

    private static WebSocketStompClient createClient() {
        WebSocketStompClient client = new WebSocketStompClient(new StandardWebSocketClient());
        client.setMessageConverter(new MappingJackson2MessageConverter());
        return client;
    }

    @AfterEach
    void tearDown() {
        stompClient.stop();
    }

    private HttpHeaders headers(String cookie) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.add(HttpHeaders.COOKIE, cookie);
        return headers;
    }

    private ResponseEntity<JsonNode> post(String path, Object body, String cookie) {
        return rest.exchange(path, HttpMethod.POST, new HttpEntity<>(body, headers(cookie)), JsonNode.class);
    }

    private String[] signUpAndLogin() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        Map<String, String> member = Map.of("loginId", "s" + suffix, "nickname", "s" + suffix.substring(0, 6),
                "password", "password1");
        rest.postForEntity("/api/members", member, JsonNode.class);
        ResponseEntity<JsonNode> login = rest.postForEntity("/api/auth/login",
                Map.of("loginId", "s" + suffix, "password", "password1"), JsonNode.class);
        String cookie = login.getHeaders().getFirst(HttpHeaders.SET_COOKIE).split(";")[0];
        return new String[]{login.getBody().get("id").asText(), cookie};
    }

    private StompSession connect(String cookie) throws Exception {
        WebSocketHttpHeaders handshake = new WebSocketHttpHeaders();
        handshake.add(HttpHeaders.COOKIE, cookie);
        return stompClient.connectAsync("ws://localhost:" + port + "/ws", handshake,
                new StompSessionHandlerAdapter() {
                }).get(5, TimeUnit.SECONDS);
    }

    private BlockingQueue<JsonNode> subscribe(StompSession session, String destination) {
        BlockingQueue<JsonNode> queue = new LinkedBlockingQueue<>();
        session.subscribe(destination, new StompFrameHandler() {
            @Override
            public Type getPayloadType(StompHeaders headers) {
                return JsonNode.class;
            }

            @Override
            public void handleFrame(StompHeaders headers, Object payload) {
                queue.add((JsonNode) payload);
            }
        });
        return queue;
    }

    private Player player() throws Exception {
        String[] credentials = signUpAndLogin();
        StompSession stomp = connect(credentials[1]);
        return new Player(Long.parseLong(credentials[0]), credentials[1], stomp,
                subscribe(stomp, "/user/queue/game"), subscribe(stomp, "/user/queue/errors"));
    }

    private void send(Player player, String code, Map<String, Object> action) {
        player.stomp().send("/app/rooms/" + code + "/actions", action);
    }

    // 구독이 등록될 때까지 sync를 반복해 첫 화면을 받는다
    private JsonNode syncUntilView(Player player, String code) throws InterruptedException {
        for (int attempt = 0; attempt < 20; attempt++) {
            player.stomp().send("/app/rooms/" + code + "/sync", Map.of());
            JsonNode view = player.views().poll(250, TimeUnit.MILLISECONDS);
            if (view != null) {
                return view;
            }
        }
        throw new AssertionError("게임 화면을 받지 못했습니다");
    }

    private JsonNode awaitView(Player player, Predicate<JsonNode> condition) throws InterruptedException {
        long deadline = System.currentTimeMillis() + 5000;
        while (System.currentTimeMillis() < deadline) {
            JsonNode view = player.views().poll(250, TimeUnit.MILLISECONDS);
            if (view != null && condition.test(view)) {
                return view;
            }
        }
        throw new AssertionError("조건을 만족하는 화면을 받지 못했습니다");
    }

    private String startedRoom(Player host, Player guest) {
        String code = post("/api/rooms", Map.of("name", "실시간 방", "gameType", "PAPER_SAFARI"), host.cookie())
                .getBody().get("code").asText();
        post("/api/rooms/" + code + "/join", Map.of(), guest.cookie());
        post("/api/rooms/" + code + "/start", Map.of(), host.cookie());
        return code;
    }

    @Test
    void STOMP로_게임을_진행하고_상대가_뽑은_카드는_보이지_않는다() throws Exception {
        Player host = player();
        Player guest = player();
        String code = startedRoom(host, guest);

        JsonNode first = syncUntilView(host, code);
        syncUntilView(guest, code);
        assertThat(first.at("/game/round/phase").asText()).isEqualTo("SETUP_FLIP");
        assertThat(first.at("/game/round/boards").size()).isEqualTo(2);

        send(host, code, Map.of("type", "FLIP", "column", 0, "row", 0));
        send(guest, code, Map.of("type", "FLIP", "column", 0, "row", 0));
        JsonNode drawing = awaitView(host, view -> view.at("/game/round/phase").asText().equals("DRAW"));

        long currentId = drawing.at("/game/round/currentPlayerId").asLong();
        Player current = currentId == host.id() ? host : guest;
        Player waiting = currentId == host.id() ? guest : host;

        send(waiting, code, Map.of("type", "DRAW_DECK"));
        JsonNode error = waiting.errors().poll(5, TimeUnit.SECONDS);
        assertThat(error).isNotNull();
        assertThat(error.get("status").asInt()).isEqualTo(409);
        assertThat(error.get("code").asText()).isEqualTo("NOT_YOUR_TURN");

        send(current, code, Map.of("type", "DRAW_DECK"));
        JsonNode mine = awaitView(current, view -> view.at("/game/round/phase").asText().equals("PLACE"));
        JsonNode theirs = awaitView(waiting, view -> view.at("/game/round/phase").asText().equals("PLACE"));
        assertThat(mine.at("/game/round/held/card").isObject()).isTrue();
        assertThat(theirs.at("/game/round/held/card").isNull()).isTrue();
        assertThat(theirs.at("/game/round/held/source").asText()).isEqualTo("DECK");
    }

    @Test
    void 로그인하지_않으면_WebSocket에_연결할_수_없다() {
        assertThatThrownBy(() -> connect("JSESSIONID=invalid")).isInstanceOf(Exception.class);
    }
}
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest='LoginMemberTest,StompGameFlowTest'`
Expected: FAIL — `cannot find symbol: method idOf(Principal)`

- [ ] **Step 3: 구현**

`LoginMember.java` — `from` 메서드 아래에 추가(import `java.security.Principal`은 이미 있음):
```java
    public static long idOf(Principal principal) {
        return Long.parseLong(principal.getName());
    }
```

`RoomService.java` — import `com.boardgame.game.GameAction` 추가, `myRoom` 메서드 아래에 추가:
```java
    public synchronized void act(String rawCode, long memberId, GameAction action) {
        Room room = find(rawCode);
        List<GameOutcome> outcomes = room.act(memberId, action);
        outcomePublisher.publish(room, outcomes, clock.instant());
        broadcast(room);
    }

    public synchronized void sync(String rawCode, long memberId) {
        Room room = find(rawCode);
        room.requireMember(memberId);
        sendView(room, memberId);
    }
```

`backend/src/main/java/com/boardgame/room/api/GameMessageController.java`
```java
package com.boardgame.room.api;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.common.error.ErrorResponse;
import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameAction;
import com.boardgame.room.application.RoomService;
import java.security.Principal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageExceptionHandler;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.annotation.SendToUser;
import org.springframework.stereotype.Controller;

@Controller
public class GameMessageController {

    private static final Logger log = LoggerFactory.getLogger(GameMessageController.class);

    private final RoomService roomService;

    public GameMessageController(RoomService roomService) {
        this.roomService = roomService;
    }

    @MessageMapping("/rooms/{code}/actions")
    public void act(@DestinationVariable String code, @Payload GameAction action, Principal principal) {
        roomService.act(code, LoginMember.idOf(principal), action);
    }

    @MessageMapping("/rooms/{code}/sync")
    public void sync(@DestinationVariable String code, Principal principal) {
        roomService.sync(code, LoginMember.idOf(principal));
    }

    @MessageExceptionHandler(BusinessException.class)
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public ErrorResponse handleBusiness(BusinessException exception) {
        return ErrorResponse.of(exception.errorCode());
    }

    @MessageExceptionHandler(Exception.class)
    @SendToUser(destinations = "/queue/errors", broadcast = false)
    public ErrorResponse handleUnexpected(Exception exception) {
        log.error("STOMP 처리 중 예상하지 못한 오류", exception);
        return ErrorResponse.of(ErrorCode.INTERNAL_ERROR);
    }
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest='LoginMemberTest,StompGameFlowTest,RoomApiTest'`
Expected: PASS

- [ ] **Step 5: 전체 회귀 확인 후 커밋**

Run: `mvn -q -f backend/pom.xml test`
Expected: PASS

```bash
git add backend
git commit -m "feat: STOMP 게임 행동·화면 동기화와 사용자별 에러 전달" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 접속 상태 추적과 끊긴 플레이어 기권 처리

**Files:**
- Modify: `ErrorCode.java`, `RoomMemberResponse.java`, `RoomResponse.java`, `RoomService.java`, `RoomController.java`
- Create: `backend/src/main/java/com/boardgame/room/application/{PresenceTracker,PresenceEventListener}.java`
- Test: `backend/src/test/java/com/boardgame/support/MutableClock.java`, `backend/src/test/java/com/boardgame/room/application/PresenceTrackerTest.java`, `backend/src/test/java/com/boardgame/room/api/RoomForfeitApiTest.java`

**Interfaces:**
- Consumes: Task 3·4의 `RoomService`, `RoomResponse`, `Room.isPlaying(long)`, `Room.leave(long)`, `OutcomePublisher`, `LoginMember.idOf`
- Produces:
  - `ErrorCode.FORFEIT_NOT_ALLOWED_YET`(409)
  - `@Component PresenceTracker` — `connected(long)`, `disconnected(long, Instant)`, `boolean isConnected(long)`, `Duration offlineFor(long, Instant now)`(끊긴 기록 없으면 0)
  - `PresenceEventListener` — `SessionConnectedEvent`/`SessionDisconnectEvent` → 트래커 갱신 + `RoomService.presenceChanged(long)`
  - `RoomMemberResponse(long id, String nickname, boolean host, boolean connected, long offlineSeconds)`; `RoomResponse.from(Room, PresenceTracker, Instant)`
  - `RoomService.forfeitDisconnected(String code, long requesterId, long targetId)`(60초 이상 끊긴 진행 중 참가자만), `RoomService.presenceChanged(long memberId)`
  - REST `POST /api/rooms/{code}/members/{memberId}/forfeit` → 204
  - 테스트 지원 `MutableClock`

- [ ] **Step 1: 에러 코드 추가**

`ErrorCode.java` — `INVALID_ROOM_NAME(` 줄 바로 아래에 추가:
```java
    FORFEIT_NOT_ALLOWED_YET(HttpStatus.CONFLICT, "연결이 끊긴 지 60초가 지나야 기권 처리할 수 있습니다."),
```

- [ ] **Step 2: 실패하는 테스트 작성**

`backend/src/test/java/com/boardgame/support/MutableClock.java`
```java
package com.boardgame.support;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

public class MutableClock extends Clock {

    private Instant now;

    public MutableClock(Instant start) {
        this.now = start;
    }

    public void advance(Duration duration) {
        now = now.plus(duration);
    }

    @Override
    public ZoneId getZone() {
        return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(ZoneId zone) {
        return this;
    }

    @Override
    public Instant instant() {
        return now;
    }
}
```

`backend/src/test/java/com/boardgame/room/application/PresenceTrackerTest.java`
```java
package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class PresenceTrackerTest {

    private static final Instant T0 = Instant.parse("2026-10-05T10:00:00Z");
    private final PresenceTracker tracker = new PresenceTracker();

    @Test
    void 연결한_적_없으면_연결_안_됨이지만_끊긴_시간은_0이다() {
        assertThat(tracker.isConnected(1L)).isFalse();
        assertThat(tracker.offlineFor(1L, T0)).isEqualTo(Duration.ZERO);
    }

    @Test
    void 끊긴_뒤_지난_시간을_계산한다() {
        tracker.connected(1L);
        assertThat(tracker.isConnected(1L)).isTrue();

        tracker.disconnected(1L, T0);

        assertThat(tracker.isConnected(1L)).isFalse();
        assertThat(tracker.offlineFor(1L, T0.plusSeconds(61))).isEqualTo(Duration.ofSeconds(61));
    }

    @Test
    void 탭_두_개_중_하나만_끊기면_여전히_연결_중이다() {
        tracker.connected(1L);
        tracker.connected(1L);

        tracker.disconnected(1L, T0);

        assertThat(tracker.isConnected(1L)).isTrue();
        assertThat(tracker.offlineFor(1L, T0.plusSeconds(100))).isEqualTo(Duration.ZERO);
    }

    @Test
    void 다시_연결하면_끊긴_기록이_지워진다() {
        tracker.connected(1L);
        tracker.disconnected(1L, T0);

        tracker.connected(1L);

        assertThat(tracker.isConnected(1L)).isTrue();
        assertThat(tracker.offlineFor(1L, T0.plusSeconds(100))).isEqualTo(Duration.ZERO);
    }
}
```

`backend/src/test/java/com/boardgame/room/api/RoomForfeitApiTest.java`
```java
package com.boardgame.room.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.game.MatchEntry;
import com.boardgame.game.ResultType;
import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.room.application.PresenceTracker;
import com.boardgame.room.application.RoomNotifier;
import com.boardgame.support.ApiUsers;
import com.boardgame.support.ApiUsers.User;
import com.boardgame.support.MutableClock;
import com.jayway.jsonpath.JsonPath;
import java.time.Duration;
import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
@RecordApplicationEvents
@Import(RoomForfeitApiTest.ClockTestConfig.class)
class RoomForfeitApiTest {

    @TestConfiguration
    static class ClockTestConfig {

        @Bean
        @Primary
        MutableClock mutableClock() {
            return new MutableClock(Instant.parse("2026-10-05T10:00:00Z"));
        }
    }

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ApplicationEvents events;

    @Autowired
    private PresenceTracker presence;

    @Autowired
    private MutableClock clock;

    @MockitoBean
    private RoomNotifier notifier;

    private String startedRoom(User host, User guest) throws Exception {
        String body = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"기권 방\", \"gameType\": \"PAPER_SAFARI\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        String code = JsonPath.read(body, "$.code");
        mockMvc.perform(post("/api/rooms/{code}/join", code).session(guest.session())).andExpect(status().isOk());
        mockMvc.perform(post("/api/rooms/{code}/start", code).session(host.session())).andExpect(status().isOk());
        return code;
    }

    private ResultActions forfeit(User requester, String code, User target) throws Exception {
        return mockMvc.perform(post("/api/rooms/{code}/members/{memberId}/forfeit", code, target.id())
                .session(requester.session()));
    }

    @Test
    void 끊긴_지_60초가_지나야_기권_처리할_수_있다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = startedRoom(host, guest);
        presence.connected(host.id());
        presence.connected(guest.id());
        presence.disconnected(guest.id(), clock.instant());

        clock.advance(Duration.ofSeconds(30));
        mockMvc.perform(get("/api/rooms/{code}", code).session(host.session()))
                .andExpect(jsonPath("$.members[1].connected").value(false))
                .andExpect(jsonPath("$.members[1].offlineSeconds").value(30))
                .andExpect(jsonPath("$.members[0].connected").value(true));
        forfeit(host, code, guest)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("FORFEIT_NOT_ALLOWED_YET"));

        clock.advance(Duration.ofSeconds(31));
        forfeit(host, code, guest).andExpect(status().isNoContent());

        assertThat(events.stream(GameCompletedEvent.class))
                .filteredOn(event -> event.result().entries().stream().anyMatch(entry -> entry.memberId() == guest.id()))
                .singleElement()
                .satisfies(event -> assertThat(event.result().entries()).containsExactly(
                        new MatchEntry(host.id(), ResultType.WIN, 0, 0),
                        new MatchEntry(guest.id(), ResultType.LOSE, 0, 1)));
        mockMvc.perform(get("/api/rooms/{code}", code).session(host.session()))
                .andExpect(jsonPath("$.status").value("WAITING"))
                .andExpect(jsonPath("$.members.length()").value(1));
    }

    @Test
    void 연결된_사람은_기권_처리할_수_없다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = startedRoom(host, guest);
        presence.connected(guest.id());

        clock.advance(Duration.ofMinutes(5));

        forfeit(host, code, guest)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("FORFEIT_NOT_ALLOWED_YET"));
    }

    @Test
    void 방_참가자가_아니면_기권_처리를_요청할_수_없다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        User stranger = ApiUsers.create(mockMvc);
        String code = startedRoom(host, guest);

        forfeit(stranger, code, guest)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_IN_ROOM"));
    }

    @Test
    void 게임에_참여하지_않는_사람은_기권_대상이_아니다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        User stranger = ApiUsers.create(mockMvc);
        String code = startedRoom(host, guest);

        forfeit(host, code, stranger)
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_A_PLAYER"));
    }
}
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest='PresenceTrackerTest,RoomForfeitApiTest'`
Expected: FAIL — `cannot find symbol: class PresenceTracker`

- [ ] **Step 4: 구현**

`backend/src/main/java/com/boardgame/room/application/PresenceTracker.java`
```java
package com.boardgame.room.application;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Component;

@Component
public class PresenceTracker {

    private final Map<Long, Integer> connections = new ConcurrentHashMap<>();
    private final Map<Long, Instant> disconnectedAt = new ConcurrentHashMap<>();

    public void connected(long memberId) {
        connections.merge(memberId, 1, Integer::sum);
        disconnectedAt.remove(memberId);
    }

    public void disconnected(long memberId, Instant at) {
        int remaining = connections.merge(memberId, -1, Integer::sum);
        if (remaining > 0) {
            return;
        }
        connections.remove(memberId);
        disconnectedAt.put(memberId, at);
    }

    public boolean isConnected(long memberId) {
        return connections.getOrDefault(memberId, 0) > 0;
    }

    public Duration offlineFor(long memberId, Instant now) {
        Instant since = disconnectedAt.get(memberId);
        if (since == null) {
            return Duration.ZERO;
        }
        return Duration.between(since, now);
    }
}
```

`RoomMemberResponse.java` — 전체 교체:
```java
package com.boardgame.room.api;

public record RoomMemberResponse(long id, String nickname, boolean host, boolean connected, long offlineSeconds) {
}
```

`RoomResponse.java` — `from` 메서드를 아래로 교체(import `com.boardgame.room.application.PresenceTracker`, `com.boardgame.room.domain.Participant`, `java.time.Instant` 추가):
```java
    public static RoomResponse from(Room room, PresenceTracker presence, Instant now) {
        long hostId = room.hostId();
        List<RoomMemberResponse> members = room.participants().stream()
                .map(participant -> member(participant, hostId, presence, now))
                .toList();
        GameType gameType = room.gameType();
        return new RoomResponse(room.codeValue(), room.nameValue(), gameType, gameType.displayName(),
                room.status(), hostId, gameType.maxPlayers(), members);
    }

    private static RoomMemberResponse member(Participant participant, long hostId, PresenceTracker presence,
                                             Instant now) {
        long memberId = participant.memberId();
        long offlineSeconds = presence.offlineFor(memberId, now).toSeconds();
        return new RoomMemberResponse(memberId, participant.nickname(), memberId == hostId,
                presence.isConnected(memberId), offlineSeconds);
    }
```

`RoomService.java` 변경:
1. 필드·생성자에 `PresenceTracker presence` 추가(생성자 마지막 파라미터, `this.presence = presence;`), import `com.boardgame.room.application.PresenceTracker`는 같은 패키지라 불필요, `java.time.Duration` import 추가.
2. 상수 추가: `private static final Duration FORFEIT_GRACE = Duration.ofSeconds(60);`
3. `RoomResponse.from(room)`을 쓰던 곳(`broadcast`, `get`, `myRoom`)을 `response(room)`으로 바꾸고 private 메서드 추가:
```java
    private RoomResponse response(Room room) {
        return RoomResponse.from(room, presence, clock.instant());
    }
```
   `myRoom`은 `registry.findByMember(memberId).map(this::response)`.
4. 메서드 추가:
```java
    public synchronized void forfeitDisconnected(String rawCode, long requesterId, long targetId) {
        Room room = find(rawCode);
        room.requireMember(requesterId);
        if (!room.isPlaying(targetId)) {
            throw new BusinessException(ErrorCode.NOT_A_PLAYER);
        }
        if (presence.isConnected(targetId) || presence.offlineFor(targetId, clock.instant()).compareTo(FORFEIT_GRACE) < 0) {
            throw new BusinessException(ErrorCode.FORFEIT_NOT_ALLOWED_YET);
        }
        List<GameOutcome> outcomes = room.leave(targetId);
        registry.save(room);
        outcomePublisher.publish(room, outcomes, clock.instant());
        broadcast(room);
    }

    public synchronized void presenceChanged(long memberId) {
        registry.findByMember(memberId).ifPresent(this::broadcastRoomOnly);
    }

    private void broadcastRoomOnly(Room room) {
        notifier.roomUpdated(response(room));
    }
```

`RoomController.java` — 메서드 추가:
```java
    @PostMapping("/{code}/members/{memberId}/forfeit")
    public ResponseEntity<Void> forfeit(@PathVariable String code, @PathVariable long memberId,
                                        @AuthenticationPrincipal LoginMember member) {
        roomService.forfeitDisconnected(code, member.id(), memberId);
        return ResponseEntity.noContent().build();
    }
```

`backend/src/main/java/com/boardgame/room/application/PresenceEventListener.java`
```java
package com.boardgame.room.application;

import com.boardgame.common.security.LoginMember;
import java.time.Clock;
import java.util.Optional;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.AbstractSubProtocolEvent;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

@Component
public class PresenceEventListener {

    private final PresenceTracker presence;
    private final RoomService roomService;
    private final Clock clock;

    public PresenceEventListener(PresenceTracker presence, RoomService roomService, Clock clock) {
        this.presence = presence;
        this.roomService = roomService;
        this.clock = clock;
    }

    @EventListener
    public void onConnected(SessionConnectedEvent event) {
        memberIdOf(event).ifPresent(this::markConnected);
    }

    @EventListener
    public void onDisconnected(SessionDisconnectEvent event) {
        memberIdOf(event).ifPresent(this::markDisconnected);
    }

    private void markConnected(long memberId) {
        presence.connected(memberId);
        roomService.presenceChanged(memberId);
    }

    private void markDisconnected(long memberId) {
        presence.disconnected(memberId, clock.instant());
        roomService.presenceChanged(memberId);
    }

    private Optional<Long> memberIdOf(AbstractSubProtocolEvent event) {
        return Optional.ofNullable(event.getUser()).map(LoginMember::idOf);
    }
}
```

- [ ] **Step 5: 테스트 통과 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest='PresenceTrackerTest,RoomForfeitApiTest,RoomApiTest,StompGameFlowTest'`
Expected: PASS

- [ ] **Step 6: 전체 회귀 확인 후 커밋**

Run: `mvn -q -f backend/pom.xml test`
Expected: PASS

```bash
git add backend
git commit -m "feat: 접속 상태 추적과 60초 끊김 기권 처리" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## 계획 3 완료 기준

- `mvn -q -f backend/pom.xml test` 전체 통과
- 스펙 §5.1(방), §5.2(STOMP 채널), §5.3(정보 은닉이 실제 전송 경로에서 유지), §5.4(직렬화), §5.5(끊김·기권), §2(게임 확장 구조)가 테스트로 검증됨
- 계획 4는 `GameStartedEvent`/`RoundCompletedEvent`/`GameCompletedEvent`를 `@EventListener`로 받아 저장한다
