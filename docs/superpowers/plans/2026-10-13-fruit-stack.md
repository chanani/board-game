# 과일 쌓기(Fruit Stack) 게임 추가 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 플랫폼(오, 유니버스)에 네 번째 게임 "과일 쌓기"(방당 2~5명, 각자 자기 판에서 같은 과일을 합쳐 점수를 겨룸, 컴퓨터 없음, 최대 10분)를 추가하고, 방·대기실·준비·채팅·관전·테마·감정 표현·시작 카운트다운·"게임 끝!"·결과 창·자동 기권·전적·순위가 다른 게임과 똑같이 동작하게 한다.

**Architecture:** 물리는 각자의 브라우저에서 `matter-js`로 돈다. 서버(`com.boardgame.fruitstack`)는 씨앗 하나, 사람마다 보고받은 점수, 탈락·기권 여부, 경기 시작 시각만 안다. 점수·탈락은 기존 행동 경로(`/app/rooms/{code}/actions`의 `SCORE`·`OUT`)로, 상대 판 모습은 기존 가벼운 신호 경로(`/app/rooms/{code}/signals`의 `BOARD` → `/user/queue/signal`)로 오간다. 세션의 유일한 마감은 경기 상한(시작 + 10분)이고 `autoAct`가 그때 경기를 끝낸다. 프론트는 DOM 없는 `src/games/fruitstack/engine/*`(씨앗 → 과일 순서, 물리 세계, 한 판의 규칙, 신호 인코딩, 보간, 저장, 보고 계획)를 먼저 만들고, 그 위에 캔버스 그리기·훅·테이블·결과 창·규칙·등록을 얹는다.

**Tech Stack:** Java 21, Spring Boot 3.5, JUnit 5/AssertJ/MockMvc, STOMP(simple broker); React 19, TypeScript 5.9, Tailwind 4, motion 14, matter-js 0.20, Vitest + Testing Library(jsdom).

**Spec:** `docs/superpowers/specs/2026-10-13-fruit-stack-design.md`. 규칙 번호 `R#`, 결정 번호 `D#`은 스펙의 것이다.

## Global Constraints

- 브랜치는 `feat/fruit-stack` 그대로 쓴다. push·merge·브랜치 전환·worktree 금지.
- 한 작업 = 한 커밋. 자기가 만든·고친 파일만 `git add <정확한 경로들>`(`git add -A`/`git add .` 금지). 커밋 메시지는 한국어, 끝에 빈 줄 하나 뒤 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 화면에 이모지 금지. 과일 그림·아이콘은 모두 우리가 그린 인라인 SVG(장식은 `aria-hidden="true"`). `frontend/src/noEmoji.test.ts`가 테스트가 아닌 모든 소스를 검사한다. 화면 어디에도 "수박게임"이라고 쓰지 않는다(과일 이름 "수박"은 쓴다).
- 화면 문구는 한국어, 기존 말투("~해요", "~하세요"). 이 계획에 따옴표로 적힌 문구는 글자 그대로 쓴다(테스트가 그 글자를 본다).
- 백엔드 Java는 `/Users/ichanhan/CLAUDE.md` 객체지향 생활 체조를 따른다: 메서드 들여쓰기 1단계(중첩 if/for 금지, 메서드 추출), `else` 금지(early return), 원시값은 VO, 컬렉션은 일급 컬렉션, 규칙은 도메인 안(세션·서비스에 규칙 없음), setter 없음, 한 줄에 점 하나(스트림 체인은 줄바꿈), 클래스 필드 3개 이하. 예외: 화면으로 나가는 record(`fruitstack/view/*`)는 필드 수 제한 예외, 내부 순번 카운터는 `long`.
- 오류는 도메인에서 `throw new BusinessException(ErrorCode.X)`(`BusinessException`은 `RuntimeException`), 응답은 기존 통일 형식 `{status, code, message}`(REST는 `@RestControllerAdvice`, STOMP는 `/user/queue/errors`).
- 페이퍼 사파리·우노·도둑잡기 동작은 바꾸지 않는다. 기존 테스트는 늘어난 게임 수 반영(Task 1·15에 적힌 곳) 말고는 고치지 않고 그대로 통과해야 한다.
- 규칙 번호 `R#`는 테스트 이름과 코드 주석에 그대로 쓴다. 테스트 이름은 한국어 + 밑줄(백엔드) / 한국어 문장(프론트).
- 프론트 타입 검사는 `npm run build`(= `tsc --noEmit && vite build`)로만 한다. **`npx tsc -b`를 절대 쓰지 말 것**(src에 .js 파일을 쏟아낸다).
- 명령: 백엔드 한 클래스 `cd backend && mvn -q test -Dtest=클래스명`, 전체 `cd backend && mvn -q test`. 프론트 한 파일 `cd frontend && npx vitest run <경로>`, 전체 `cd frontend && npx vitest run`, 빌드 `cd frontend && npm run build`.
- 모든 작업은 끝에 자기 쪽 저장소 전체가 초록이어야 한다: 백엔드 작업은 `mvn -q test`, 프론트 작업은 `npx vitest run`과 `npm run build`.
- 프론트 테스트 환경: `setMediaMatches(true | false | (query) => boolean)`(`src/test/media.ts`). `true`면 `pc`이고 `(pointer: fine)`도 참, `false`면 `portrait`, 눕힌 화면은 `setMediaMatches((query) => query === LANDSCAPE_PHONE_QUERY)`(`src/lib/useTableLayout.ts`). motion 애니메이션은 테스트에서 건너뛴다. 효과음 확인은 `<SoundContext.Provider value={{ ...SILENT_SOUND, play }}>`. jsdom에는 캔버스가 없다: `HTMLCanvasElement.prototype.getContext`는 그리기 테스트에서만 `vi.spyOn`으로 가짜를 준다.
- 표기: `B/` = `backend/src/main/java/com/boardgame/`, `BT/` = `backend/src/test/java/com/boardgame/`, `F/` = `frontend/src/`.

## 계약(백엔드와 프론트가 만나는 곳, Task 1에서 고정)

이 절의 값은 Task 1이 코드로 못 박고, 뒤 작업은 바꾸지 않는다. 바꿔야 하면 멈추고 알린다.

**화면**(`/user/queue/game`, 보는 사람 id 말고 모두에게 같다):

```json
{ "gameType": "FRUIT_STACK",
  "game": {
    "viewerId": 7, "status": "IN_PROGRESS", "startedAt": 1791900000000, "seed": 12345,
    "participantIds": [7, 12, 15],
    "players": [ { "playerId": 7, "score": 128, "state": "PLAYING" },
                 { "playerId": 12, "score": 311, "state": "OUT" },
                 { "playerId": 15, "score": 40, "state": "FORFEITED" } ],
    "result": null, "winnerId": null, "deadline": 1791900600000, "serverNow": 1791900123120 } }
```

- `status`: `IN_PROGRESS` | `GAME_OVER`. `state`: `PLAYING` | `OUT` | `FORFEITED`. `seed`: 0~2147483647. `deadline` = `startedAt + 600000`, 끝나면 `null`.
- 끝나면 `result = { "reason": "ALL_OUT" | "DECIDED" | "TIME_UP" | "FORFEIT", "standings": [ { "playerId", "score", "outcome": "WIN" | "DRAW" | "LOSE", "rank", "state" } ] }`(등수 순, 같은 등수는 자리 순). `winnerId`는 `WIN`이 한 명이면 그 사람, 아니면 `null`.

**행동**(`/app/rooms/{code}/actions`): `{ "type": "SCORE", "score": 128 }`, `{ "type": "OUT", "score": 311 }`. **신호**(`/app/rooms/{code}/signals`): `{ "type": "BOARD", "board": "WAAAAGAPqA" }`.

**중계되는 신호**(`/user/queue/signal`): `{ "gameType": "FRUIT_STACK", "type": "BOARD", "startedAt": 1791900000000, "playerId": 12, "seq": 418, "board": "WAAAAGAPqA" }`.

**`board` 형식(R23)**: 글자표 `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_`(값 0~63), 30비트 낱말 하나 = 5글자(높은 6비트부터). 첫 낱말 = 머리(비트 29~26 들고 있는 과일 단계 0~11, 25~16 `aimQ`, 15 위험, 14~0 = 0), 다음 낱말들 = 과일(29~26 단계 1~11, 25~16 `xQ`, 15~6 `yQ`, 5~0 `angleQ`), 과일 최대 239개. 길이 5 이상 1200 이하의 5의 배수. `WAAAAGAPqA` = 감(5)을 x 180에 들고 위험 아님 + 체리(1) 하나가 (180, 529) 각도 0.

**오류 코드**: `FRUIT_STACK_INVALID_PLAYER_COUNT`(400, "과일 쌓기는 2~5명이 플레이할 수 있습니다."), `FRUIT_STACK_SCORE_REJECTED`(409, "점수를 반영할 수 없어요."), `BOTS_NOT_SUPPORTED`(409, "이 게임은 컴퓨터와 할 수 없어요."). 그대로 쓰는 코드: `INVALID_INPUT`, `NOT_A_PLAYER`, `GAME_ALREADY_OVER`, `GAME_NOT_STARTED`.

## 작업 순서와 병렬

| 작업 | 한 줄 | 먼저 끝나야 하는 작업 | 함께 진행해도 되는 작업 |
|---|---|---|---|
| 1 | 계약 고정(행동 칸·오류 코드·게임 종류·화면 record·프론트 타입) | 없음 | 없음(혼자 먼저) |
| 2 | 백엔드: 컴퓨터 거절(R35) | 1 | 3, 4, 5, 7~15 |
| 3 | 백엔드: 점수·탈락·기권·끝 판정·승패 엔진 | 1 | 2, 7~15 |
| 4 | 백엔드: 판 신호 검증·속도 제한 | 3 | 2, 7~15 |
| 5 | 백엔드: 세션·화면 조립·스프링 등록 | 4 | 2, 7~15 |
| 6 | 백엔드: 통합 테스트(STOMP·상한·방 API·전적) | 2, 5 | 7~15 |
| 7 | 프론트 엔진: 상수·과일 순서·물리 세계 | 1 | 2~6, 11 |
| 8 | 프론트 엔진: 한 판의 규칙(떨어뜨리기·점수·탈락·시계) | 7 | 2~6, 9, 11, 12 |
| 9 | 프론트 엔진: 신호 인코딩·보간 | 7 | 2~6, 8, 10, 11, 12 |
| 10 | 프론트 엔진: 저장·복원·보고 계획 | 8 | 2~6, 9, 11, 12 |
| 11 | 프론트 공통 이음매(신호 구독·모듈의 컴퓨터 지원 칸·합치기 소리) | 1 | 2~10, 12 |
| 12 | 프론트: 과일 그림·그리기·크기 계산 | 7 | 2~6, 8~11 |
| 13 | 프론트: 훅(판 돌리기·보고·판 신호) | 8, 9, 10, 11 | 2~6, 12 |
| 14 | 프론트: 내 판 입력·작은 판·점수 띠·안내 문구·진행 기록·결과 창 | 12, 13 | 2~6 |
| 15 | 프론트: 테이블 조립·규칙·상자 그림·등록·컴퓨터 메뉴 감추기(R36) | 14 | 2~6 |
| 16 | 실제 브라우저 확인 | 6, 15 | 없음 |

- 백엔드 줄(2~6)과 프론트 줄(7~15)은 Task 1 뒤로 서로 기다리지 않는다. 프론트 테스트는 Task 1의 `fruitStackFixtures.ts`로 화면을 만들어 쓴다.
- 같은 파일을 두 작업이 고치는 곳은 없다(백엔드 `FruitStackGame.java`는 3이 만들고 4가 메서드를 더하므로 순서대로).

---

### Task 1: 계약 고정 — 행동 칸, 오류 코드, 게임 종류, 화면 record, 프론트 타입과 픽스처

**Files:**
- Modify: `B/game/GameAction.java`, `B/game/GameType.java`, `B/common/error/ErrorCode.java`
- Create: `B/fruitstack/view/FruitStackSessionView.java`, `FruitStackView.java`, `FruitStackPlayerView.java`, `FruitStackResultView.java`, `FruitStackStandingView.java`, `FruitStackBoardSignal.java`(모두 `B/fruitstack/view/`)
- Modify test: `BT/game/GameActionTest.java`, `BT/room/api/GameLobbyApiTest.java`
- Create test: `BT/common/error/FruitStackErrorCodeTest.java`, `BT/fruitstack/FruitStackContractTest.java`
- Modify: `F/api/types.ts`
- Create: `F/games/fruitstack/fruitStackFixtures.ts`, `F/games/fruitstack/fruitStackFixtures.test.ts`

**Interfaces:**
- Produces(백엔드): `record GameAction(String type, Integer column, Integer row, Integer cardId, String color, Long targetId, Integer index, List<Integer> cardIds, Integer score, String board)` + 기존 3·6·7칸 생성자 + 새 8칸 편의 생성자(`score`, `board` = `null`). `GameType.FRUIT_STACK("과일 쌓기", 2, 5)`(`OLD_MAID` 뒤), `GameType.supportsBots(): boolean`(`FRUIT_STACK`만 false). `ErrorCode.FRUIT_STACK_INVALID_PLAYER_COUNT`, `FRUIT_STACK_SCORE_REJECTED`, `BOTS_NOT_SUPPORTED`. 화면 record 6개(아래 Step 3). Task 2·3·4·5가 쓴다.
- Produces(프론트): `GameType`에 `'FRUIT_STACK'`, `FruitStackPlayerState`, `FruitStackPlayerView`, `FruitStackStanding`, `FruitStackEndReason`, `FruitStackResult`, `FruitStackView`, `FruitStackSessionView`, `FruitStackBoardSignal`, `GameAction.score?`/`board?`, type에 `'SCORE' | 'OUT' | 'BOARD'`. 픽스처 `fruitView(overrides?)`, `fruitSession(overrides?)`, `fruitPlayer(playerId, score, state?)`. Task 7~15가 쓴다.
- 주의: 이 작업 뒤 `FRUIT_STACK` 방은 만들 수 있지만 세션 팩토리가 없어 시작하면 서버 오류가 난다(Task 5가 팩토리를 등록한다). 이 작업의 테스트는 시작하지 않는다.

- [ ] **Step 1: 실패하는 백엔드 테스트 작성**

`BT/game/GameActionTest.java` 끝(마지막 `}` 앞)에 추가:

```java
    @Test
    void JSON의_score와_board_칸을_읽고_예전_생성자는_두_칸을_비워_둔다() throws Exception {
        GameAction score = mapper.readValue("{\"type\":\"SCORE\",\"score\":128}", GameAction.class);
        GameAction board = mapper.readValue("{\"type\":\"BOARD\",\"board\":\"WAAAAGAPqA\"}", GameAction.class);

        assertThat(score.score()).isEqualTo(128);
        assertThat(score.board()).isNull();
        assertThat(board.board()).isEqualTo("WAAAAGAPqA");
        assertThat(new GameAction("FLIP", 0, 1).score()).isNull();
        assertThat(new GameAction("DRAW", null, null, null, null, null, 3, null))
                .isEqualTo(new GameAction("DRAW", null, null, null, null, null, 3, null, null, null));
    }
```

`BT/common/error/FruitStackErrorCodeTest.java`:

```java
package com.boardgame.common.error;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameType;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class FruitStackErrorCodeTest {

    @Test
    void 과일_쌓기_오류_코드의_상태와_문구() {
        assertThat(ErrorCode.FRUIT_STACK_INVALID_PLAYER_COUNT.status()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(ErrorCode.FRUIT_STACK_INVALID_PLAYER_COUNT.message()).isEqualTo("과일 쌓기는 2~5명이 플레이할 수 있습니다.");
        assertThat(ErrorCode.FRUIT_STACK_SCORE_REJECTED.status()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(ErrorCode.FRUIT_STACK_SCORE_REJECTED.message()).isEqualTo("점수를 반영할 수 없어요.");
        assertThat(ErrorCode.BOTS_NOT_SUPPORTED.status()).isEqualTo(HttpStatus.CONFLICT);
        assertThat(ErrorCode.BOTS_NOT_SUPPORTED.message()).isEqualTo("이 게임은 컴퓨터와 할 수 없어요.");
    }

    @Test
    void 과일_쌓기는_2명에서_5명이고_컴퓨터를_받지_않는다() {
        assertThat(GameType.FRUIT_STACK.displayName()).isEqualTo("과일 쌓기");
        assertThat(GameType.FRUIT_STACK.minPlayers()).isEqualTo(2);
        assertThat(GameType.FRUIT_STACK.maxPlayers()).isEqualTo(5);
        assertThat(GameType.FRUIT_STACK.supportsBots()).isFalse();
        assertThat(GameType.PAPER_SAFARI.supportsBots()).isTrue();
        assertThat(GameType.UNO.supportsBots()).isTrue();
        assertThat(GameType.OLD_MAID.supportsBots()).isTrue();
        assertThat(GameType.values()[3]).isEqualTo(GameType.FRUIT_STACK);
    }
}
```

`BT/fruitstack/FruitStackContractTest.java`:

```java
package com.boardgame.fruitstack;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.fruitstack.view.FruitStackBoardSignal;
import com.boardgame.fruitstack.view.FruitStackPlayerView;
import com.boardgame.fruitstack.view.FruitStackResultView;
import com.boardgame.fruitstack.view.FruitStackSessionView;
import com.boardgame.fruitstack.view.FruitStackStandingView;
import com.boardgame.fruitstack.view.FruitStackView;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

class FruitStackContractTest {

    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void 진행_중_화면의_칸_이름과_값() {
        FruitStackView game = new FruitStackView(7, "IN_PROGRESS", 1791900000000L, 12345, List.of(7L, 12L),
                List.of(new FruitStackPlayerView(7, 128, "PLAYING"), new FruitStackPlayerView(12, 311, "OUT")),
                null, null, 1791900600000L, 1791900123120L);

        JsonNode json = mapper.valueToTree(new FruitStackSessionView(game));

        assertThat(json.get("gameType").asText()).isEqualTo("FRUIT_STACK");
        JsonNode node = json.get("game");
        assertThat(node.fieldNames()).toIterable().containsExactly("viewerId", "status", "startedAt", "seed",
                "participantIds", "players", "result", "winnerId", "deadline", "serverNow");
        assertThat(node.get("seed").asInt()).isEqualTo(12345);
        assertThat(node.get("players").get(1).fieldNames()).toIterable().containsExactly("playerId", "score", "state");
        assertThat(node.get("result").isNull()).isTrue();
        assertThat(node.get("deadline").asLong()).isEqualTo(1791900600000L);
    }

    @Test
    void 끝난_화면의_결과_칸() {
        FruitStackResultView result = new FruitStackResultView("DECIDED",
                List.of(new FruitStackStandingView(7, 320, "WIN", 1, "PLAYING"),
                        new FruitStackStandingView(12, 311, "LOSE", 2, "OUT")));
        FruitStackView game = new FruitStackView(7, "GAME_OVER", 1791900000000L, 12345, List.of(7L, 12L),
                List.of(new FruitStackPlayerView(7, 320, "PLAYING"), new FruitStackPlayerView(12, 311, "OUT")),
                result, 7L, null, 1791900200000L);

        JsonNode node = mapper.valueToTree(new FruitStackSessionView(game)).get("game");

        assertThat(node.get("result").get("reason").asText()).isEqualTo("DECIDED");
        assertThat(node.get("result").get("standings").get(0).fieldNames()).toIterable()
                .containsExactly("playerId", "score", "outcome", "rank", "state");
        assertThat(node.get("winnerId").asLong()).isEqualTo(7L);
        assertThat(node.get("deadline").isNull()).isTrue();
    }

    @Test
    void 중계되는_판_신호의_칸() {
        JsonNode json = mapper.valueToTree(FruitStackBoardSignal.of(1791900000000L, 12, 418, "WAAAAGAPqA"));

        assertThat(json.fieldNames()).toIterable()
                .containsExactly("gameType", "type", "startedAt", "playerId", "seq", "board");
        assertThat(json.get("gameType").asText()).isEqualTo("FRUIT_STACK");
        assertThat(json.get("type").asText()).isEqualTo("BOARD");
        assertThat(json.get("board").asText()).isEqualTo("WAAAAGAPqA");
    }
}
```

`BT/room/api/GameLobbyApiTest.java`: `$[2].maxPlayers` 단언(`.andExpect(jsonPath("$[2].maxPlayers").value(6))`) 바로 뒤에 같은 체인으로 이어 붙인다(세미콜론 위치를 옮긴다):

```java
                .andExpect(jsonPath("$[3].gameType").value("FRUIT_STACK"))
                .andExpect(jsonPath("$[3].name").value("과일 쌓기"))
                .andExpect(jsonPath("$[3].minPlayers").value(2))
                .andExpect(jsonPath("$[3].maxPlayers").value(5))
```

- [ ] **Step 2: 실패 확인**

Run: `cd backend && mvn -q test -Dtest='GameActionTest,FruitStackErrorCodeTest,FruitStackContractTest,GameLobbyApiTest'`
Expected: 컴파일 실패(`score()`, `FRUIT_STACK`, `fruitstack.view` 없음).

- [ ] **Step 3: 백엔드 구현**

`B/game/GameAction.java` 전체:

```java
package com.boardgame.game;

import java.util.List;

// 클라이언트가 보내는 행동·신호. 페이퍼 사파리는 column/row, 우노는 cardId/color/targetId, 도둑잡기는 index·cardIds,
// 과일 쌓기는 score(점수·탈락 보고)·board(판 신호)를 쓴다. 없는 칸은 null.
public record GameAction(String type, Integer column, Integer row, Integer cardId, String color, Long targetId,
                         Integer index, List<Integer> cardIds, Integer score, String board) {

    public GameAction(String type, Integer column, Integer row) {
        this(type, column, row, null, null, null, null, null);
    }

    public GameAction(String type, Integer column, Integer row, Integer cardId, String color, Long targetId) {
        this(type, column, row, cardId, color, targetId, null, null);
    }

    public GameAction(String type, Integer column, Integer row, Integer cardId, String color, Long targetId,
                      Integer index) {
        this(type, column, row, cardId, color, targetId, index, null);
    }

    public GameAction(String type, Integer column, Integer row, Integer cardId, String color, Long targetId,
                      Integer index, List<Integer> cardIds) {
        this(type, column, row, cardId, color, targetId, index, cardIds, null, null);
    }
}
```

`B/game/GameType.java`: 상수 줄을 `OLD_MAID("도둑잡기", 2, 6),` + `FRUIT_STACK("과일 쌓기", 2, 5);`로 바꾸고 메서드를 더한다:

```java
    /** 과일 쌓기는 각자의 브라우저에서 물리가 돌아 서버가 대신 둘 수 없다(R35). */
    public boolean supportsBots() {
        return this != FRUIT_STACK;
    }
```

`B/common/error/ErrorCode.java`: 마지막 상수 `OLD_MAID_CARD_NOT_IN_HAND(...)` 끝의 `;`를 `,`로 바꾸고 그 뒤에:

```java
    FRUIT_STACK_INVALID_PLAYER_COUNT(HttpStatus.BAD_REQUEST, "과일 쌓기는 2~5명이 플레이할 수 있습니다."),
    FRUIT_STACK_SCORE_REJECTED(HttpStatus.CONFLICT, "점수를 반영할 수 없어요."),
    BOTS_NOT_SUPPORTED(HttpStatus.CONFLICT, "이 게임은 컴퓨터와 할 수 없어요.");
```

`B/fruitstack/view/`의 record 6개(파일마다 `package com.boardgame.fruitstack.view;`):

```java
public record FruitStackSessionView(String gameType, FruitStackView game) {

    public static final String GAME_TYPE = "FRUIT_STACK";

    public FruitStackSessionView(FruitStackView game) {
        this(GAME_TYPE, game);
    }
}

// result·winnerId·deadline은 없으면 null. deadline·serverNow·startedAt은 epoch ms.
public record FruitStackView(long viewerId, String status, long startedAt, int seed, List<Long> participantIds,
                             List<FruitStackPlayerView> players, FruitStackResultView result, Long winnerId,
                             Long deadline, long serverNow) {
}

public record FruitStackPlayerView(long playerId, int score, String state) {
}

public record FruitStackResultView(String reason, List<FruitStackStandingView> standings) {
}

public record FruitStackStandingView(long playerId, int score, String outcome, int rank, String state) {
}

// /user/queue/signal로 방의 모두에게 가는 판 신호(R24). board는 서버가 풀어 보지 않은 그대로다.
public record FruitStackBoardSignal(String gameType, String type, long startedAt, long playerId, long seq,
                                    String board) {

    public static FruitStackBoardSignal of(long startedAt, long playerId, long seq, String board) {
        return new FruitStackBoardSignal(FruitStackSessionView.GAME_TYPE, "BOARD", startedAt, playerId, seq, board);
    }
}
```

- [ ] **Step 4: 백엔드 통과 확인**

Run: `cd backend && mvn -q test`
Expected: 전체 통과(기존 세 게임 테스트 포함). `GameAction`을 10칸 정식 생성자로 부르는 기존 코드는 없다(모두 3·6·7·8칸 생성자).

- [ ] **Step 5: 실패하는 프론트 테스트 작성**

`F/games/fruitstack/fruitStackFixtures.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { GameAction, GameSignal, SessionView } from '../../api/types';
import { fruitPlayer, fruitSession, fruitView } from './fruitStackFixtures';

describe('과일 쌓기 계약 타입과 픽스처', () => {
  it('기본 화면은 두 사람이 0점으로 게임 중이다', () => {
    const game = fruitView();
    expect(game).toMatchObject({ viewerId: 1, status: 'IN_PROGRESS', startedAt: 1_791_900_000_000, seed: 12345, participantIds: [1, 2], result: null, winnerId: null, deadline: 1_791_900_600_000, serverNow: 1_791_900_000_000 });
    expect(game.players).toEqual([{ playerId: 1, score: 0, state: 'PLAYING' }, { playerId: 2, score: 0, state: 'PLAYING' }]);
  });

  it('덮어쓴 칸만 바뀌고 세션 화면은 gameType을 단다', () => {
    const view: SessionView = fruitSession({ players: [fruitPlayer(1, 30), fruitPlayer(2, 12, 'OUT')] });
    expect(view.gameType).toBe('FRUIT_STACK');
    expect(view.game.players[1]).toEqual({ playerId: 2, score: 12, state: 'OUT' });
  });

  it('행동과 신호가 계약 모양이다', () => {
    const score: GameAction = { type: 'SCORE', score: 128 };
    const board: GameAction = { type: 'BOARD', board: 'WAAAAGAPqA' };
    const signal: GameSignal = { gameType: 'FRUIT_STACK', type: 'BOARD', startedAt: 1_791_900_000_000, playerId: 2, seq: 1, board: 'WAAAAGAPqA' };
    expect([score.type, board.type, signal.type]).toEqual(['SCORE', 'BOARD', 'BOARD']);
  });
});
```

- [ ] **Step 6: 실패 확인**

Run: `cd frontend && npx vitest run src/games/fruitstack/fruitStackFixtures.test.ts`
Expected: FAIL(`./fruitStackFixtures` 없음).

- [ ] **Step 7: 프론트 구현**

`F/api/types.ts`:
- `export type GameType = 'PAPER_SAFARI' | 'UNO' | 'OLD_MAID' | 'FRUIT_STACK';`
- `OldMaidActionType` 줄 아래에 `export type FruitStackActionType = 'SCORE' | 'OUT' | 'BOARD';`, `GameAction.type`을 `GameActionType | UnoActionType | OldMaidActionType | FruitStackActionType`으로, `GameAction`에 `/** 과일 쌓기 SCORE·OUT: 지금 내 총점. */ score?: number;`와 `/** 과일 쌓기 BOARD: 판 모습(R23). */ board?: string;`.
- `OldMaidPeekSignal` 정의 아래, `GameSignal` 정의 위에 추가:

```ts
export type FruitStackPlayerState = 'PLAYING' | 'OUT' | 'FORFEITED';
export type FruitStackPlayerView = { playerId: number; score: number; state: FruitStackPlayerState };
export type FruitStackEndReason = 'ALL_OUT' | 'DECIDED' | 'TIME_UP' | 'FORFEIT';
export type FruitStackStanding = { playerId: number; score: number; outcome: ResultType; rank: number; state: FruitStackPlayerState };
export type FruitStackResult = { reason: FruitStackEndReason; standings: FruitStackStanding[] };
export type FruitStackView = {
  viewerId: number;
  status: 'IN_PROGRESS' | 'GAME_OVER';
  /** 경기 시작 시각(epoch ms). 판의 시계·저장 무효화·신호 가리기·결과 창 닫음 기억 키에 쓴다. */
  startedAt: number;
  /** 과일 순서의 씨앗(R4). */
  seed: number;
  participantIds: number[];
  players: FruitStackPlayerView[];
  result: FruitStackResult | null;
  winnerId: number | null;
  /** 경기 상한 시각(epoch ms). 끝나면 null. */
  deadline: number | null;
  serverNow: number;
};
export type FruitStackSessionView = { gameType: 'FRUIT_STACK'; game: FruitStackView };
/** /user/queue/signal: 한 참가자의 판 모습(R23 인코딩). */
export type FruitStackBoardSignal = { gameType: 'FRUIT_STACK'; type: 'BOARD'; startedAt: number; playerId: number; seq: number; board: string };
```

- `export type GameSignal = OldMaidPeekSignal | FruitStackBoardSignal;`, `export type SessionView = PaperSafariSessionView | UnoSessionView | OldMaidSessionView | FruitStackSessionView;`

`F/games/fruitstack/fruitStackFixtures.ts`:

```ts
import type { FruitStackPlayerState, FruitStackPlayerView, FruitStackSessionView, FruitStackView } from '../../api/types';

export const FRUIT_STARTED_AT = 1_791_900_000_000;

export function fruitPlayer(playerId: number, score = 0, state: FruitStackPlayerState = 'PLAYING'): FruitStackPlayerView {
  return { playerId, score, state };
}

/** 두 사람(1, 2)이 0점으로 게임 중인 화면. 보는 사람은 1. */
export function fruitView(overrides: Partial<FruitStackView> = {}): FruitStackView {
  return {
    viewerId: 1, status: 'IN_PROGRESS', startedAt: FRUIT_STARTED_AT, seed: 12345, participantIds: [1, 2],
    players: [fruitPlayer(1), fruitPlayer(2)], result: null, winnerId: null,
    deadline: FRUIT_STARTED_AT + 600_000, serverNow: FRUIT_STARTED_AT, ...overrides,
  };
}

export function fruitSession(overrides: Partial<FruitStackView> = {}): FruitStackSessionView {
  return { gameType: 'FRUIT_STACK', game: fruitView(overrides) };
}
```

- [ ] **Step 8: 프론트 통과 확인**

Run: `cd frontend && npx vitest run && npm run build`
Expected: 전체 통과, 빌드 성공. `GameSignal`이 합집합이 되어 `F/games/oldmaid/usePeek.ts`의 `signal?.gameType === 'OLD_MAID'` 좁히기는 그대로 맞는다. 타입 오류가 나는 기존 파일이 있으면 그 자리에서 `gameType`으로 좁히기만 더하고 동작은 바꾸지 않는다.

- [ ] **Step 9: 커밋**

```bash
git add backend/src/main/java/com/boardgame/game/GameAction.java backend/src/main/java/com/boardgame/game/GameType.java backend/src/main/java/com/boardgame/common/error/ErrorCode.java backend/src/main/java/com/boardgame/fruitstack/view backend/src/test/java/com/boardgame/game/GameActionTest.java backend/src/test/java/com/boardgame/room/api/GameLobbyApiTest.java backend/src/test/java/com/boardgame/common/error/FruitStackErrorCodeTest.java backend/src/test/java/com/boardgame/fruitstack/FruitStackContractTest.java frontend/src/api/types.ts frontend/src/games/fruitstack/fruitStackFixtures.ts frontend/src/games/fruitstack/fruitStackFixtures.test.ts
git commit -m "feat: 과일 쌓기 계약을 고정한다(행동의 score·board 칸, 오류 코드 3개, 게임 종류, 화면·신호 모양, 프론트 타입)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 백엔드 — 과일 쌓기 방은 컴퓨터를 받지 않는다 (R35)

**Files:**
- Modify: `B/room/domain/Room.java`(`addBot` 한 메서드)
- Create test: `BT/room/api/FruitStackBotApiTest.java`

**Interfaces:**
- Consumes: Task 1의 `GameType.supportsBots()`, `ErrorCode.BOTS_NOT_SUPPORTED`(409, "이 게임은 컴퓨터와 할 수 없어요.").
- Produces: `POST /api/rooms/{code}/bots`가 과일 쌓기 방에서 409 `{ "status": 409, "code": "BOTS_NOT_SUPPORTED", "message": "이 게임은 컴퓨터와 할 수 없어요." }`. Task 6·16이 확인한다.

- [ ] **Step 1: 실패하는 테스트 작성**

`BT/room/api/FruitStackBotApiTest.java`(`ApiUsers.create(mockMvc)`는 가입·로그인한 `User(id, nickname, session)`을 준다):

```java
package com.boardgame.room.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.support.ApiUsers;
import com.boardgame.support.ApiUsers.User;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class FruitStackBotApiTest {

    @Autowired
    private MockMvc mockMvc;

    private String create(User host, String gameType) throws Exception {
        String body = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"방\", \"gameType\": \"" + gameType + "\", \"maxPlayers\": 4}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.code");
    }

    @Test
    void R35_과일_쌓기_방에_컴퓨터를_앉히면_409_BOTS_NOT_SUPPORTED() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = create(host, "FRUIT_STACK");

        mockMvc.perform(post("/api/rooms/" + code + "/bots").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"difficulty\": \"EASY\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.code").value("BOTS_NOT_SUPPORTED"))
                .andExpect(jsonPath("$.message").value("이 게임은 컴퓨터와 할 수 없어요."));
        mockMvc.perform(get("/api/rooms/" + code).session(host.session()))
                .andExpect(jsonPath("$.members.length()").value(1))
                .andExpect(jsonPath("$.practice").value(false));
        mockMvc.perform(post("/api/rooms/" + code + "/leave").session(host.session()));
    }

    @Test
    void R35_방장이_아니면_컴퓨터_지원_여부보다_먼저_403이다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        String code = create(host, "FRUIT_STACK");
        mockMvc.perform(post("/api/rooms/" + code + "/join").session(guest.session())).andExpect(status().isOk());

        mockMvc.perform(post("/api/rooms/" + code + "/bots").session(guest.session())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"difficulty\": \"EASY\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_ROOM_HOST"));
        mockMvc.perform(post("/api/rooms/" + code + "/leave").session(guest.session()));
        mockMvc.perform(post("/api/rooms/" + code + "/leave").session(host.session()));
    }

    @Test
    void 다른_게임_방은_그대로_컴퓨터를_받는다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = create(host, "UNO");

        mockMvc.perform(post("/api/rooms/" + code + "/bots").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON).content("{\"difficulty\": \"EASY\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.members.length()").value(2));
        mockMvc.perform(post("/api/rooms/" + code + "/leave").session(host.session()));
    }
}
```

요청 본문·가입 방식이 맞지 않아 컴파일·설정에서 막히면 같은 폴더의 `BotRoomApiTest.java`가 쓰는 방 만들기·컴퓨터 추가 호출을 그대로 따른다(단언은 위 그대로).

- [ ] **Step 2: 실패 확인**

Run: `cd backend && mvn -q test -Dtest=FruitStackBotApiTest`
Expected: 첫 테스트가 200을 받아 FAIL, 나머지 둘은 PASS.

- [ ] **Step 3: 구현**

`B/room/domain/Room.java`의 `addBot`을 바꾼다:

```java
    /** R8·R9: 방장이 대기 중에 컴퓨터를 앉힌다. 꽉 찼으면 게임 최대 인원까지 정원을 1 늘린다(D3). */
    public Participant addBot(long requesterId, BotDifficulty difficulty, Avatar avatar) {
        requireHost(requesterId);
        requireWaiting();
        requireBotsSupported();
        makeSeatForBot();
        return occupants.addBot(difficulty, avatar, profile.capacity());
    }

    // 과일 쌓기 R35: 컴퓨터를 받지 않는 게임의 방에는 앉히지 않는다.
    private void requireBotsSupported() {
        if (!gameType().supportsBots()) {
            throw new BusinessException(ErrorCode.BOTS_NOT_SUPPORTED);
        }
    }
```

- [ ] **Step 4: 통과 확인**

Run: `cd backend && mvn -q test`
Expected: 전체 통과.

- [ ] **Step 5: 커밋**

```bash
git add backend/src/main/java/com/boardgame/room/domain/Room.java backend/src/test/java/com/boardgame/room/api/FruitStackBotApiTest.java
git commit -m "feat: 과일 쌓기 방에 컴퓨터를 앉히려 하면 '이 게임은 컴퓨터와 할 수 없어요.'로 거절한다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 백엔드 엔진 — 점수 보고·탈락·기권·끝 판정·승패 (R19, R20, R26~R29)

**Files:**
- Create(모두 `B/fruitstack/`): `PlayerId.java`, `Score.java`, `ScoreCeiling.java`, `Seed.java`, `Place.java`, `PlayerState.java`, `FruitStackEndReason.java`, `Stacker.java`, `Stackers.java`, `Contest.java`, `MatchClock.java`, `FruitStackMatch.java`, `Standing.java`, `Standings.java`, `FruitStackResult.java`, `FruitStackGame.java`
- Create test(모두 `BT/fruitstack/`): `FruitStackFixtures.java`, `ScoreCeilingTest.java`, `FruitStackReportTest.java`, `FruitStackDecidedTest.java`, `FruitStackForfeitTest.java`, `StandingsTest.java`

**Interfaces:**
- Consumes: Task 1의 `ErrorCode.FRUIT_STACK_INVALID_PLAYER_COUNT`, `FRUIT_STACK_SCORE_REJECTED`. 기존 `com.boardgame.game.ResultType`(`WIN`, `DRAW`, `LOSE`), `com.boardgame.common.error.BusinessException`, 테스트 지원 `com.boardgame.support.MutableClock`(`advance(Duration)`), `com.boardgame.common.error.ErrorAssertions.assertError(ThrowingCallable, ErrorCode)`.
- Produces(Task 4·5가 쓴다):
  - `record PlayerId(long value)`, `record Score(int value)`(음수면 `INVALID_INPUT`, `Score.ZERO`, `isBelow(Score)`, `isAbove(Score)`, `exceeds(ScoreCeiling)`), `record Seed(int value)`(음수면 `IllegalArgumentException`), `record Place(int value)`, `enum PlayerState { PLAYING, OUT, FORFEITED }`, `enum FruitStackEndReason { ALL_OUT, DECIDED, TIME_UP, FORFEIT }` + `boolean recordsRound()`(`FORFEIT`만 false).
  - `record Standing(PlayerId player, Score score, ResultType result, Place place, PlayerState state)`, `Standings`: `entries(): List<Standing>`(등수 순, 같은 등수는 자리 순), `contenders(): List<Standing>`(기권 아닌 사람, 같은 순서), `inSeatOrder(): List<Standing>`, `winner(): Optional<PlayerId>`. `record FruitStackResult(FruitStackEndReason reason, Standings standings)`.
  - `FruitStackGame`: `static start(List<PlayerId> players, Seed seed, Clock clock)`, `report(PlayerId, Score)`, `out(PlayerId, Score)`, `forfeit(PlayerId)`, `timeUp(): boolean`(상한이 지나 지금 끝냈으면 true), `isFinished()`, `isPlaying(PlayerId)`, `result(): Optional<FruitStackResult>`, `participants(): List<PlayerId>`(받은 순서), `scoreOf(PlayerId): Score`, `stateOf(PlayerId): PlayerState`, `seed(): Seed`, `startedAt(): Instant`, `limitAt(): Instant`(시작 + 10분), `now(): Instant`.

**규칙(이 작업이 구현하는 것, 글자 그대로):**
- R19: 점수 검사 순서 — 보낸 사람이 살아 있지(`PLAYING`) 않으면 `FRUIT_STACK_SCORE_REJECTED` → 서버가 아는 점수보다 작으면 `FRUIT_STACK_SCORE_REJECTED` → 상한 `22 × (경과 ms ÷ 500의 몫 + 5)`를 넘으면 `FRUIT_STACK_SCORE_REJECTED` → 통과하면 그 값으로 바꾼다(같은 값도 받아들인다). 거절은 점수를 바꾸지 않는다. 그 앞에서 게임이 끝났으면 `GAME_ALREADY_OVER`, 참가자가 아니면 `NOT_A_PLAYER`.
- R20: `out`은 R19로 점수를 받아들인 뒤 그 사람을 `OUT`으로 바꾼다.
- R26: 받아들인 `report`·`out`과 기권 뒤마다 본다. (가) `PLAYING`이 0명이면 `ALL_OUT`. (나) `PLAYING`이 정확히 1명이면: 다른 겨루는 사람(기권 아닌 다른 참가자)이 없으면 `FORFEIT`, 있고 그 한 명의 점수가 그들 모두보다 엄격히 높으면 `DECIDED`, 아니면 이어진다. (다) 상한(시작 + 10분)이 지나 `timeUp()`을 부르면 `TIME_UP`.
- R27: 겨루는 사람 가운데 최고 점수가 한 명이면 `WIN`·나머지 `LOSE`, 여럿이면 그들끼리 `DRAW`·나머지 `LOSE`, 기권한 사람은 늘 `LOSE`. 등수는 겨루는 사람끼리 "자기보다 점수가 엄격히 높은 겨루는 사람 수 + 1", 기권한 사람은 모두 `겨루는 사람 수 + 1`.
- R28·R29: 살아 있는 사람만 기권이 된다. 탈락한 사람의 `forfeit`은 아무것도 바꾸지 않는다. `isPlaying`은 게임 중이고 그 사람이 `PLAYING`일 때만 true.

- [ ] **Step 1: 테스트 지원 코드와 실패하는 테스트 작성**

`BT/fruitstack/FruitStackFixtures.java`:

```java
package com.boardgame.fruitstack;

import com.boardgame.support.MutableClock;
import java.time.Instant;
import java.util.List;

final class FruitStackFixtures {

    static final PlayerId A = new PlayerId(1);
    static final PlayerId B = new PlayerId(2);
    static final PlayerId C = new PlayerId(3);
    static final Instant T0 = Instant.parse("2026-10-13T00:00:00Z");

    private FruitStackFixtures() {
    }

    static MutableClock clock() {
        return new MutableClock(T0);
    }

    static FruitStackGame game(MutableClock clock, PlayerId... players) {
        return FruitStackGame.start(List.of(players), new Seed(12345), clock);
    }

    static Score score(int value) {
        return new Score(value);
    }
}
```

`BT/fruitstack/ScoreCeilingTest.java`:

```java
package com.boardgame.fruitstack;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;
import org.junit.jupiter.api.Test;

class ScoreCeilingTest {

    @Test
    void R19_상한은_22_곱하기_경과를_500ms로_나눈_몫_더하기_5() {
        assertThat(ScoreCeiling.at(Duration.ZERO).value()).isEqualTo(110);
        assertThat(ScoreCeiling.at(Duration.ofMillis(499)).value()).isEqualTo(110);
        assertThat(ScoreCeiling.at(Duration.ofMillis(500)).value()).isEqualTo(132);
        assertThat(ScoreCeiling.at(Duration.ofMinutes(10)).value()).isEqualTo(26510);
        assertThat(ScoreCeiling.at(Duration.ofMillis(-30)).value()).isEqualTo(110);
    }

    @Test
    void R19_상한과_같은_점수는_넘지_않은_것이다() {
        assertThat(new Score(110).exceeds(ScoreCeiling.at(Duration.ZERO))).isFalse();
        assertThat(new Score(111).exceeds(ScoreCeiling.at(Duration.ZERO))).isTrue();
    }
}
```

`BT/fruitstack/FruitStackReportTest.java`:

```java
package com.boardgame.fruitstack;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static com.boardgame.fruitstack.FruitStackFixtures.A;
import static com.boardgame.fruitstack.FruitStackFixtures.B;
import static com.boardgame.fruitstack.FruitStackFixtures.C;
import static com.boardgame.fruitstack.FruitStackFixtures.clock;
import static com.boardgame.fruitstack.FruitStackFixtures.game;
import static com.boardgame.fruitstack.FruitStackFixtures.score;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.boardgame.common.error.ErrorCode;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;

class FruitStackReportTest {

    private final MutableClock clock = clock();

    @Test
    void 시작하면_모두_0점으로_살아_있고_상한은_10분_뒤다() {
        FruitStackGame game = game(clock, A, B);

        assertThat(game.participants()).containsExactly(A, B);
        assertThat(game.scoreOf(A)).isEqualTo(Score.ZERO);
        assertThat(game.stateOf(B)).isEqualTo(PlayerState.PLAYING);
        assertThat(game.isPlaying(A)).isTrue();
        assertThat(game.isFinished()).isFalse();
        assertThat(game.limitAt()).isEqualTo(FruitStackFixtures.T0.plusSeconds(600));
        assertThat(game.seed()).isEqualTo(new Seed(12345));
    }

    @Test
    void 두_명보다_적거나_다섯_명보다_많으면_시작하지_못한다() {
        assertError(() -> game(clock, A), ErrorCode.FRUIT_STACK_INVALID_PLAYER_COUNT);
        assertError(() -> FruitStackGame.start(List.of(A, B, C, new PlayerId(4), new PlayerId(5), new PlayerId(6)),
                new Seed(1), clock), ErrorCode.FRUIT_STACK_INVALID_PLAYER_COUNT);
    }

    @Test
    void R19_오르는_점수와_같은_점수는_받아들인다() {
        FruitStackGame game = game(clock, A, B, C);

        game.report(A, score(10));
        game.report(A, score(10));
        game.report(A, score(31));

        assertThat(game.scoreOf(A)).isEqualTo(score(31));
        assertThat(game.scoreOf(B)).isEqualTo(Score.ZERO);
    }

    @Test
    void R19_줄어든_점수는_거절하고_점수는_그대로다() {
        FruitStackGame game = game(clock, A, B, C);
        game.report(A, score(30));

        assertError(() -> game.report(A, score(29)), ErrorCode.FRUIT_STACK_SCORE_REJECTED);

        assertThat(game.scoreOf(A)).isEqualTo(score(30));
    }

    @Test
    void R19_상한을_넘는_점수는_거절하고_시간이_지나면_받아들인다() {
        FruitStackGame game = game(clock, A, B, C);

        assertError(() -> game.report(A, score(111)), ErrorCode.FRUIT_STACK_SCORE_REJECTED);
        assertThat(game.scoreOf(A)).isEqualTo(Score.ZERO);

        clock.advance(Duration.ofMillis(500));
        game.report(A, score(111));
        assertThat(game.scoreOf(A)).isEqualTo(score(111));
    }

    @Test
    void 음수_점수는_INVALID_INPUT이고_참가자가_아니면_NOT_A_PLAYER다() {
        FruitStackGame game = game(clock, A, B, C);

        assertError(() -> score(-1), ErrorCode.INVALID_INPUT);
        assertError(() -> game.report(new PlayerId(99), score(1)), ErrorCode.NOT_A_PLAYER);
    }

    @Test
    void R20_탈락은_점수를_받아들이고_그_사람을_탈락으로_바꾼다() {
        FruitStackGame game = game(clock, A, B, C);

        game.out(A, score(40));

        assertThat(game.scoreOf(A)).isEqualTo(score(40));
        assertThat(game.stateOf(A)).isEqualTo(PlayerState.OUT);
        assertThat(game.isPlaying(A)).isFalse();
        assertThat(game.isFinished()).isFalse();
    }

    @Test
    void R19_탈락한_사람의_보고와_또_한_번의_탈락은_거절한다() {
        FruitStackGame game = game(clock, A, B, C);
        game.out(A, score(40));

        assertError(() -> game.report(A, score(50)), ErrorCode.FRUIT_STACK_SCORE_REJECTED);
        assertError(() -> game.out(A, score(40)), ErrorCode.FRUIT_STACK_SCORE_REJECTED);

        assertThat(game.scoreOf(A)).isEqualTo(score(40));
    }

    @Test
    void R20_거절된_탈락_보고는_탈락시키지_않는다() {
        FruitStackGame game = game(clock, A, B, C);
        game.report(A, score(30));

        assertThatThrownBy(() -> game.out(A, score(20))).isNotNull();

        assertThat(game.stateOf(A)).isEqualTo(PlayerState.PLAYING);
    }

    @Test
    void R26_모두_탈락하면_ALL_OUT으로_끝나고_끝난_뒤에는_GAME_ALREADY_OVER다() {
        FruitStackGame game = game(clock, A, B);
        game.out(A, score(20));
        assertThat(game.isFinished()).isFalse();

        game.out(B, score(20));

        assertThat(game.isFinished()).isTrue();
        assertThat(game.result().orElseThrow().reason()).isEqualTo(FruitStackEndReason.ALL_OUT);
        assertThat(game.isPlaying(A)).isFalse();
        assertError(() -> game.report(B, score(30)), ErrorCode.GAME_ALREADY_OVER);
        assertError(() -> game.out(B, score(30)), ErrorCode.GAME_ALREADY_OVER);
    }

    @Test
    void R17_상한_전의_timeUp은_아무것도_하지_않고_상한이_지나면_TIME_UP으로_끝낸다() {
        FruitStackGame game = game(clock, A, B);
        clock.advance(Duration.ofSeconds(599));
        assertThat(game.timeUp()).isFalse();
        assertThat(game.isFinished()).isFalse();

        clock.advance(Duration.ofSeconds(1));

        assertThat(game.timeUp()).isTrue();
        assertThat(game.result().orElseThrow().reason()).isEqualTo(FruitStackEndReason.TIME_UP);
        assertThat(game.timeUp()).isFalse();
    }
}
```

`BT/fruitstack/FruitStackDecidedTest.java`:

```java
package com.boardgame.fruitstack;

import static com.boardgame.fruitstack.FruitStackFixtures.A;
import static com.boardgame.fruitstack.FruitStackFixtures.B;
import static com.boardgame.fruitstack.FruitStackFixtures.C;
import static com.boardgame.fruitstack.FruitStackFixtures.clock;
import static com.boardgame.fruitstack.FruitStackFixtures.game;
import static com.boardgame.fruitstack.FruitStackFixtures.score;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.ResultType;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import org.junit.jupiter.api.Test;

// R26 (나): 살아 있는 사람이 한 명이고 그 점수가 다른 겨루는 사람 모두보다 엄격히 높으면 그 순간 끝난다.
class FruitStackDecidedTest {

    private final MutableClock clock = clock();

    private FruitStackEndReason reasonOf(FruitStackGame game) {
        return game.result().orElseThrow().reason();
    }

    @Test
    void R26_상대가_탈락해_혼자_남는_순간_내_점수가_더_높으면_DECIDED로_끝나고_내가_이긴다() {
        FruitStackGame game = game(clock, A, B);
        game.report(B, score(50));

        game.out(A, score(30));

        assertThat(game.isFinished()).isTrue();
        assertThat(reasonOf(game)).isEqualTo(FruitStackEndReason.DECIDED);
        assertThat(game.result().orElseThrow().standings().winner()).contains(B);
        assertThat(game.stateOf(B)).isEqualTo(PlayerState.PLAYING);
    }

    @Test
    void R26_혼자_남았어도_점수가_같거나_낮으면_이어진다() {
        FruitStackGame tied = game(clock, A, B);
        tied.report(B, score(30));
        tied.out(A, score(30));
        assertThat(tied.isFinished()).isFalse();

        FruitStackGame behind = game(clock, A, B);
        behind.report(B, score(10));
        behind.out(A, score(30));
        assertThat(behind.isFinished()).isFalse();
    }

    @Test
    void R26_이어지다_점수_보고로_엄격히_높아지는_순간_DECIDED로_끝난다() {
        FruitStackGame game = game(clock, A, B);
        game.out(A, score(30));

        game.report(B, score(30));
        assertThat(game.isFinished()).isFalse();
        game.report(B, score(31));

        assertThat(reasonOf(game)).isEqualTo(FruitStackEndReason.DECIDED);
        assertThat(game.result().orElseThrow().standings().winner()).contains(B);
    }

    @Test
    void R26_세_명에서_첫_탈락_때는_두_명이_살아_있어_끝나지_않고_두_번째_탈락_때_판정한다() {
        FruitStackGame game = game(clock, A, B, C);
        game.report(C, score(60));
        game.out(A, score(40));
        assertThat(game.isFinished()).isFalse();

        game.out(B, score(50));

        assertThat(reasonOf(game)).isEqualTo(FruitStackEndReason.DECIDED);
        assertThat(game.result().orElseThrow().standings().winner()).contains(C);
    }

    @Test
    void R26_탈락한_사람들_가운데_가장_높은_점수를_넘어야_끝난다() {
        FruitStackGame game = game(clock, A, B, C);
        game.report(C, score(45));
        game.out(A, score(40));
        game.out(B, score(50));
        assertThat(game.isFinished()).isFalse();

        game.report(C, score(51));

        assertThat(reasonOf(game)).isEqualTo(FruitStackEndReason.DECIDED);
    }

    @Test
    void R26_기권한_사람의_점수는_견주지_않는다() {
        FruitStackGame game = game(clock, A, B, C);
        game.report(A, score(90));
        game.report(C, score(20));
        game.out(B, score(10));
        assertThat(game.isFinished()).isFalse();

        game.forfeit(A);

        assertThat(reasonOf(game)).isEqualTo(FruitStackEndReason.DECIDED);
        assertThat(game.result().orElseThrow().standings().winner()).contains(C);
    }

    @Test
    void R26_넘지_못하고_탈락하면_ALL_OUT이고_상한이면_TIME_UP이다() {
        FruitStackGame out = game(clock, A, B);
        out.out(A, score(30));
        out.out(B, score(20));
        assertThat(reasonOf(out)).isEqualTo(FruitStackEndReason.ALL_OUT);
        assertThat(out.result().orElseThrow().standings().winner()).contains(A);

        FruitStackGame late = game(clock, A, B);
        late.out(A, score(30));
        clock.advance(Duration.ofMinutes(10));
        assertThat(late.timeUp()).isTrue();
        assertThat(reasonOf(late)).isEqualTo(FruitStackEndReason.TIME_UP);
        assertThat(late.result().orElseThrow().standings().entries().get(0).result()).isEqualTo(ResultType.WIN);
    }
}
```

`BT/fruitstack/FruitStackForfeitTest.java`:

```java
package com.boardgame.fruitstack;

import static com.boardgame.fruitstack.FruitStackFixtures.A;
import static com.boardgame.fruitstack.FruitStackFixtures.B;
import static com.boardgame.fruitstack.FruitStackFixtures.C;
import static com.boardgame.fruitstack.FruitStackFixtures.clock;
import static com.boardgame.fruitstack.FruitStackFixtures.game;
import static com.boardgame.fruitstack.FruitStackFixtures.score;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.support.MutableClock;
import org.junit.jupiter.api.Test;

class FruitStackForfeitTest {

    private final MutableClock clock = clock();

    @Test
    void R26_둘이서_한_명이_기권하면_FORFEIT으로_끝나고_남은_사람이_이긴다() {
        FruitStackGame game = game(clock, A, B);
        game.report(A, score(50));

        game.forfeit(A);

        assertThat(game.result().orElseThrow().reason()).isEqualTo(FruitStackEndReason.FORFEIT);
        assertThat(game.result().orElseThrow().standings().winner()).contains(B);
        assertThat(game.stateOf(A)).isEqualTo(PlayerState.FORFEITED);
    }

    @Test
    void R26_셋이_모두_0점일_때_한_명이_기권하면_이어진다() {
        FruitStackGame game = game(clock, A, B, C);

        game.forfeit(A);

        assertThat(game.isFinished()).isFalse();
        assertThat(game.isPlaying(A)).isFalse();
        assertThat(game.isPlaying(B)).isTrue();
    }

    @Test
    void R26_탈락한_사람보다_낮은_남은_한_명이_기권하면_ALL_OUT으로_끝나고_탈락한_사람이_이긴다() {
        FruitStackGame game = game(clock, A, B);
        game.out(A, score(30));
        game.report(B, score(10));

        game.forfeit(B);

        assertThat(game.result().orElseThrow().reason()).isEqualTo(FruitStackEndReason.ALL_OUT);
        assertThat(game.result().orElseThrow().standings().winner()).contains(A);
    }

    @Test
    void R29_탈락한_사람의_기권은_아무것도_바꾸지_않는다() {
        FruitStackGame game = game(clock, A, B, C);
        game.out(A, score(30));

        game.forfeit(A);

        assertThat(game.stateOf(A)).isEqualTo(PlayerState.OUT);
        assertThat(game.isFinished()).isFalse();
    }

    @Test
    void 참가자가_아닌_사람과_끝난_뒤의_기권은_조용히_넘어간다() {
        FruitStackGame game = game(clock, A, B);
        game.forfeit(new PlayerId(99));
        assertThat(game.isFinished()).isFalse();

        game.forfeit(A);
        game.forfeit(B);

        assertThat(game.stateOf(B)).isEqualTo(PlayerState.PLAYING);
    }
}
```

`BT/fruitstack/StandingsTest.java`:

```java
package com.boardgame.fruitstack;

import static com.boardgame.fruitstack.FruitStackFixtures.A;
import static com.boardgame.fruitstack.FruitStackFixtures.B;
import static com.boardgame.fruitstack.FruitStackFixtures.C;
import static com.boardgame.fruitstack.FruitStackFixtures.clock;
import static com.boardgame.fruitstack.FruitStackFixtures.game;
import static com.boardgame.fruitstack.FruitStackFixtures.score;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.ResultType;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.util.List;
import org.junit.jupiter.api.Test;

class StandingsTest {

    private final MutableClock clock = clock();

    private Standings timeUp(FruitStackGame game) {
        clock.advance(Duration.ofMinutes(10));
        game.timeUp();
        return game.result().orElseThrow().standings();
    }

    private List<ResultType> resultsInSeatOrder(Standings standings) {
        return standings.inSeatOrder().stream().map(Standing::result).toList();
    }

    private List<Integer> placesInSeatOrder(Standings standings) {
        return standings.inSeatOrder().stream().map(Standing::place).map(Place::value).toList();
    }

    @Test
    void R27_최고_점수_한_명이_이기고_나머지는_진다() {
        FruitStackGame game = game(clock, A, B, C);
        game.report(A, score(10));
        game.report(B, score(30));
        game.report(C, score(20));

        Standings standings = timeUp(game);

        assertThat(resultsInSeatOrder(standings)).containsExactly(ResultType.LOSE, ResultType.WIN, ResultType.LOSE);
        assertThat(placesInSeatOrder(standings)).containsExactly(3, 1, 2);
        assertThat(standings.entries().stream().map(Standing::player).toList()).containsExactly(B, C, A);
        assertThat(standings.winner()).contains(B);
    }

    @Test
    void R27_최고_점수가_같으면_그들끼리_비기고_나머지는_진다() {
        FruitStackGame game = game(clock, A, B, C);
        game.report(A, score(30));
        game.report(B, score(30));
        game.report(C, score(20));

        Standings standings = timeUp(game);

        assertThat(resultsInSeatOrder(standings)).containsExactly(ResultType.DRAW, ResultType.DRAW, ResultType.LOSE);
        assertThat(placesInSeatOrder(standings)).containsExactly(1, 1, 3);
        assertThat(standings.winner()).isEmpty();
    }

    @Test
    void R27_모두_0점이면_모두_비긴다() {
        Standings standings = timeUp(game(clock, A, B));

        assertThat(resultsInSeatOrder(standings)).containsExactly(ResultType.DRAW, ResultType.DRAW);
    }

    @Test
    void R27_기권한_사람은_최고_점수여도_지고_마지막_등수다() {
        FruitStackGame game = game(clock, A, B, C);
        game.report(A, score(90));
        game.report(B, score(30));
        game.forfeit(A);

        Standings standings = timeUp(game);

        assertThat(resultsInSeatOrder(standings)).containsExactly(ResultType.LOSE, ResultType.WIN, ResultType.LOSE);
        assertThat(placesInSeatOrder(standings)).containsExactly(3, 1, 2);
        assertThat(standings.contenders().stream().map(Standing::player).toList()).containsExactly(B, C);
        assertThat(standings.entries().get(2).state()).isEqualTo(PlayerState.FORFEITED);
        assertThat(standings.entries().get(2).score()).isEqualTo(score(90));
    }
}
```

- [ ] **Step 2: 실패 확인**

Run: `cd backend && mvn -q test -Dtest='ScoreCeilingTest,FruitStackReportTest,FruitStackDecidedTest,FruitStackForfeitTest,StandingsTest'`
Expected: 컴파일 실패(`com.boardgame.fruitstack`의 클래스 없음).

- [ ] **Step 3: VO·점수 상한·시계 구현**

파일마다 `package com.boardgame.fruitstack;`.

```java
public record PlayerId(long value) {
}

// R10·R19: 점수는 0 이상이고 줄지 않는다.
public record Score(int value) {

    public static final Score ZERO = new Score(0);

    public Score {
        if (value < 0) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
    }

    public boolean isBelow(Score other) {
        return value < other.value;
    }

    public boolean isAbove(Score other) {
        return value > other.value;
    }

    public boolean exceeds(ScoreCeiling ceiling) {
        return ceiling.isBelow(value);
    }
}

// R19·D6: 떨어뜨린 과일 하나가 낼 수 있는 점수는 22를 넘지 못하고, 쿨다운 500ms라 떨어뜨린 횟수는 경과÷500+1을 넘지 못한다. 여유 4번.
public record ScoreCeiling(long value) {

    private static final long PER_DROP = 22;
    private static final long DROP_GAP_MS = 500;
    private static final long GRACE_DROPS = 5;

    public static ScoreCeiling at(Duration elapsed) {
        long elapsedMs = Math.max(0, elapsed.toMillis());
        return new ScoreCeiling(PER_DROP * (elapsedMs / DROP_GAP_MS + GRACE_DROPS));
    }

    boolean isBelow(int score) {
        return value < score;
    }
}

// R4: 과일 순서의 씨앗(0 이상 int).
public record Seed(int value) {

    public Seed {
        if (value < 0) {
            throw new IllegalArgumentException("씨앗은 0 이상이어야 합니다: " + value);
        }
    }
}

// R27: 등수(1부터).
public record Place(int value) {
}

public enum PlayerState {
    PLAYING, OUT, FORFEITED
}

// R26·R30: 끝난 이유. FORFEIT(상대가 모두 나가 혼자 남음)만 라운드 기록을 남기지 않는다.
public enum FruitStackEndReason {
    ALL_OUT, DECIDED, TIME_UP, FORFEIT;

    public boolean recordsRound() {
        return this != FORFEIT;
    }
}

// R17: 경기 시각. 상한은 시작 + 10분.
public class MatchClock {

    public static final Duration LIMIT = Duration.ofMinutes(10);

    private final Clock clock;
    private final Instant startedAt;

    public MatchClock(Clock clock) {
        this.clock = clock;
        this.startedAt = clock.instant();
    }

    public Instant startedAt() {
        return startedAt;
    }

    public Instant now() {
        return clock.instant();
    }

    public Duration elapsed() {
        return Duration.between(startedAt, now());
    }

    public Instant limitAt() {
        return startedAt.plus(LIMIT);
    }

    public boolean isTimeUp() {
        return !now().isBefore(limitAt());
    }
}

// 씨앗과 경기 시각 묶음(필드 수 제한).
public record FruitStackMatch(Seed seed, MatchClock clock) {

    ScoreCeiling ceiling() {
        return ScoreCeiling.at(clock.elapsed());
    }
}
```

- [ ] **Step 4: 한 사람·참가자 묶음·끝 판정 구현**

```java
// 한 사람의 점수와 상태(R19·R20·R28).
public class Stacker {

    private Score score = Score.ZERO;
    private PlayerState state = PlayerState.PLAYING;

    // R19: 살아 있는 사람의, 줄지 않고 상한 안인 점수만 받는다. 거절하면 아무것도 바꾸지 않는다.
    void report(Score next, ScoreCeiling ceiling) {
        if (!isPlaying() || next.isBelow(score) || next.exceeds(ceiling)) {
            throw new BusinessException(ErrorCode.FRUIT_STACK_SCORE_REJECTED);
        }
        score = next;
    }

    void goOut() {
        state = PlayerState.OUT;
    }

    // R28·R29: 살아 있는 사람만 기권이 된다. 기권이 되었으면 true.
    boolean forfeit() {
        if (!isPlaying()) {
            return false;
        }
        state = PlayerState.FORFEITED;
        return true;
    }

    boolean isPlaying() {
        return state == PlayerState.PLAYING;
    }

    boolean isContender() {
        return state != PlayerState.FORFEITED;
    }

    Score score() {
        return score;
    }

    PlayerState state() {
        return state;
    }
}

// 참가자 묶음(받은 순서 = 자리 순서).
public class Stackers {

    private static final int MIN = 2;
    private static final int MAX = 5;

    private final Map<PlayerId, Stacker> stackers = new LinkedHashMap<>();

    public Stackers(List<PlayerId> players) {
        if (players.size() < MIN || players.size() > MAX) {
            throw new BusinessException(ErrorCode.FRUIT_STACK_INVALID_PLAYER_COUNT);
        }
        players.forEach(player -> stackers.put(player, new Stacker()));
    }

    boolean contains(PlayerId player) {
        return stackers.containsKey(player);
    }

    Stacker of(PlayerId player) {
        Stacker stacker = stackers.get(player);
        if (stacker == null) {
            throw new BusinessException(ErrorCode.NOT_A_PLAYER);
        }
        return stacker;
    }

    List<PlayerId> ids() {
        return List.copyOf(stackers.keySet());
    }

    List<PlayerId> playing() {
        return ids().stream()
                .filter(player -> of(player).isPlaying())
                .toList();
    }

    List<PlayerId> contenders() {
        return ids().stream()
                .filter(player -> of(player).isContender())
                .toList();
    }

    // R26 (가)·(나): 지금 끝났으면 그 이유.
    Optional<FruitStackEndReason> verdict() {
        List<PlayerId> alive = playing();
        if (alive.isEmpty()) {
            return Optional.of(FruitStackEndReason.ALL_OUT);
        }
        if (alive.size() > 1) {
            return Optional.empty();
        }
        return lastOneVerdict(alive.get(0));
    }

    // R26 (나): 혼자 남은 사람. 견줄 사람이 없으면 FORFEIT, 모두보다 엄격히 높으면 DECIDED, 아니면 이어진다.
    private Optional<FruitStackEndReason> lastOneVerdict(PlayerId last) {
        List<Score> rivals = contenders().stream()
                .filter(player -> !player.equals(last))
                .map(player -> of(player).score())
                .toList();
        if (rivals.isEmpty()) {
            return Optional.of(FruitStackEndReason.FORFEIT);
        }
        Score mine = of(last).score();
        if (rivals.stream().allMatch(mine::isAbove)) {
            return Optional.of(FruitStackEndReason.DECIDED);
        }
        return Optional.empty();
    }
}

// 참가자 묶음과 끝난 이유(R26). 끝난 뒤에는 바뀌지 않는다(호출하는 FruitStackGame이 막는다).
public class Contest {

    private final Stackers stackers;
    private FruitStackEndReason reason;

    public Contest(Stackers stackers) {
        this.stackers = stackers;
    }

    void report(PlayerId player, Score score, ScoreCeiling ceiling) {
        Stacker stacker = stackers.of(player);
        stacker.report(score, ceiling);
        settle();
    }

    // R20: 점수를 받아들인 뒤 탈락시킨다(점수가 거절되면 탈락도 없다).
    void out(PlayerId player, Score score, ScoreCeiling ceiling) {
        Stacker stacker = stackers.of(player);
        stacker.report(score, ceiling);
        stacker.goOut();
        settle();
    }

    void forfeit(PlayerId player) {
        if (!stackers.contains(player)) {
            return;
        }
        Stacker stacker = stackers.of(player);
        if (stacker.forfeit()) {
            settle();
        }
    }

    void timeUp() {
        reason = FruitStackEndReason.TIME_UP;
    }

    boolean isOver() {
        return reason != null;
    }

    Optional<FruitStackEndReason> reason() {
        return Optional.ofNullable(reason);
    }

    Stackers stackers() {
        return stackers;
    }

    private void settle() {
        Optional<FruitStackEndReason> verdict = stackers.verdict();
        verdict.ifPresent(found -> reason = found);
    }
}
```

`Stackers`의 스트림 안 `of(player).score()`처럼 점이 둘인 곳은 `scoreOf(PlayerId)`·`stateOf(PlayerId)`·`isPlaying(PlayerId)`·`isContender(PlayerId)` 작은 메서드로 꺼내 한 줄에 점 하나를 지킨다(동작은 위와 같다). `Stackers`에 `Score scoreOf(PlayerId)`와 `PlayerState stateOf(PlayerId)`를 둔다(아래가 쓴다).

- [ ] **Step 5: 승패·게임 구현**

```java
public record Standing(PlayerId player, Score score, ResultType result, Place place, PlayerState state) {

    boolean isContender() {
        return state != PlayerState.FORFEITED;
    }
}

// R27: 겨루는 사람끼리의 승패·등수와 기권한 사람의 패배.
public class Standings {

    private final List<Standing> inSeatOrder;

    private Standings(List<Standing> inSeatOrder) {
        this.inSeatOrder = inSeatOrder;
    }

    static Standings of(Stackers stackers) {
        List<Score> rivals = stackers.contenders().stream()
                .map(stackers::scoreOf)
                .toList();
        List<Standing> entries = stackers.ids().stream()
                .map(player -> standing(stackers, player, rivals))
                .toList();
        return new Standings(entries);
    }

    private static Standing standing(Stackers stackers, PlayerId player, List<Score> rivals) {
        Score score = stackers.scoreOf(player);
        PlayerState state = stackers.stateOf(player);
        if (state == PlayerState.FORFEITED) {
            return new Standing(player, score, ResultType.LOSE, new Place(rivals.size() + 1), state);
        }
        long above = rivals.stream().filter(rival -> rival.isAbove(score)).count();
        long same = rivals.stream().filter(score::equals).count();
        return new Standing(player, score, resultOf(above, same), new Place((int) above + 1), state);
    }

    // 나보다 높은 사람이 있으면 패, 없고 같은 점수가 나뿐이면 승, 여럿이면 무.
    private static ResultType resultOf(long above, long same) {
        if (above > 0) {
            return ResultType.LOSE;
        }
        if (same > 1) {
            return ResultType.DRAW;
        }
        return ResultType.WIN;
    }

    public List<Standing> inSeatOrder() {
        return inSeatOrder;
    }

    // 등수 순, 같은 등수는 자리 순(안정 정렬).
    public List<Standing> entries() {
        return inSeatOrder.stream()
                .sorted(Comparator.comparingInt(standing -> standing.place().value()))
                .toList();
    }

    public List<Standing> contenders() {
        return entries().stream()
                .filter(Standing::isContender)
                .toList();
    }

    public Optional<PlayerId> winner() {
        return inSeatOrder.stream()
                .filter(standing -> standing.result() == ResultType.WIN)
                .map(Standing::player)
                .findFirst();
    }
}

public record FruitStackResult(FruitStackEndReason reason, Standings standings) {
}

// 한 경기. 물리는 모른다: 보고받은 점수·탈락·기권과 경기 상한만 다룬다.
public class FruitStackGame {

    private final FruitStackMatch match;
    private final Contest contest;

    private FruitStackGame(FruitStackMatch match, Contest contest) {
        this.match = match;
        this.contest = contest;
    }

    public static FruitStackGame start(List<PlayerId> players, Seed seed, Clock clock) {
        return new FruitStackGame(new FruitStackMatch(seed, new MatchClock(clock)), new Contest(new Stackers(players)));
    }

    public void report(PlayerId player, Score score) {
        requireRunning();
        contest.report(player, score, match.ceiling());
    }

    public void out(PlayerId player, Score score) {
        requireRunning();
        contest.out(player, score, match.ceiling());
    }

    public void forfeit(PlayerId player) {
        if (isFinished()) {
            return;
        }
        contest.forfeit(player);
    }

    // R17: 상한이 지났고 아직 안 끝났을 때만 끝낸다.
    public boolean timeUp() {
        MatchClock clock = match.clock();
        if (isFinished() || !clock.isTimeUp()) {
            return false;
        }
        contest.timeUp();
        return true;
    }

    public boolean isFinished() {
        return contest.isOver();
    }

    public boolean isPlaying(PlayerId player) {
        Stackers stackers = contest.stackers();
        return !isFinished() && stackers.contains(player) && stackers.stateOf(player) == PlayerState.PLAYING;
    }

    public Optional<FruitStackResult> result() {
        return contest.reason()
                .map(reason -> new FruitStackResult(reason, Standings.of(contest.stackers())));
    }

    public List<PlayerId> participants() {
        return contest.stackers().ids();
    }

    public Score scoreOf(PlayerId player) {
        return contest.stackers().scoreOf(player);
    }

    public PlayerState stateOf(PlayerId player) {
        return contest.stackers().stateOf(player);
    }

    public Seed seed() {
        return match.seed();
    }

    public Instant startedAt() {
        return match.clock().startedAt();
    }

    public Instant limitAt() {
        return match.clock().limitAt();
    }

    public Instant now() {
        return match.clock().now();
    }

    private void requireRunning() {
        if (isFinished()) {
            throw new BusinessException(ErrorCode.GAME_ALREADY_OVER);
        }
    }
}
```

위 코드에서 점이 둘 이상인 줄(`contest.stackers().ids()` 등)은 지역 변수로 받아 한 줄에 점 하나로 고친다. 동작은 바꾸지 않는다.

- [ ] **Step 6: 통과 확인**

Run: `cd backend && mvn -q test -Dtest='ScoreCeilingTest,FruitStackReportTest,FruitStackDecidedTest,FruitStackForfeitTest,StandingsTest'` 그다음 `cd backend && mvn -q test`
Expected: 새 테스트 모두 통과, 전체 통과.

- [ ] **Step 7: 커밋**

```bash
git add backend/src/main/java/com/boardgame/fruitstack backend/src/test/java/com/boardgame/fruitstack
git commit -m "feat: 과일 쌓기 서버 엔진이 점수 보고를 검증하고 탈락·기권·승부가 정해진 순간·상한에 경기를 끝내 승패를 가린다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(`git add` 전에 `git status --short`로 두 폴더에 이 작업의 파일과 Task 1의 `view/`·`FruitStackContractTest.java`만 있는지 본다. 이미 커밋된 파일은 바뀌지 않았으므로 올라가지 않는다.)

---

### Task 4: 백엔드 — 판 신호 검증·속도 제한 (R24)

**Files:**
- Create: `B/fruitstack/BoardSnapshot.java`, `B/fruitstack/SnapshotGate.java`, `B/fruitstack/SnapshotGates.java`
- Modify: `B/fruitstack/FruitStackGame.java`(필드 하나·메서드 하나 추가)
- Create test: `BT/fruitstack/FruitStackRelayTest.java`

**Interfaces:**
- Consumes: `FruitStackGame`(필드 `FruitStackMatch match`, `Contest contest`, 정적 `start(List<PlayerId>, Seed, Clock)`, `isFinished()`, `stateOf(PlayerId)`, `now()`), `Stackers.contains(PlayerId)`, `PlayerId`, `PlayerState`, 테스트 픽스처 `FruitStackFixtures`(`A`, `B`, `C` = `PlayerId` 1·2·3, `clock()` = `MutableClock`(2026-10-13T00:00:00Z), `game(clock, players...)`, `score(int)`).
- Produces: `FruitStackGame.relay(PlayerId player, String board): OptionalLong` — 받아 주면 그 사람의 신호 순번(1부터), 아니면 빈 값. 예외를 던지지 않는다. Task 5의 세션 `signal`이 쓴다.

**규칙(R24, 글자 그대로):** 게임 중이고, 보낸 사람이 참가자이며 기권하지 않았고(`PLAYING` 또는 `OUT`), `board`가 `null`이 아니고 길이가 5 이상 1200 이하의 5의 배수이며 모든 글자가 `A-Z`, `a-z`, `0-9`, `-`, `_` 가운데 하나이고, 같은 사람의 마지막으로 받아 준 신호에서 200 ms 이상 지났을 때만 받는다. 받을 때마다 그 사람의 순번이 1 오른다. 그 밖은 조용히 버린다(순번·시각 그대로). 서버는 `board`를 풀어 보지 않고 저장하지도 않는다.

- [ ] **Step 1: 실패하는 테스트 작성**

`BT/fruitstack/FruitStackRelayTest.java`:

```java
package com.boardgame.fruitstack;

import static com.boardgame.fruitstack.FruitStackFixtures.A;
import static com.boardgame.fruitstack.FruitStackFixtures.B;
import static com.boardgame.fruitstack.FruitStackFixtures.C;
import static com.boardgame.fruitstack.FruitStackFixtures.clock;
import static com.boardgame.fruitstack.FruitStackFixtures.game;
import static com.boardgame.fruitstack.FruitStackFixtures.score;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.support.MutableClock;
import java.time.Duration;
import org.junit.jupiter.api.Test;

class FruitStackRelayTest {

    private static final String BOARD = "WAAAAGAPqA";

    private final MutableClock clock = clock();

    @Test
    void R24_형식이_맞는_판은_받아_주고_사람마다_순번이_1씩_오른다() {
        FruitStackGame game = game(clock, A, B, C);

        assertThat(game.relay(A, BOARD)).hasValue(1);
        assertThat(game.relay(B, BOARD)).hasValue(1);
        clock.advance(Duration.ofMillis(200));
        assertThat(game.relay(A, BOARD)).hasValue(2);
    }

    @Test
    void R24_마지막으로_받아_준_신호에서_200ms가_안_지났으면_버리고_순번도_그대로다() {
        FruitStackGame game = game(clock, A, B, C);
        game.relay(A, BOARD);

        clock.advance(Duration.ofMillis(199));
        assertThat(game.relay(A, BOARD)).isEmpty();
        clock.advance(Duration.ofMillis(1));

        assertThat(game.relay(A, BOARD)).hasValue(2);
    }

    @Test
    void R24_형식이_어긋난_판은_버린다() {
        FruitStackGame game = game(clock, A, B, C);

        assertThat(game.relay(A, null)).isEmpty();
        assertThat(game.relay(A, "")).isEmpty();
        assertThat(game.relay(A, "WAAA")).isEmpty();
        assertThat(game.relay(A, "WAAAAG")).isEmpty();
        assertThat(game.relay(A, "WAAA+")).isEmpty();
        assertThat(game.relay(A, "WAAA ")).isEmpty();
        assertThat(game.relay(A, "A".repeat(1205))).isEmpty();
        assertThat(game.relay(A, "A".repeat(1200))).hasValue(1);
    }

    @Test
    void R24_버려진_신호는_간격_시계를_건드리지_않는다() {
        FruitStackGame game = game(clock, A, B, C);

        assertThat(game.relay(A, "WAAA")).isEmpty();
        assertThat(game.relay(A, BOARD)).hasValue(1);
    }

    @Test
    void R24_탈락한_사람의_판은_받고_기권한_사람과_참가자가_아닌_사람의_판은_버린다() {
        FruitStackGame game = game(clock, A, B, C);
        game.out(A, score(10));
        game.forfeit(B);

        assertThat(game.relay(A, BOARD)).hasValue(1);
        assertThat(game.relay(B, BOARD)).isEmpty();
        assertThat(game.relay(new PlayerId(99), BOARD)).isEmpty();
    }

    @Test
    void R24_끝난_게임의_판은_버리고_신호는_점수와_상태를_바꾸지_않는다() {
        FruitStackGame game = game(clock, A, B);
        game.report(A, score(10));
        game.relay(A, BOARD);
        assertThat(game.scoreOf(A)).isEqualTo(score(10));
        assertThat(game.stateOf(A)).isEqualTo(PlayerState.PLAYING);
        assertThat(game.limitAt()).isEqualTo(FruitStackFixtures.T0.plusSeconds(600));

        game.forfeit(B);

        assertThat(game.isFinished()).isTrue();
        clock.advance(Duration.ofSeconds(1));
        assertThat(game.relay(A, BOARD)).isEmpty();
    }
}
```

- [ ] **Step 2: 실패 확인**

Run: `cd backend && mvn -q test -Dtest=FruitStackRelayTest`
Expected: 컴파일 실패(`relay` 없음).

- [ ] **Step 3: 구현**

```java
package com.boardgame.fruitstack;

import java.util.regex.Pattern;

// R23·R24: 판 신호의 겉모양만 본다(풀어 보지 않는다). 30비트 낱말 = 5글자, 머리 1 + 과일 최대 239개.
public record BoardSnapshot(String text) {

    private static final int WORD = 5;
    private static final int MAX_LENGTH = 1200;
    private static final Pattern ALPHABET = Pattern.compile("[A-Za-z0-9_-]+");

    public boolean isValid() {
        if (text == null || text.length() < WORD || text.length() > MAX_LENGTH || text.length() % WORD != 0) {
            return false;
        }
        return ALPHABET.matcher(text).matches();
    }
}
```

```java
package com.boardgame.fruitstack;

import java.time.Duration;
import java.time.Instant;
import java.util.OptionalLong;

// R24: 한 사람의 판 신호 문. 마지막으로 받아 준 시각에서 200ms가 지나야 다음을 받는다. 순번은 받을 때만 오른다.
public class SnapshotGate {

    static final Duration MIN_GAP = Duration.ofMillis(200);

    private Instant lastAt = Instant.EPOCH;
    private long seq;

    OptionalLong tryPass(Instant now) {
        if (now.isBefore(lastAt.plus(MIN_GAP))) {
            return OptionalLong.empty();
        }
        lastAt = now;
        seq++;
        return OptionalLong.of(seq);
    }
}
```

```java
package com.boardgame.fruitstack;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.OptionalLong;

public class SnapshotGates {

    private final Map<PlayerId, SnapshotGate> gates = new HashMap<>();

    OptionalLong tryPass(PlayerId player, Instant now) {
        SnapshotGate gate = gates.computeIfAbsent(player, ignored -> new SnapshotGate());
        return gate.tryPass(now);
    }
}
```

`B/fruitstack/FruitStackGame.java`: 필드 `private final SnapshotGates gates = new SnapshotGates();`를 더하고(필드 3개), 메서드를 더한다:

```java
    // R24: 받아 주면 그 사람의 신호 순번, 아니면 빈 값. 점수·상태·끝은 바뀌지 않는다.
    public OptionalLong relay(PlayerId player, String board) {
        if (!mayRelay(player) || !new BoardSnapshot(board).isValid()) {
            return OptionalLong.empty();
        }
        return gates.tryPass(player, now());
    }

    // 게임 중이고 기권하지 않은 참가자(살아 있거나 탈락)만 판을 보낸다.
    private boolean mayRelay(PlayerId player) {
        Stackers stackers = contest.stackers();
        return !isFinished() && stackers.contains(player) && stackers.stateOf(player) != PlayerState.FORFEITED;
    }
```

- [ ] **Step 4: 통과 확인**

Run: `cd backend && mvn -q test`
Expected: 전체 통과.

- [ ] **Step 5: 커밋**

```bash
git add backend/src/main/java/com/boardgame/fruitstack/BoardSnapshot.java backend/src/main/java/com/boardgame/fruitstack/SnapshotGate.java backend/src/main/java/com/boardgame/fruitstack/SnapshotGates.java backend/src/main/java/com/boardgame/fruitstack/FruitStackGame.java backend/src/test/java/com/boardgame/fruitstack/FruitStackRelayTest.java
git commit -m "feat: 과일 쌓기 판 신호는 형식이 맞고 200ms 간격을 지킨 것만 받아 순번을 붙인다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 백엔드 — 세션·화면 조립·씨앗·스프링 등록 (R4 씨앗, R17, R30, R31, 스펙 4.5·4.6)

**Files:**
- Create(모두 `B/fruitstack/`): `SeedSource.java`, `RandomSeedSource.java`, `FruitStackConfig.java`, `FruitStackCommand.java`, `FruitStackSignal.java`, `FruitStackViewAssembler.java`, `FruitStackSession.java`, `FruitStackSessionFactory.java`
- Create test(모두 `BT/fruitstack/`): `FruitStackSessionTest.java`, `FruitStackSessionTimerTest.java`, `FruitStackViewTest.java`, `FruitStackSessionFactoryTest.java`

**Interfaces:**
- Consumes:
  - Task 1: `GameAction`(`type()`, `score(): Integer`, `board(): String`; 테스트에서는 `new GameAction("SCORE", null, null, null, null, null, null, null, 30, null)`처럼 10칸 정식 생성자), `GameType.FRUIT_STACK`, 화면 record — `FruitStackSessionView(FruitStackView game)`, `FruitStackView(long viewerId, String status, long startedAt, int seed, List<Long> participantIds, List<FruitStackPlayerView> players, FruitStackResultView result, Long winnerId, Long deadline, long serverNow)`, `FruitStackPlayerView(long playerId, int score, String state)`, `FruitStackResultView(String reason, List<FruitStackStandingView> standings)`, `FruitStackStandingView(long playerId, int score, String outcome, int rank, String state)`, `FruitStackBoardSignal.of(long startedAt, long playerId, long seq, String board)`.
  - Task 3·4: `FruitStackGame.start(List<PlayerId>, Seed, Clock)`, `report(PlayerId, Score)`, `out(PlayerId, Score)`, `forfeit(PlayerId)`, `timeUp(): boolean`, `relay(PlayerId, String): OptionalLong`, `isFinished()`, `isPlaying(PlayerId)`, `result(): Optional<FruitStackResult>`, `participants(): List<PlayerId>`, `scoreOf`, `stateOf`, `seed()`, `startedAt()`, `limitAt()`, `now()`; `FruitStackResult(FruitStackEndReason reason, Standings standings)`; `Standings.entries()`/`contenders()`/`inSeatOrder()`/`winner()`; `Standing(PlayerId player, Score score, ResultType result, Place place, PlayerState state)`; `FruitStackEndReason.recordsRound()`; `Score(int)`(음수면 `INVALID_INPUT`), `Seed(int)`, `PlayerId(long)`.
  - 기존: `com.boardgame.game.GameSession`(메서드 `act`, `signal`, `forfeit`, `autoAct(Random)`, `deadline()`, `viewFor`, `isFinished`, `isPlaying`, `roundNumber`, 기본 `pendingActors()`), `GameSessionFactory`(`type()`, `create(List<Long> memberIds)`), `RoundCompleted(int roundNumber, List<RoundEntry> entries)`, `RoundEntry(long memberId, ResultType result, int score)`, `GameCompleted(List<MatchEntry> entries)`, `MatchEntry(long memberId, ResultType result, int tokens, int seat)`.
- Produces: `interface SeedSource { Seed next(); }`, 스프링 빈 `SeedSource`(이름 `fruitStackSeedSource`), `@Component FruitStackSessionFactory(Clock, SeedSource)`(`type() = GameType.FRUIT_STACK`), `FruitStackSession(List<Long> memberIds, Seed seed, Clock clock)`. 이 작업 뒤 `FRUIT_STACK` 방을 시작할 수 있다. Task 6이 쓴다.

**계약(글자 그대로):**
- `act`: `SCORE`는 `game.report`, `OUT`은 `game.out`. 모르는 type, `score` 없음, 음수는 `INVALID_INPUT`(게임 상태를 보기 전에 형식부터 본다). 그다음 게임이 끝났으면 `GAME_ALREADY_OVER`, 참가자가 아니면 `NOT_A_PLAYER`, 그 밖의 거절은 `FRUIT_STACK_SCORE_REJECTED`.
- `signal`: `BOARD`만. 받아 주면 `FruitStackBoardSignal`, 아니면 빈 값. 모르는 type만 `INVALID_INPUT`.
- `forfeit`: 그 사람이 살아 있을 때만 기권시킨다. 아니면 빈 결과.
- `autoAct(random)`: 상한이 지났으면 `TIME_UP`으로 끝내고 결과, 아니면 빈 결과(상태 그대로).
- `deadline()`: 게임 중이면 시작 + 10분, 끝나면 빈 값. `roundNumber()` = 1. `pendingActors()`는 기본 구현(빈 목록) 그대로.
- 결과(R30, 끝나는 순간 딱 한 번): 이유가 `ALL_OUT`·`DECIDED`·`TIME_UP`이면 `[RoundCompleted(1, 겨루는 사람 등수 순 RoundEntry(id, 결과, 점수)), GameCompleted(자리 순 MatchEntry(id, 결과, 0, 자리))]`, `FORFEIT`이면 `[GameCompleted(...)]`만.
- 화면: 계약 절 그대로. `status`는 `"IN_PROGRESS"`/`"GAME_OVER"`, `state`·`outcome`·`reason`은 enum 이름, `rank`는 `Place.value()`, `winnerId`는 `Standings.winner()`(없으면 `null`), `deadline`은 끝나면 `null`, `serverNow`는 `game.now()`의 epoch ms.

- [ ] **Step 1: 실패하는 테스트 작성**

`BT/fruitstack/FruitStackSessionTest.java`:

```java
package com.boardgame.fruitstack;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import com.boardgame.fruitstack.view.FruitStackBoardSignal;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.MatchEntry;
import com.boardgame.game.ResultType;
import com.boardgame.game.RoundCompleted;
import com.boardgame.game.RoundEntry;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

class FruitStackSessionTest {

    private static final Instant T0 = Instant.parse("2026-10-13T00:00:00Z");
    private static final long A = 11;
    private static final long B = 22;
    private static final long C = 33;

    private final MutableClock clock = new MutableClock(T0);

    private FruitStackSession session(Long... ids) {
        return new FruitStackSession(List.of(ids), new Seed(12345), clock);
    }

    private static GameAction score(int value) {
        return new GameAction("SCORE", null, null, null, null, null, null, null, value, null);
    }

    private static GameAction out(int value) {
        return new GameAction("OUT", null, null, null, null, null, null, null, value, null);
    }

    private static GameAction board(String text) {
        return new GameAction("BOARD", null, null, null, null, null, null, null, null, text);
    }

    @Test
    void 게임_중의_행동은_빈_결과를_낸다() {
        FruitStackSession session = session(A, B);

        assertThat(session.act(A, score(10))).isEmpty();
        assertThat(session.isFinished()).isFalse();
        assertThat(session.isPlaying(A)).isTrue();
        assertThat(session.roundNumber()).isEqualTo(1);
        assertThat(session.pendingActors()).isEmpty();
    }

    @Test
    void 형식이_어긋난_행동은_INVALID_INPUT이다() {
        FruitStackSession session = session(A, B);

        assertError(() -> session.act(A, new GameAction("DRAW", null, null)), ErrorCode.INVALID_INPUT);
        assertError(() -> session.act(A, new GameAction("SCORE", null, null)), ErrorCode.INVALID_INPUT);
        assertError(() -> session.act(A, score(-1)), ErrorCode.INVALID_INPUT);
        assertError(() -> session.act(99, score(1)), ErrorCode.NOT_A_PLAYER);
        assertError(() -> session.act(A, score(111)), ErrorCode.FRUIT_STACK_SCORE_REJECTED);
    }

    @Test
    void R30_모두_탈락해_끝나면_라운드와_경기_결과를_딱_한_번_낸다() {
        FruitStackSession session = session(A, B, C);
        session.act(A, out(30));
        session.act(B, out(30));

        List<GameOutcome> outcomes = session.act(C, out(10));

        assertThat(outcomes).containsExactly(
                new RoundCompleted(1, List.of(new RoundEntry(A, ResultType.DRAW, 30),
                        new RoundEntry(B, ResultType.DRAW, 30), new RoundEntry(C, ResultType.LOSE, 10))),
                new GameCompleted(List.of(new MatchEntry(A, ResultType.DRAW, 0, 0),
                        new MatchEntry(B, ResultType.DRAW, 0, 1), new MatchEntry(C, ResultType.LOSE, 0, 2))));
        assertThat(session.isFinished()).isTrue();
        assertThat(session.isPlaying(C)).isFalse();
        assertThat(session.forfeit(A)).isEmpty();
        assertThat(session.autoAct(new Random())).isEmpty();
        assertError(() -> session.act(A, score(40)), ErrorCode.GAME_ALREADY_OVER);
    }

    @Test
    void R26_R30_승부가_정해져_끝나면_라운드에는_겨루는_사람만_등수_순으로_들어간다() {
        FruitStackSession session = session(A, B, C);
        session.act(C, score(50));
        session.forfeit(A);
        assertThat(session.isFinished()).isFalse();

        List<GameOutcome> outcomes = session.act(B, out(20));

        assertThat(outcomes).containsExactly(
                new RoundCompleted(1, List.of(new RoundEntry(C, ResultType.WIN, 50), new RoundEntry(B, ResultType.LOSE, 20))),
                new GameCompleted(List.of(new MatchEntry(A, ResultType.LOSE, 0, 0),
                        new MatchEntry(B, ResultType.LOSE, 0, 1), new MatchEntry(C, ResultType.WIN, 0, 2))));
    }

    @Test
    void R30_상대가_모두_나가_끝나면_경기_결과만_낸다() {
        FruitStackSession session = session(A, B);
        session.act(A, score(40));

        List<GameOutcome> outcomes = session.forfeit(A);

        assertThat(outcomes).containsExactly(new GameCompleted(
                List.of(new MatchEntry(A, ResultType.LOSE, 0, 0), new MatchEntry(B, ResultType.WIN, 0, 1))));
    }

    @Test
    void R29_탈락한_사람의_기권은_빈_결과이고_게임은_이어진다() {
        FruitStackSession session = session(A, B, C);
        session.act(A, out(10));

        assertThat(session.isPlaying(A)).isFalse();
        assertThat(session.forfeit(A)).isEmpty();
        assertThat(session.isFinished()).isFalse();
    }

    @Test
    void R24_판_신호는_받아_주면_중계할_내용을_주고_아니면_빈_값이다() {
        FruitStackSession session = session(A, B);

        Object relayed = session.signal(A, board("WAAAAGAPqA")).orElseThrow();

        assertThat(relayed).isEqualTo(FruitStackBoardSignal.of(T0.toEpochMilli(), A, 1, "WAAAAGAPqA"));
        assertThat(session.signal(A, board("WAAAAGAPqA"))).isEmpty();
        assertThat(session.signal(A, board("bad"))).isEmpty();
        clock.advance(Duration.ofMillis(200));
        assertThat(session.signal(A, board("WAAAA"))).contains(FruitStackBoardSignal.of(T0.toEpochMilli(), A, 2, "WAAAA"));
        assertError(() -> session.signal(A, new GameAction("PEEK", null, null)), ErrorCode.INVALID_INPUT);
    }
}
```

`BT/fruitstack/FruitStackSessionTimerTest.java`:

```java
package com.boardgame.fruitstack;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameAction;
import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameOutcome;
import com.boardgame.game.RoundCompleted;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

class FruitStackSessionTimerTest {

    private static final Instant T0 = Instant.parse("2026-10-13T00:00:00Z");

    private final MutableClock clock = new MutableClock(T0);
    private final FruitStackSession session = new FruitStackSession(List.of(11L, 22L, 33L), new Seed(1), clock);

    private static GameAction action(String type, Integer score, String board) {
        return new GameAction(type, null, null, null, null, null, null, null, score, board);
    }

    @Test
    void R17_마감은_시작_10분_뒤이고_보고_탈락_신호로_바뀌지_않는다() {
        assertThat(session.deadline()).contains(T0.plusSeconds(600));

        clock.advance(Duration.ofSeconds(30));
        session.act(11, action("SCORE", 20, null));
        session.act(22, action("OUT", 5, null));
        session.signal(11, action("BOARD", null, "WAAAA"));

        assertThat(session.deadline()).contains(T0.plusSeconds(600));
    }

    @Test
    void R17_마감_전의_autoAct는_빈_결과이고_상태도_그대로다() {
        clock.advance(Duration.ofSeconds(599));

        assertThat(session.autoAct(new Random())).isEmpty();
        assertThat(session.isFinished()).isFalse();
        assertThat(session.deadline()).contains(T0.plusSeconds(600));
    }

    @Test
    void R17_마감이_지나면_지금_점수로_끝내고_마감은_비어_있다() {
        session.act(11, action("SCORE", 20, null));
        clock.advance(Duration.ofSeconds(600));

        List<GameOutcome> outcomes = session.autoAct(new Random());

        assertThat(outcomes).hasSize(2);
        assertThat(outcomes.get(0)).isInstanceOf(RoundCompleted.class);
        assertThat(outcomes.get(1)).isInstanceOf(GameCompleted.class);
        assertThat(session.isFinished()).isTrue();
        assertThat(session.deadline()).isEmpty();
        assertThat(session.autoAct(new Random())).isEmpty();
    }
}
```

`BT/fruitstack/FruitStackViewTest.java`:

```java
package com.boardgame.fruitstack;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameAction;
import com.boardgame.support.MutableClock;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Random;
import org.junit.jupiter.api.Test;

class FruitStackViewTest {

    private static final Instant T0 = Instant.parse("2026-10-13T00:00:00Z");

    private final ObjectMapper mapper = new ObjectMapper();
    private final MutableClock clock = new MutableClock(T0);
    private final FruitStackSession session = new FruitStackSession(List.of(11L, 22L, 33L), new Seed(12345), clock);

    private static GameAction action(String type, int score) {
        return new GameAction(type, null, null, null, null, null, null, null, score, null);
    }

    private JsonNode gameOf(long viewer) {
        return mapper.valueToTree(session.viewFor(viewer)).get("game");
    }

    @Test
    void 진행_중_화면에_씨앗_점수_상태_마감이_실린다() {
        clock.advance(Duration.ofSeconds(5));
        session.act(11, action("SCORE", 20));
        session.act(22, action("OUT", 7));

        JsonNode root = mapper.valueToTree(session.viewFor(11));
        JsonNode game = root.get("game");

        assertThat(root.get("gameType").asText()).isEqualTo("FRUIT_STACK");
        assertThat(game.get("viewerId").asLong()).isEqualTo(11);
        assertThat(game.get("status").asText()).isEqualTo("IN_PROGRESS");
        assertThat(game.get("startedAt").asLong()).isEqualTo(T0.toEpochMilli());
        assertThat(game.get("seed").asInt()).isEqualTo(12345);
        assertThat(game.get("participantIds")).hasSize(3);
        assertThat(game.get("players").get(0).toString()).isEqualTo("{\"playerId\":11,\"score\":20,\"state\":\"PLAYING\"}");
        assertThat(game.get("players").get(1).toString()).isEqualTo("{\"playerId\":22,\"score\":7,\"state\":\"OUT\"}");
        assertThat(game.get("result").isNull()).isTrue();
        assertThat(game.get("winnerId").isNull()).isTrue();
        assertThat(game.get("deadline").asLong()).isEqualTo(T0.plusSeconds(600).toEpochMilli());
        assertThat(game.get("serverNow").asLong()).isEqualTo(T0.plusSeconds(5).toEpochMilli());
    }

    @Test
    void 참가자와_관전자의_화면은_보는_사람_말고_같다() {
        session.act(11, action("SCORE", 20));

        ObjectNode mine = (ObjectNode) gameOf(11);
        ObjectNode spectator = (ObjectNode) gameOf(999);

        assertThat(spectator.get("viewerId").asLong()).isEqualTo(999);
        mine.remove("viewerId");
        spectator.remove("viewerId");
        assertThat(spectator).isEqualTo(mine);
    }

    @Test
    void 끝난_화면에_이유와_등수_순_결과와_승자가_실리고_마감은_null이다() {
        session.act(33, action("SCORE", 50));
        session.act(11, action("OUT", 30));
        session.act(22, action("OUT", 40));

        JsonNode game = gameOf(22);

        assertThat(game.get("status").asText()).isEqualTo("GAME_OVER");
        assertThat(game.get("result").get("reason").asText()).isEqualTo("DECIDED");
        assertThat(game.get("result").get("standings").toString()).isEqualTo("["
                + "{\"playerId\":33,\"score\":50,\"outcome\":\"WIN\",\"rank\":1,\"state\":\"PLAYING\"},"
                + "{\"playerId\":22,\"score\":40,\"outcome\":\"LOSE\",\"rank\":2,\"state\":\"OUT\"},"
                + "{\"playerId\":11,\"score\":30,\"outcome\":\"LOSE\",\"rank\":3,\"state\":\"OUT\"}]");
        assertThat(game.get("winnerId").asLong()).isEqualTo(33);
        assertThat(game.get("deadline").isNull()).isTrue();
    }

    @Test
    void 무승부로_끝나면_승자는_null이다() {
        clock.advance(Duration.ofMinutes(10));
        session.autoAct(new Random());

        JsonNode game = gameOf(11);

        assertThat(game.get("result").get("reason").asText()).isEqualTo("TIME_UP");
        assertThat(game.get("winnerId").isNull()).isTrue();
        assertThat(game.get("result").get("standings").get(2).get("outcome").asText()).isEqualTo("DRAW");
    }
}
```

`BT/fruitstack/FruitStackSessionFactoryTest.java`:

```java
package com.boardgame.fruitstack;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.fruitstack.view.FruitStackSessionView;
import com.boardgame.game.GameSession;
import com.boardgame.game.GameType;
import com.boardgame.support.MutableClock;
import java.time.Instant;
import java.util.Iterator;
import java.util.List;
import org.junit.jupiter.api.Test;

class FruitStackSessionFactoryTest {

    private final MutableClock clock = new MutableClock(Instant.parse("2026-10-13T00:00:00Z"));

    private static int seedOf(GameSession session) {
        return ((FruitStackSessionView) session.viewFor(1)).game().seed();
    }

    @Test
    void R31_게임마다_씨앗을_새로_받는다() {
        Iterator<Seed> seeds = List.of(new Seed(7), new Seed(8)).iterator();
        FruitStackSessionFactory factory = new FruitStackSessionFactory(clock, seeds::next);

        assertThat(factory.type()).isEqualTo(GameType.FRUIT_STACK);
        assertThat(seedOf(factory.create(List.of(1L, 2L)))).isEqualTo(7);
        assertThat(seedOf(factory.create(List.of(1L, 2L)))).isEqualTo(8);
    }

    @Test
    void R4_기본_씨앗은_0_이상의_int다() {
        SeedSource source = new FruitStackConfig().fruitStackSeedSource();

        assertThat(source.next().value()).isGreaterThanOrEqualTo(0);
    }
}
```

- [ ] **Step 2: 실패 확인**

Run: `cd backend && mvn -q test -Dtest='FruitStackSessionTest,FruitStackSessionTimerTest,FruitStackViewTest,FruitStackSessionFactoryTest'`
Expected: 컴파일 실패(`FruitStackSession` 등 없음).

- [ ] **Step 3: 구현**

파일마다 `package com.boardgame.fruitstack;`.

```java
// R4: 경기마다 씨앗 하나. 테스트는 고정 값을 준다.
@FunctionalInterface
public interface SeedSource {

    Seed next();
}

public class RandomSeedSource implements SeedSource {

    @Override
    public Seed next() {
        ThreadLocalRandom random = ThreadLocalRandom.current();
        return new Seed(random.nextInt(Integer.MAX_VALUE));
    }
}

@Configuration
public class FruitStackConfig {

    @Bean
    public SeedSource fruitStackSeedSource() {
        return new RandomSeedSource();
    }
}

// 행동 type → 게임 메서드. 모르는 type, score 없음은 INVALID_INPUT(음수는 Score가 INVALID_INPUT).
public enum FruitStackCommand {
    SCORE {
        @Override
        void apply(FruitStackGame game, PlayerId player, Score score) {
            game.report(player, score);
        }
    },
    OUT {
        @Override
        void apply(FruitStackGame game, PlayerId player, Score score) {
            game.out(player, score);
        }
    };

    abstract void apply(FruitStackGame game, PlayerId player, Score score);

    public void apply(FruitStackGame game, PlayerId player, GameAction action) {
        apply(game, player, scoreOf(action));
    }

    public static FruitStackCommand of(String type) {
        return Arrays.stream(values())
                .filter(command -> command.name().equals(type))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_INPUT));
    }

    private static Score scoreOf(GameAction action) {
        if (action.score() == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        return new Score(action.score());
    }
}

// 신호 type → 게임 메서드. 모르는 type만 INVALID_INPUT, 나머지 거절은 조용히 빈 값(R24).
public enum FruitStackSignal {
    BOARD {
        @Override
        OptionalLong apply(FruitStackGame game, PlayerId player, GameAction action) {
            return game.relay(player, action.board());
        }
    };

    abstract OptionalLong apply(FruitStackGame game, PlayerId player, GameAction action);

    public static FruitStackSignal of(String type) {
        return Arrays.stream(values())
                .filter(signal -> signal.name().equals(type))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_INPUT));
    }
}

// 스펙 4.6: 보는 사람 id 말고 모두에게 같은 화면.
public final class FruitStackViewAssembler {

    private static final String IN_PROGRESS = "IN_PROGRESS";
    private static final String GAME_OVER = "GAME_OVER";

    private FruitStackViewAssembler() {
    }

    public static FruitStackView view(FruitStackGame game, long viewerId) {
        Optional<FruitStackResult> result = game.result();
        return new FruitStackView(viewerId, statusOf(game), millisOf(game.startedAt()), seedOf(game),
                participantIds(game), players(game), result.map(FruitStackViewAssembler::resultView).orElse(null),
                result.flatMap(FruitStackViewAssembler::winnerId).orElse(null), deadlineOf(game),
                millisOf(game.now()));
    }

    public static FruitStackBoardSignal signal(FruitStackGame game, long playerId, long seq, String board) {
        return FruitStackBoardSignal.of(millisOf(game.startedAt()), playerId, seq, board);
    }
    // statusOf, millisOf, seedOf, participantIds, players, resultView(standings = result.standings().entries() 순서),
    // winnerId(Standings.winner()의 값), deadlineOf(끝났으면 null, 아니면 limitAt의 epoch ms)는 한 가지 일만 하는 private static 메서드로 나눈다.
}

public class FruitStackSession implements GameSession {

    private static final int ROUND_NUMBER = 1;
    private static final int NO_TOKENS = 0;

    private final FruitStackGame game;

    public FruitStackSession(List<Long> memberIds, Seed seed, Clock clock) {
        List<PlayerId> players = memberIds.stream()
                .map(PlayerId::new)
                .toList();
        this.game = FruitStackGame.start(players, seed, clock);
    }

    @Override
    public List<GameOutcome> act(long memberId, GameAction action) {
        FruitStackCommand command = FruitStackCommand.of(action.type());
        command.apply(game, new PlayerId(memberId), action);
        return outcomesIfFinished();
    }

    // R24: 받아 주면 방의 모두에게 보낼 신호, 아니면 빈 값. 점수·상태·마감·기록은 바뀌지 않는다.
    @Override
    public Optional<Object> signal(long memberId, GameAction action) {
        FruitStackSignal signal = FruitStackSignal.of(action.type());
        OptionalLong seq = signal.apply(game, new PlayerId(memberId), action);
        if (seq.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(FruitStackViewAssembler.signal(game, memberId, seq.getAsLong(), action.board()));
    }

    // R29: 탈락한 사람(이미 게임 중이 아님)이 나가는 것은 기권이 아니다.
    @Override
    public List<GameOutcome> forfeit(long memberId) {
        PlayerId player = new PlayerId(memberId);
        if (!game.isPlaying(player)) {
            return List.of();
        }
        game.forfeit(player);
        return outcomesIfFinished();
    }

    // R17: 방의 타이머가 경기 상한에 부른다. 이른 호출이면 아무것도 하지 않는다.
    @Override
    public List<GameOutcome> autoAct(Random random) {
        if (!game.timeUp()) {
            return List.of();
        }
        return outcomesIfFinished();
    }

    @Override
    public Optional<Instant> deadline() {
        if (isFinished()) {
            return Optional.empty();
        }
        return Optional.of(game.limitAt());
    }

    @Override
    public Object viewFor(long memberId) {
        return new FruitStackSessionView(FruitStackViewAssembler.view(game, memberId));
    }

    @Override
    public boolean isFinished() {
        return game.isFinished();
    }

    @Override
    public boolean isPlaying(long memberId) {
        return game.isPlaying(new PlayerId(memberId));
    }

    @Override
    public int roundNumber() {
        return ROUND_NUMBER;
    }

    // 끝난 게임은 행동을 받지 않으므로, 행동 직후 끝나 있으면 이번 행동으로 끝난 것이다(결과는 딱 한 번).
    private List<GameOutcome> outcomesIfFinished() {
        return game.result()
                .map(this::outcomes)
                .orElse(List.of());
    }

    // R30: FORFEIT 끝은 경기만, 나머지는 라운드(겨루는 사람, 등수 순) + 경기(모두, 자리 순).
    private List<GameOutcome> outcomes(FruitStackResult result) {
        GameCompleted match = gameCompleted(result.standings());
        if (!result.reason().recordsRound()) {
            return List.of(match);
        }
        return List.of(roundCompleted(result.standings()), match);
    }
    // roundCompleted: standings.contenders()를 RoundEntry(player.value(), result, score.value())로.
    // gameCompleted: standings.inSeatOrder()를 순서대로 MatchEntry(player.value(), result, NO_TOKENS, 자리 번호 0..n-1)로(IntStream.range).
}

@Component
public class FruitStackSessionFactory implements GameSessionFactory {

    private final Clock clock;
    private final SeedSource seeds;

    public FruitStackSessionFactory(Clock clock, SeedSource seeds) {
        this.clock = clock;
        this.seeds = seeds;
    }

    @Override
    public GameType type() {
        return GameType.FRUIT_STACK;
    }

    // R31: 게임마다 새 씨앗.
    @Override
    public GameSession create(List<Long> memberIds) {
        return new FruitStackSession(memberIds, seeds.next(), clock);
    }
}
```

주석으로만 적은 작은 메서드(`FruitStackViewAssembler`의 private static 들, `FruitStackSession.roundCompleted`·`gameCompleted`)는 주석 그대로 구현한다. 한 줄에 점 하나·들여쓰기 1단계를 지킨다. 세션은 화면을 `ClockFreeView`로 만들지 않는다(컴퓨터가 없어 쓰는 곳이 없다).

- [ ] **Step 4: 통과 확인**

Run: `cd backend && mvn -q test`
Expected: 전체 통과. 스프링 컨텍스트 테스트가 뜰 때 `SeedSource` 빈이 하나, `GameSessionFactories`에 `FRUIT_STACK` 팩토리가 등록된다.

- [ ] **Step 5: 커밋**

```bash
git add backend/src/main/java/com/boardgame/fruitstack/SeedSource.java backend/src/main/java/com/boardgame/fruitstack/RandomSeedSource.java backend/src/main/java/com/boardgame/fruitstack/FruitStackConfig.java backend/src/main/java/com/boardgame/fruitstack/FruitStackCommand.java backend/src/main/java/com/boardgame/fruitstack/FruitStackSignal.java backend/src/main/java/com/boardgame/fruitstack/FruitStackViewAssembler.java backend/src/main/java/com/boardgame/fruitstack/FruitStackSession.java backend/src/main/java/com/boardgame/fruitstack/FruitStackSessionFactory.java backend/src/test/java/com/boardgame/fruitstack/FruitStackSessionTest.java backend/src/test/java/com/boardgame/fruitstack/FruitStackSessionTimerTest.java backend/src/test/java/com/boardgame/fruitstack/FruitStackViewTest.java backend/src/test/java/com/boardgame/fruitstack/FruitStackSessionFactoryTest.java
git commit -m "feat: 과일 쌓기 세션을 등록해 방에서 시작할 수 있고, 화면에 씨앗·점수·상태·10분 마감을 싣고 끝나면 전적 결과를 낸다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 백엔드 통합 — 방 타이머 10분, 나가기·끊김, STOMP 흐름, 전적 (스펙 7.2, R17, R28~R30)

**Files:**
- Create test: `BT/room/application/FruitStackRoomTimeoutTest.java`, `BT/room/application/FruitStackRoomLeaveTest.java`, `BT/room/api/FruitStackRoomApiTest.java`, `BT/room/api/FruitStackStompFlowTest.java`, `BT/record/api/FruitStackRecordApiTest.java`
- 제품 코드는 고치지 않는다. 테스트가 제품 코드의 잘못을 드러내면 멈추고 알린다(혼자 고치지 않는다).

**Interfaces:**
- Consumes: Task 5의 `FruitStackSessionFactory(Clock clock, SeedSource seeds)`(`SeedSource`는 `() -> new Seed(12345)`처럼 람다로), `FruitStackSessionView.game()` → `FruitStackView`(`status()`, `players()`, `result()`, `deadline()`, `seed()`), Task 2의 `BOTS_NOT_SUPPORTED`. 기존 `RoomService`(12칸 생성자 `new RoomService(registry, () -> ROOM_CODE, new GameSessionFactories(List.of(factory)), notifier, new OutcomePublisher(events), events, clock, presence, new FakeRoomPasswordHasher(), new TurnTimer(scheduler), new FixedRandom(1), new RoomAvatars(Avatar::defaultFor))`, 메서드 `create(LoginMember, CreateRoomRequest)`, `join(code, LoginMember, null)`, `setReady(code, id, true)`, `start(code, id)`, `act(code, id, GameAction)`, `leave(code, id)`, `forfeitLongDisconnected()`), `PresenceTracker`(`connected(memberId, sessionId)`), `FakeTaskScheduler`(`latest().startTime()`, `latest().run()`), `MutableClock`, `ApiUsers.create(mockMvc)`.
- 행동 만들기(이 작업의 모든 테스트에서): `new GameAction("SCORE", null, null, null, null, null, null, null, 30, null)`, `new GameAction("OUT", null, null, null, null, null, null, null, 30, null)`.

- [ ] **Step 1: 방 타이머·나가기 테스트 작성**

`BT/room/application/FruitStackRoomTimeoutTest.java` — 같은 폴더의 `OldMaidRoomTimeoutTest.java`와 같은 짜임(필드: `MutableClock clock = new MutableClock(T0)`, `RoomRegistry registry`, `RoomNotifier notifier = mock(...)`, `ApplicationEventPublisher events = mock(...)`, `FakeTaskScheduler scheduler`, `PresenceTracker presence = new PresenceTracker()`, `FruitStackSessionFactory factory = new FruitStackSessionFactory(clock, () -> new Seed(12345))`, 위 12칸 생성자의 `RoomService service`. 상수 `CODE = "FRUITS"`, `HOST = 1L`, `GUEST = 2L`, `T0 = Instant.parse("2026-10-13T00:00:00Z")`. `@BeforeEach`: `service.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("과일 방", GameType.FRUIT_STACK, 5, null))` → `join` → `setReady` → `start`. 도우미 `FruitStackView viewOf(long memberId)` = `((FruitStackSessionView) registry.get(ROOM_CODE).viewFor(memberId).orElseThrow()).game()`). 테스트:

| 테스트 이름 | 하는 일 | 단언 |
|---|---|---|
| `R17_시작하면_10분_뒤로_마감을_예약한다` | 없음 | `scheduler.latest().startTime()` = `T0.plusSeconds(600)`, `viewOf(HOST).deadline()` = `T0.plusSeconds(600).toEpochMilli()`, `viewOf(HOST).seed()` = 12345 |
| `R17_점수_보고_뒤에도_같은_시각으로_다시_예약한다` | `clock.advance(30초)`, `service.act(CODE, HOST, SCORE 20)` | `scheduler.latest().startTime()` = `T0.plusSeconds(600)`, `viewOf(GUEST).players().get(0).score()` = 20 |
| `R17_10분이_지나면_지금_점수로_끝나고_방은_대기로_돌아간다` | `act(HOST, SCORE 20)`, `clock.advance(600초)`, `scheduler.latest().run()` | `viewOf(HOST).status()` = `"GAME_OVER"`, `result().reason()` = `"TIME_UP"`, `registry.get(ROOM_CODE).status()` = `RoomStatus.WAITING`, `verify(events).publishEvent(any(RoundCompletedEvent.class))`, `verify(events).publishEvent(any(GameCompletedEvent.class))` |
| `R17_마감_전에_타이머가_먼저_울리면_아무것도_끝내지_않고_다시_예약한다` | `clock.advance(599초)`, `scheduler.latest().run()` | `viewOf(HOST).status()` = `"IN_PROGRESS"`, `scheduler.latest().startTime()` = `T0.plusSeconds(600)` |

`BT/room/application/FruitStackRoomLeaveTest.java` — 같은 짜임에 참가자 셋(`HOST = 1L`, `GUEST = 2L`, `THIRD = 3L`, 모두 참가·준비 후 시작). `@BeforeEach`에서 시작 전에 `presence.connected(HOST, "s1")`, `presence.connected(THIRD, "s3")`(GUEST는 연결한 적이 없어 시작 시각이 끊긴 시각이 된다). 테스트:

| 테스트 이름 | 하는 일 | 단언 |
|---|---|---|
| `R29_탈락한_사람이_나가도_기권이_아니고_게임은_이어진다` | `act(GUEST, OUT 30)`, `leave(CODE, GUEST)` | `viewOf(HOST).status()` = `"IN_PROGRESS"`, `players().get(1).state()` = `"OUT"`·`score()` = 30, 방 참가자 2명, `verify(events, never()).publishEvent(any(GameCompletedEvent.class))` |
| `R28_살아_있는_사람이_나가면_기권이고_셋_중_하나면_이어진다` | `leave(CODE, GUEST)` | `viewOf(HOST).players().get(1).state()` = `"FORFEITED"`, `status()` = `"IN_PROGRESS"` |
| `R29_60초_끊긴_탈락자는_자동_기권되지_않는다` | `act(GUEST, OUT 30)`, `clock.advance(61초)`, `service.forfeitLongDisconnected()` | `players().get(1).state()` = `"OUT"`, 방 참가자 3명 |
| `R28_60초_끊긴_살아_있는_사람은_자동_기권된다` | `clock.advance(61초)`, `forfeitLongDisconnected()` | `players().get(1).state()` = `"FORFEITED"`, 방 참가자 2명, `status()` = `"IN_PROGRESS"` |
| `R26_마지막_상대가_나가_혼자_남으면_FORFEIT으로_끝나고_라운드는_기록하지_않는다` | `leave(GUEST)`, `leave(THIRD)` | `viewOf(HOST).result().reason()` = `"FORFEIT"`, `winnerId()` = `HOST`, `verify(events).publishEvent(any(GameCompletedEvent.class))`, `verify(events, never()).publishEvent(any(RoundCompletedEvent.class))` |
| `R26_탈락자보다_높은_마지막_한_명이면_DECIDED로_끝나고_라운드도_기록한다` | `act(HOST, SCORE 50)`, `act(GUEST, OUT 30)`, `act(THIRD, OUT 40)` | `viewOf(HOST).result().reason()` = `"DECIDED"`, `winnerId()` = `HOST`, `verify(events).publishEvent(any(RoundCompletedEvent.class))`, 방 상태 `WAITING` |

방 참가자 수는 `registry.get(ROOM_CODE).memberIds()`로 본다. `GameStartedEvent`도 같은 `events`로 나가므로 `any(X.class)`로 종류를 가려 검증한다.

- [ ] **Step 2: 실패 확인(또는 바로 통과)**

Run: `cd backend && mvn -q test -Dtest='FruitStackRoomTimeoutTest,FruitStackRoomLeaveTest'`
Expected: 제품 코드가 이미 있으므로 테스트를 쓰는 대로 통과해야 한다. 실패하면 테스트의 짜임(준비·연결·시계)을 먼저 의심하고, 제품 동작이 위 표와 다르면 멈추고 알린다.

- [ ] **Step 3: 방 API·STOMP·전적 테스트 작성**

`BT/room/api/FruitStackRoomApiTest.java`(`@SpringBootTest @AutoConfigureMockMvc`, `ApiUsers`, 방 만들기는 `POST /api/rooms` 본문 `{"name": "과일 방", "gameType": "FRUIT_STACK", "maxPlayers": N}` → 201):

| 테스트 이름 | 단언 |
|---|---|
| `과일_쌓기_방은_5명까지_만들고_6명과_1명은_거절한다` | `maxPlayers` 5 → 201·`$.gameType` = `"FRUIT_STACK"`·`$.gameTypeName` = `"과일 쌓기"`, 6 → 400 `INVALID_CAPACITY`, 1 → 400 `INVALID_CAPACITY` |
| `두_명이_준비하고_시작하면_게임_중이_된다` | `join` → `ready` → `start` 200, `GET /api/rooms/{code}`의 `$.status` = `"PLAYING"`·`$.practice` = false. 끝에 두 사람 모두 `leave` |
| `로비_목록의_네_번째가_과일_쌓기다` | `GET /api/games`의 `$.length()` = 4, `$[3].gameType` = `"FRUIT_STACK"` |

`BT/room/api/FruitStackStompFlowTest.java` — 같은 폴더의 `OldMaidStompFlowTest.java`에서 STOMP 연결 짜임(`@SpringBootTest(webEnvironment = RANDOM_PORT)`, `createClient()`, `Player` record(화면·오류·신호 큐), 로그인·연결·구독 도우미, 큐에서 기다려 꺼내는 도우미)을 그대로 가져오고 `RotatedDeck` 설정 대신 아래 설정을 쓴다:

```java
    @TestConfiguration
    static class FixedSeed {

        @Bean
        @Primary
        SeedSource fixedSeedSource() {
            return () -> new Seed(12345);
        }
    }
```

테스트(행동은 `/app/rooms/{code}/actions`, 신호는 `/app/rooms/{code}/signals`로 보낸다. 본문은 `Map.of("type", "SCORE", "score", 30)` 꼴):

| 테스트 이름 | 하는 일 | 단언 |
|---|---|---|
| `시작하면_두_사람이_같은_씨앗과_시작_시각을_받는다` | 방 만들기·참가·준비·시작 | 두 사람의 화면 `gameType` = `"FRUIT_STACK"`, `game.seed` = 12345, `game.startedAt` 서로 같음, `game.deadline - game.startedAt` = 600000, `game.players[*].state` 모두 `"PLAYING"` |
| `R19_점수를_보고하면_두_사람_화면의_점수가_바뀌고_줄어든_점수는_보낸_사람만_거절당한다` | 방장 `SCORE 30` → 두 화면 대기 → 방장 `SCORE 10` | 두 화면 `game.players[0].score` = 30. 방장 오류 큐에 `{status: 409, code: "FRUIT_STACK_SCORE_REJECTED", message: "점수를 반영할 수 없어요."}`, 손님 오류 큐는 비어 있음(500 ms 기다려 `null`) |
| `R24_판_신호는_방의_모두에게_가고_관전자의_신호는_아무에게도_가지_않는다` | 세 번째 계정이 `POST /api/rooms/{code}/watch`로 관전 입장·구독, 방장 `BOARD "WAAAAGAPqA"`, 그다음 관전자 `BOARD "WAAAAGAPqA"` | 손님·관전자·방장의 신호 큐에 `{gameType: "FRUIT_STACK", type: "BOARD", playerId: 방장 id, seq: 1, board: "WAAAAGAPqA"}`. 관전자가 보낸 뒤 500 ms 동안 어느 신호 큐에도 새 메시지 없음, 관전자 오류 큐도 비어 있음 |
| `R26_한_사람이_탈락한_뒤_남은_사람의_점수가_넘는_순간_DECIDED로_끝난다` | 손님 `OUT 30` → 방장 `SCORE 30`(안 끝남) → 방장 `SCORE 31` | 마지막 화면 `game.status` = `"GAME_OVER"`, `game.result.reason` = `"DECIDED"`, `game.winnerId` = 방장 id, `game.deadline`은 null. 끝난 뒤 방장 `SCORE 40`은 오류 큐에 `GAME_NOT_STARTED` |

`BT/record/api/FruitStackRecordApiTest.java`(`@SpringBootTest @AutoConfigureMockMvc @Transactional`, `@Autowired MockMvc mockMvc`, `@Autowired RoomService roomService`. 방은 MockMvc로 만들고(본문 `{"name": "과일 전적 방", "gameType": "FRUIT_STACK"}`), 참가·준비·시작 뒤 행동은 `roomService.act(code, user.id(), 행동)`으로 넣는다):

| 테스트 이름 | 하는 일 | 단언 |
|---|---|---|
| `R30_끝까지_한_판은_승패와_점수가_남는다` | 방장 `SCORE 50`, 손님 `OUT 30`(→ `DECIDED`) | 방장 `GET /api/records/me`: `$.stats[3].gameType` = `"FRUIT_STACK"`, `gameTypeName` = `"과일 쌓기"`, `wins` = 1, `rounds` = 1, `averageRoundScore` = 50.0. 손님: `$.stats[3].losses` = 1, `averageRoundScore` = 30.0. 손님 `GET /api/records/members/{id}/matches?gameType=FRUIT_STACK`: `$[0].result` = `"LOSE"`, `$[0].tokens` = 0, `$[0].rounds[0].score` = 30 |
| `R27_R30_최고_점수가_같으면_둘_다_무승부로_남는다` | 방장 `OUT 20`, 손님 `OUT 20` | 두 사람 `$.stats[3].draws` = 1, `averageRoundScore` = 20.0 |
| `R30_상대가_나가_끝난_판은_경기만_남고_평균_점수에는_들어가지_않는다` | 방장 `SCORE 40`, 손님 `POST /api/rooms/{code}/leave` | 방장 `$.stats[3].wins` = 1·`rounds` = 0·`averageRoundScore`는 null(`.value(nullValue())`), 손님 `losses` = 1·`rounds` = 0 |

각 테스트 끝에서 방에 남은 사람은 `leave`한다.

- [ ] **Step 4: 통과 확인**

Run: `cd backend && mvn -q test`
Expected: 전체 통과.

- [ ] **Step 5: 커밋**

```bash
git add backend/src/test/java/com/boardgame/room/application/FruitStackRoomTimeoutTest.java backend/src/test/java/com/boardgame/room/application/FruitStackRoomLeaveTest.java backend/src/test/java/com/boardgame/room/api/FruitStackRoomApiTest.java backend/src/test/java/com/boardgame/room/api/FruitStackStompFlowTest.java backend/src/test/java/com/boardgame/record/api/FruitStackRecordApiTest.java
git commit -m "test: 과일 쌓기가 방 타이머 10분 상한·나가기·끊김 기권·STOMP 점수 보고와 판 신호·전적에 그대로 올라타는지 통합 테스트로 확인한다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 프론트 엔진 — 상수, 과일 순서, 물리 세계 (R1~R4, R8, R9, R11, R14)

**Files:**
- Modify: `frontend/package.json`, `frontend/package-lock.json`(`matter-js`, `@types/matter-js` 설치)
- Create: `F/games/fruitstack/engine/constants.ts`, `F/games/fruitstack/engine/prng.ts`, `F/games/fruitstack/engine/world.ts`
- Create test: `F/games/fruitstack/engine/prng.test.ts`, `F/games/fruitstack/engine/world.test.ts`

**Interfaces:**
- Consumes: 없음(Task 1의 타입도 쓰지 않는다).
- Produces(Task 8·9·10·12·13·14가 쓴다):
  - `constants.ts`: 아래 Step 3의 모든 상수와 `radiusOf(level): number`, `pointsOf(level): number`, `fruitName(level): string`, 타입 `FrameFruit = { level: number; x: number; y: number; angle: number }`, `BoardFrame = { held: number; aimX: number; danger: boolean; fruits: FrameFruit[] }`(`held` 0 = 들고 있지 않음).
  - `prng.ts`: `levelAt(seed: number, n: number): number`(1~5).
  - `world.ts`: `type World`, `type FruitBody = { id: number; level: number; landed: boolean; x: number; y: number; vx: number; vy: number; angle: number; angularVelocity: number }`, `type NewFruit = { level: number; x: number; y: number; vx?: number; vy?: number; angle?: number; angularVelocity?: number; landed?: boolean }`, `type Merge = { level: number; x: number; y: number }`(`level` = 합쳐진 두 과일의 단계, 위치 = 새 과일 자리), `createWorld(): World`, `addFruit(world, fruit: NewFruit): number`(과일 id), `stepWorld(world): { merges: Merge[] }`, `fruitsOf(world): FruitBody[]`(들어온 순서).

**규칙(글자 그대로):**
- R1: 판 폭 360·높이 540, 왼쪽 위가 (0, 0). 벽은 움직이지 않는 사각형 3개(두께 40): 왼쪽 중심 x = -20, 오른쪽 중심 x = 380, 바닥 중심 y = 560. 천장 없음. 선 y = 90, 떨어뜨리는 높이 y = 45.
- R2: 단계 1~11의 이름·반지름·합칠 때 점수·몸 색은 Step 3의 `FRUITS` 표.
- R3: 고정 걸음 `1000 / 60` ms. 중력 `{ x: 0, y: 1, scale: 0.001 }`, `positionIterations` 8, `velocityIterations` 6, `enableSleeping` false. 과일 `restitution` 0.15, `friction` 0.3, `frictionStatic` 0.5, `frictionAir` 0.01, `density` 0.001. 벽 `isStatic`, `friction` 0.3, `restitution` 0. `Matter.Render`·`Runner`·`Mouse`는 쓰지 않는다.
- R4: `levelAt`는 Step 3의 코드 그대로. 확인 값 `seed 0` → 4, 3, 2, 5, 2, 1, 1, 3, 1, 4, 4, 5 / `seed 12345` → 5, 5, 1, 3, 2, 3, 1, 4, 3, 3, 1, 2 / `seed 2147483647` → 3, 1, 1, 1, 3, 2, 5, 4, 1, 2, 2, 3.
- R8: 한 걸음 뒤, 그 걸음에 닿기 시작했거나 닿아 있는 쌍 가운데 둘 다 과일이고 단계가 같은 쌍을 엔진이 알려 준 순서(시작한 쌍 먼저, 그다음 닿아 있는 쌍)로 본다. 한 걸음에서 과일 하나는 한 번만 합쳐진다. 두 과일을 없애고 단계 10 이하면 두 중심의 가운데(x는 새 반지름 `r`로 `[r, 360 - r]`에 자름)에 속도 0·각도 0인 다음 단계 과일을 "착지함"으로 넣는다.
- R9: 단계 11 둘은 사라지고 새 과일이 없다(합치기 알림은 `level: 11`로 한 번).
- R11: 떨어뜨린 과일은 "착지 안 함"이고, 다른 과일이나 바닥에 처음 닿는 걸음에 "착지함"이 된다. 옆 벽에 닿는 것은 착지가 아니다.
- R14: 걸음 뒤 중심 y가 640을 넘은 과일은 없앤다(알림 없음).

- [ ] **Step 1: 설치**

Run: `cd frontend && npm install matter-js@^0.20.0 && npm install -D @types/matter-js@^0.20.2`
Expected: `package.json`의 `dependencies`에 `"matter-js": "^0.20.0"`, `devDependencies`에 `"@types/matter-js": "^0.20.2"`.

- [ ] **Step 2: 실패하는 테스트 작성**

`F/games/fruitstack/engine/prng.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { levelAt } from './prng';

const first12 = (seed: number) => Array.from({ length: 12 }, (_, n) => levelAt(seed, n));

describe('R4 과일 순서', () => {
  it('씨앗마다 정해진 순서가 나온다', () => {
    expect(first12(0)).toEqual([4, 3, 2, 5, 2, 1, 1, 3, 1, 4, 4, 5]);
    expect(first12(12345)).toEqual([5, 5, 1, 3, 2, 3, 1, 4, 3, 3, 1, 2]);
    expect(first12(2147483647)).toEqual([3, 1, 1, 1, 3, 2, 5, 4, 1, 2, 2, 3]);
  });

  it('n번째만 따로 구해도 같고 값은 늘 1~5다', () => {
    expect(levelAt(12345, 7)).toBe(4);
    const levels = Array.from({ length: 2000 }, (_, n) => levelAt(987654321, n));
    expect(levels.every((level) => Number.isInteger(level) && level >= 1 && level <= 5)).toBe(true);
    expect(new Set(levels).size).toBe(5);
  });
});
```

`F/games/fruitstack/engine/world.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { BOARD_W, DROP_Y, FRUITS, pointsOf, radiusOf } from './constants';
import { addFruit, createWorld, fruitsOf, stepWorld, type Merge, type World } from './world';

function run(world: World, steps: number): Merge[] {
  const merges: Merge[] = [];
  for (let step = 0; step < steps; step += 1) {
    merges.push(...stepWorld(world).merges);
  }
  return merges;
}

const levels = (world: World) => fruitsOf(world).map((fruit) => fruit.level).sort((a, b) => a - b);

describe('과일 표', () => {
  it('R2 11단계의 반지름과 점수', () => {
    expect(FRUITS.map((fruit) => fruit.name)).toEqual(['체리', '딸기', '포도', '귤', '감', '사과', '배', '복숭아', '파인애플', '멜론', '수박']);
    expect(FRUITS.map((fruit) => fruit.radius)).toEqual([11, 15, 20, 24, 30, 37, 44, 52, 60, 70, 80]);
    expect(FRUITS.map((fruit) => fruit.points)).toEqual([1, 3, 6, 10, 15, 21, 28, 36, 45, 55, 66]);
    expect(radiusOf(11)).toBe(80);
    expect(pointsOf(5)).toBe(15);
  });
});

describe('물리 세계', () => {
  it('R11 떨어뜨린 과일은 바닥에 닿을 때 착지한다', () => {
    const world = createWorld();
    addFruit(world, { level: 1, x: 180, y: DROP_Y });
    expect(fruitsOf(world)[0].landed).toBe(false);

    run(world, 5);
    expect(fruitsOf(world)[0].landed).toBe(false);
    run(world, 400);

    const [cherry] = fruitsOf(world);
    expect(cherry.landed).toBe(true);
    expect(cherry.y).toBeGreaterThan(520);
    expect(cherry.y).toBeLessThan(531);
  });

  it('R11 옆 벽에 닿는 것은 착지가 아니다', () => {
    const world = createWorld();
    addFruit(world, { level: 1, x: 8, y: DROP_Y });

    run(world, 6);

    expect(fruitsOf(world)[0].landed).toBe(false);
  });

  it('R8 같은 자리에 체리 두 개를 떨어뜨리면 딸기 하나가 된다', () => {
    const world = createWorld();
    addFruit(world, { level: 1, x: 180, y: DROP_Y });
    run(world, 200);
    addFruit(world, { level: 1, x: 180, y: DROP_Y });

    const merges = run(world, 300);

    expect(merges).toHaveLength(1);
    expect(merges[0].level).toBe(1);
    expect(levels(world)).toEqual([2]);
    expect(fruitsOf(world)[0].landed).toBe(true);
  });

  it('R8 한 걸음에 과일 하나는 한 번만 합쳐진다', () => {
    const world = createWorld();
    addFruit(world, { level: 1, x: 100, y: 500, landed: true });
    addFruit(world, { level: 1, x: 115, y: 500, landed: true });
    addFruit(world, { level: 1, x: 130, y: 500, landed: true });

    const { merges } = stepWorld(world);

    expect(merges).toHaveLength(1);
    expect(levels(world)).toEqual([1, 2]);
  });

  it('R8 새 과일의 x는 벽 안으로 자른다', () => {
    const world = createWorld();
    addFruit(world, { level: 10, x: 70, y: 460, landed: true });
    addFruit(world, { level: 10, x: 72, y: 330, landed: true });

    const { merges } = stepWorld(world);

    // 두 멜론의 가운데 x는 71이지만 수박 반지름 80으로 자른다. y는 한 걸음의 중력만큼만 395에서 벗어난다.
    expect(merges).toHaveLength(1);
    expect(merges[0]).toMatchObject({ level: 10, x: 80 });
    expect(Math.abs(merges[0].y - 395)).toBeLessThan(1);
    expect(fruitsOf(world)).toHaveLength(1);
    expect(fruitsOf(world)[0]).toMatchObject({ level: 11, x: 80, landed: true });
  });

  it('R9 수박 두 개는 사라지고 새 과일이 없다', () => {
    const world = createWorld();
    addFruit(world, { level: 11, x: 100, y: 400, landed: true });
    addFruit(world, { level: 11, x: 250, y: 400, landed: true });

    const { merges } = stepWorld(world);

    expect(merges).toHaveLength(1);
    expect(merges[0].level).toBe(11);
    expect(fruitsOf(world)).toEqual([]);
  });

  it('단계가 다른 과일은 닿아도 합쳐지지 않는다', () => {
    const world = createWorld();
    addFruit(world, { level: 1, x: 100, y: 500, landed: true });
    addFruit(world, { level: 2, x: 118, y: 500, landed: true });

    expect(run(world, 30)).toEqual([]);
    expect(levels(world)).toEqual([1, 2]);
  });

  it('R14 판 밖으로 빠진 과일은 없앤다', () => {
    const world = createWorld();
    addFruit(world, { level: 3, x: 180, y: 700 });

    expect(stepWorld(world).merges).toEqual([]);
    expect(fruitsOf(world)).toEqual([]);
  });

  it('과일은 들어온 순서로 나오고 속도와 각도를 넣은 대로 시작한다', () => {
    const world = createWorld();
    const first = addFruit(world, { level: 4, x: 60, y: 300, vx: 1.5, vy: -2, angle: 0.5, angularVelocity: 0.1 });
    const second = addFruit(world, { level: 6, x: BOARD_W - 60, y: 300 });

    const fruits = fruitsOf(world);

    expect(fruits.map((fruit) => fruit.id)).toEqual([first, second]);
    expect(fruits[0]).toMatchObject({ level: 4, x: 60, y: 300, angle: 0.5, landed: false });
    expect(fruits[0].vx).toBeCloseTo(1.5, 5);
    expect(fruits[0].vy).toBeCloseTo(-2, 5);
    expect(fruits[0].angularVelocity).toBeCloseTo(0.1, 5);
  });
});
```

- [ ] **Step 3: 실패 확인 뒤 구현**

Run: `cd frontend && npx vitest run src/games/fruitstack/engine` → FAIL(모듈 없음).

`F/games/fruitstack/engine/constants.ts`:

```ts
/** 판(R1). 길이는 물리 단위, 왼쪽 위가 (0, 0). */
export const BOARD_W = 360;
export const BOARD_H = 540;
export const LINE_Y = 90;
export const DROP_Y = 45;
export const WALL = 40;
export const FALL_OUT_Y = 640;

/** 걸음(R3). 판의 시계는 걸음 수로 센다: 1초 = 60걸음. */
export const STEP_MS = 1000 / 60;
export const STEPS_PER_SECOND = 60;
export const DROP_COOLDOWN_STEPS = 30; // R6 500 ms
export const AUTO_DROP_STEPS = 600; // R7 10000 ms
export const OVER_LINE_STEPS = 120; // R12 2000 ms
export const MAX_STEPS_PER_TICK = 300; // R16 한 틱에 5초 분량까지
export const TICK_BUDGET_MS = 12; // R16 화면이 보일 때 한 틱의 걸음 밟기 시간
export const CATCH_UP_NOTICE_MS = 1000; // R16 밀림이 이보다 크면 "따라잡는 중…"
export const HIDDEN_TICK_MS = 1000; // R15 가려진 탭의 타이머

/** 경기·보고·신호·저장(R17~R25, R32). */
export const MATCH_LIMIT_MS = 600_000;
export const SCORE_REPORT_GAP_MS = 500;
export const SCORE_RUSH_FROM_MS = 597_000;
export const OUT_RETRY_MS = 1000;
export const REPORT_BACKOFF_MS = 5000;
export const BOARD_SIGNAL_MS = 250;
export const OUT_SIGNAL_MS = 2000;
export const BLEND_MS = 250;
export const MATCH_DISTANCE = 80;
export const MAX_SNAPSHOT_FRUITS = 239;
export const SAVE_MS = 1000;

/** 과일 11단계(R2). points = 이 과일 두 개를 합칠 때 점수 = level × (level + 1) / 2. */
export const FRUITS = [
  { level: 1, name: '체리', radius: 11, points: 1, color: '#E23D4F' },
  { level: 2, name: '딸기', radius: 15, points: 3, color: '#F2617A' },
  { level: 3, name: '포도', radius: 20, points: 6, color: '#8E5BD0' },
  { level: 4, name: '귤', radius: 24, points: 10, color: '#F59A23' },
  { level: 5, name: '감', radius: 30, points: 15, color: '#F0762B' },
  { level: 6, name: '사과', radius: 37, points: 21, color: '#D83A34' },
  { level: 7, name: '배', radius: 44, points: 28, color: '#D9D36A' },
  { level: 8, name: '복숭아', radius: 52, points: 36, color: '#F7A8B8' },
  { level: 9, name: '파인애플', radius: 60, points: 45, color: '#F2C230' },
  { level: 10, name: '멜론', radius: 70, points: 55, color: '#9BD36B' },
  { level: 11, name: '수박', radius: 80, points: 66, color: '#3FA34D' },
] as const;
export const MAX_LEVEL = 11;

const fruitOf = (level: number) => FRUITS[level - 1];
export const radiusOf = (level: number): number => fruitOf(level).radius;
export const pointsOf = (level: number): number => fruitOf(level).points;
export const fruitName = (level: number): string => fruitOf(level).name;

/** 그리기·신호가 쓰는 판 한 장. held 0 = 들고 있지 않음. */
export type FrameFruit = { level: number; x: number; y: number; angle: number };
export type BoardFrame = { held: number; aimX: number; danger: boolean; fruits: FrameFruit[] };
```

`F/games/fruitstack/engine/prng.ts`:

```ts
/** R4: n번째(0부터) 떨어뜨릴 과일의 단계(1~5). mulberry32의 n번째 출력을 바로 셈한다. 32비트 정수 연산만 써서 모든 브라우저에서 같다. */
export function levelAt(seed: number, n: number): number {
  let t = (seed + Math.imul(n + 1, 0x6D2B79F5)) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return (((t ^ (t >>> 14)) >>> 0) % 5) + 1;
}
```

`F/games/fruitstack/engine/world.ts`:

```ts
import { Bodies, Body, Composite, Engine, Events } from 'matter-js';
import { BOARD_H, BOARD_W, FALL_OUT_Y, MAX_LEVEL, STEP_MS, WALL, radiusOf } from './constants';

export type FruitBody = { id: number; level: number; landed: boolean; x: number; y: number; vx: number; vy: number; angle: number; angularVelocity: number };
export type NewFruit = { level: number; x: number; y: number; vx?: number; vy?: number; angle?: number; angularVelocity?: number; landed?: boolean };
export type Merge = { level: number; x: number; y: number };

type Entry = { body: Body; level: number; landed: boolean };
type Pair = [Body, Body];
/** fruits는 들어온 순서를 지킨다(Map). started·active는 한 걸음 동안 엔진이 알려 준 쌍. */
export type World = { engine: Engine; fruits: Map<number, Entry>; started: Pair[]; active: Pair[] };

const FRUIT = 'fruit';
const FLOOR = 'floor';
const SIDE = 'wall';
const WALL_OPTIONS = { isStatic: true, friction: 0.3, restitution: 0 };
const FRUIT_OPTIONS = { restitution: 0.15, friction: 0.3, frictionStatic: 0.5, frictionAir: 0.01, density: 0.001, label: FRUIT };

export function createWorld(): World {
  const engine = Engine.create({ enableSleeping: false, positionIterations: 8, velocityIterations: 6 });
  engine.gravity.x = 0;
  engine.gravity.y = 1;
  engine.gravity.scale = 0.001;
  Composite.add(engine.world, [
    Bodies.rectangle(-WALL / 2, BOARD_H / 2, WALL, BOARD_H * 3, { ...WALL_OPTIONS, label: SIDE }),
    Bodies.rectangle(BOARD_W + WALL / 2, BOARD_H / 2, WALL, BOARD_H * 3, { ...WALL_OPTIONS, label: SIDE }),
    Bodies.rectangle(BOARD_W / 2, BOARD_H + WALL / 2, BOARD_W + WALL * 2, WALL, { ...WALL_OPTIONS, label: FLOOR }),
  ]);
  const world: World = { engine, fruits: new Map(), started: [], active: [] };
  Events.on(engine, 'collisionStart', (event) => event.pairs.forEach((pair) => world.started.push([pair.bodyA, pair.bodyB])));
  Events.on(engine, 'collisionActive', (event) => event.pairs.forEach((pair) => world.active.push([pair.bodyA, pair.bodyB])));
  return world;
}

export function addFruit(world: World, fruit: NewFruit): number {
  const body = Bodies.circle(fruit.x, fruit.y, radiusOf(fruit.level), FRUIT_OPTIONS);
  Body.setAngle(body, fruit.angle ?? 0);
  Body.setVelocity(body, { x: fruit.vx ?? 0, y: fruit.vy ?? 0 });
  Body.setAngularVelocity(body, fruit.angularVelocity ?? 0);
  Composite.add(world.engine.world, body);
  world.fruits.set(body.id, { body, level: fruit.level, landed: fruit.landed ?? false });
  return body.id;
}

function remove(world: World, body: Body): void {
  Composite.remove(world.engine.world, body);
  world.fruits.delete(body.id);
}

// R11: 다른 과일이나 바닥에 처음 닿으면 착지. 옆 벽은 아니다.
function land(world: World, [a, b]: Pair): void {
  const lands = (other: Body) => other.label === FRUIT || other.label === FLOOR;
  const entryA = world.fruits.get(a.id);
  const entryB = world.fruits.get(b.id);
  if (entryA && lands(b)) {
    entryA.landed = true;
  }
  if (entryB && lands(a)) {
    entryB.landed = true;
  }
}

// R8·R9: 이미 합쳐진 과일은 fruits에서 빠졌으므로 다시 잡히지 않는다(한 걸음에 한 번).
function merge(world: World, [a, b]: Pair): Merge | null {
  const entryA = world.fruits.get(a.id);
  const entryB = world.fruits.get(b.id);
  if (!entryA || !entryB || entryA.level !== entryB.level) {
    return null;
  }
  const level = entryA.level;
  const next = Math.min(level + 1, MAX_LEVEL);
  const radius = radiusOf(next);
  const x = Math.min(BOARD_W - radius, Math.max(radius, (a.position.x + b.position.x) / 2));
  const y = (a.position.y + b.position.y) / 2;
  remove(world, a);
  remove(world, b);
  if (level < MAX_LEVEL) {
    addFruit(world, { level: level + 1, x, y, landed: true });
  }
  return { level, x, y };
}

export function stepWorld(world: World): { merges: Merge[] } {
  world.started.length = 0;
  world.active.length = 0;
  Engine.update(world.engine, STEP_MS);
  world.started.forEach((pair) => land(world, pair));
  const merges = [...world.started, ...world.active].flatMap((pair) => merge(world, pair) ?? []);
  // R14
  [...world.fruits.values()].filter((entry) => entry.body.position.y > FALL_OUT_Y).forEach((entry) => remove(world, entry.body));
  return { merges };
}

export function fruitsOf(world: World): FruitBody[] {
  return [...world.fruits.values()].map(({ body, level, landed }) => ({
    id: body.id, level, landed, x: body.position.x, y: body.position.y, vx: body.velocity.x, vy: body.velocity.y,
    angle: body.angle, angularVelocity: body.angularVelocity,
  }));
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd frontend && npx vitest run src/games/fruitstack/engine && npx vitest run && npm run build`
Expected: 전체 통과, 빌드 성공. `matter-js`가 "delta" 경고를 찍으면 `STEP_MS`가 16.667 이하인지 본다.

- [ ] **Step 5: 커밋**

```bash
git add frontend/package.json frontend/package-lock.json frontend/src/games/fruitstack/engine/constants.ts frontend/src/games/fruitstack/engine/prng.ts frontend/src/games/fruitstack/engine/world.ts frontend/src/games/fruitstack/engine/prng.test.ts frontend/src/games/fruitstack/engine/world.test.ts
git commit -m "feat: 과일 쌓기 엔진의 바탕을 만든다(과일 11단계 표, 씨앗에서 나오는 과일 순서, matter-js 물리 세계와 합치기·착지)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 프론트 엔진 — 한 판의 규칙: 들기·떨어뜨리기·점수·탈락·판의 시계 (R5~R7, R10, R12, R13, R15·R16의 걸음 계산)

**Files:**
- Create: `F/games/fruitstack/engine/game.ts`
- Create test: `F/games/fruitstack/engine/game.test.ts`

**Interfaces:**
- Consumes(Task 7): `constants.ts`의 `BOARD_W = 360`, `DROP_Y = 45`, `LINE_Y = 90`, `STEP_MS = 1000 / 60`, `DROP_COOLDOWN_STEPS = 30`, `AUTO_DROP_STEPS = 600`, `OVER_LINE_STEPS = 120`, `radiusOf(level)`, `pointsOf(level)`, 타입 `BoardFrame = { held: number; aimX: number; danger: boolean; fruits: { level; x; y; angle }[] }`. `prng.ts`의 `levelAt(seed, n)`(씨앗 12345의 순서는 5, 5, 1, 3, 2, 3, …). `world.ts`의 `createWorld(): World`, `addFruit(world, { level, x, y, vx?, vy?, angle?, angularVelocity?, landed? }): number`, `stepWorld(world): { merges: { level; x; y }[] }`, `fruitsOf(world): { id; level; landed; x; y; vx; vy; angle; angularVelocity }[]`.
- Produces(Task 10·13·14가 쓴다):

```ts
export type GameEvent =
  | { type: 'drop' | 'autoDrop'; level: number }
  | { type: 'merge'; level: number; x: number; y: number; points: number }
  | { type: 'out' };
export type FruitGame = {
  seed: number; world: World;
  /** 밟은 걸음 수. 판의 시계 = steps × STEP_MS. */
  steps: number;
  /** 지금까지 떨어뜨린 횟수 = 다음에 들(또는 들고 있는) 과일의 순번. */
  dropIndex: number;
  score: number; aimX: number;
  /** 지금 과일을 든 걸음(들고 있지 않으면 null). */
  heldSinceStep: number | null;
  /** 마지막으로 떨어뜨린 걸음(아직 없으면 null). */
  lastDropStep: number | null;
  overSteps: number; out: boolean;
};
export function createGame(seed: number): FruitGame;
export function heldLevel(game: FruitGame): number;      // 들고 있지 않으면 0
export function nextLevel(game: FruitGame): number;      // levelAt(seed, dropIndex + 1)
export function aim(game: FruitGame, x: number): void;
export function drop(game: FruitGame): GameEvent[];      // 들고 있지 않거나 탈락이면 []
export function stepsAt(ms: number): number;             // 그 시각까지 밟았어야 할 걸음 수
export function advance(game: FruitGame, untilMs: number, maxSteps: number): GameEvent[];
export function simMs(game: FruitGame): number;
export function autoDropLeftMs(game: FruitGame): number | null;
export function frameOf(game: FruitGame): BoardFrame;
export function freeze(game: FruitGame): void;           // 서버가 탈락이라 할 때 멈춘다(R21 (2))
```

**규칙(글자 그대로):**
- R5: 조준 x는 처음 180, 들고 있는(없으면 다음에 들) 과일의 반지름 `r`로 늘 `[r, 360 - r]`에 자른다. 들고 있는 과일은 물리 세계에 없다.
- R6: 들고 있을 때만 떨어뜨린다. 떨어뜨리면 (`aimX`, 45)에 속도 0·각도 0인 과일을 넣고 `dropIndex`를 1 올리며 들고 있지 않게 된다. 그로부터 30걸음(500 ms)이 지난 걸음 끝에 다음 과일을 든다. 경기 시작(걸음 0)에는 바로 첫 과일을 들고 있다.
- R7: 과일을 든 뒤 600걸음(10000 ms)이 지난 걸음 끝에 지금 `aimX`에 저절로 떨어진다(`autoDrop`).
- R10: 합칠 때마다 `pointsOf(합쳐진 단계)`를 점수에 더한다.
- R12: 걸음마다, 착지한 과일 가운데 윗끝(`y - r`)이 90보다 작은 것이 하나라도 있으면 `overSteps`를 1 올리고 없으면 0으로. `overSteps`가 120을 넘는 걸음(121번째 이어진 걸음)에 탈락.
- R13: 탈락한 판은 멈춘다: `advance`는 걸음을 밟지 않고 `drop`은 `[]`, 들고 있는 과일이 없다.
- R15·R16: `advance(game, untilMs, maxSteps)`는 `stepsAt(untilMs)`걸음에 이를 때까지, 많아야 `maxSteps`걸음, 탈락하면 거기서 멈춘다. `stepsAt(ms) = floor(ms × 60 ÷ 1000 + 0.000001)`.
- 한 걸음의 순서: 물리 한 걸음 → `steps += 1` → 합치기 점수·알림 → 쿨다운이 끝났으면 들기 → 든 지 600걸음이면 자동 떨어뜨리기 → 선 넘김 세기·탈락.

- [ ] **Step 1: 실패하는 테스트 작성**

`F/games/fruitstack/engine/game.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { MAX_STEPS_PER_TICK } from './constants';
import { advance, aim, autoDropLeftMs, createGame, drop, frameOf, freeze, heldLevel, nextLevel, simMs, stepsAt, type FruitGame, type GameEvent } from './game';
import { addFruit, fruitsOf } from './world';

const SEED = 12345; // 과일 순서: 감(5), 감(5), 체리(1), 포도(3), …
const ALL = Number.MAX_SAFE_INTEGER;
const levels = (game: FruitGame) => fruitsOf(game.world).map((fruit) => fruit.level).sort((a, b) => a - b);
const types = (events: GameEvent[]) => events.map((event) => event.type);

describe('들기와 떨어뜨리기', () => {
  it('R5·R6 시작하면 첫 과일을 가운데에 들고 있다', () => {
    const game = createGame(SEED);

    expect(heldLevel(game)).toBe(5);
    expect(nextLevel(game)).toBe(5);
    expect(game.aimX).toBe(180);
    expect(game.score).toBe(0);
    expect(fruitsOf(game.world)).toEqual([]);
    expect(frameOf(game)).toEqual({ held: 5, aimX: 180, danger: false, fruits: [] });
  });

  it('R5 조준 x는 들고 있는 과일이 벽 안에 들게 자른다', () => {
    const game = createGame(SEED);

    aim(game, 0);
    expect(game.aimX).toBe(30);
    aim(game, 999);
    expect(game.aimX).toBe(330);
    aim(game, 200.5);
    expect(game.aimX).toBe(200.5);
  });

  it('R6 떨어뜨리면 그 자리에 과일이 들어가고 500ms 뒤에 다음 과일을 든다', () => {
    const game = createGame(SEED);
    aim(game, 100);

    expect(drop(game)).toEqual([{ type: 'drop', level: 5 }]);

    expect(heldLevel(game)).toBe(0);
    expect(game.dropIndex).toBe(1);
    expect(fruitsOf(game.world)[0]).toMatchObject({ level: 5, x: 100, y: 45, landed: false });
    expect(drop(game)).toEqual([]);
    advance(game, 499, ALL);
    expect(game.steps).toBe(29);
    expect(heldLevel(game)).toBe(0);
    advance(game, 500, ALL);
    expect(game.steps).toBe(30);
    expect(heldLevel(game)).toBe(5);
    expect(nextLevel(game)).toBe(1);
  });

  it('R7 10초 동안 떨어뜨리지 않으면 지금 자리에 저절로 떨어지고 다시 500ms 뒤에 든다', () => {
    const game = createGame(SEED);
    aim(game, 250);

    expect(types(advance(game, 9999, ALL))).toEqual([]);
    expect(autoDropLeftMs(game)).toBeCloseTo(1000 / 60, 5);
    const events = advance(game, 10000, ALL);

    expect(events).toEqual([{ type: 'autoDrop', level: 5 }]);
    expect(game.dropIndex).toBe(1);
    expect(fruitsOf(game.world)[0]).toMatchObject({ level: 5, x: 250, y: 45 });
    expect(autoDropLeftMs(game)).toBeNull();
    advance(game, 10500, ALL);
    expect(heldLevel(game)).toBe(5);
    expect(autoDropLeftMs(game)).toBeCloseTo(10000, 5);
  });
});

describe('점수와 탈락', () => {
  it('R10 같은 자리에 감 두 개를 떨어뜨리면 사과가 되고 15점이다', () => {
    const game = createGame(SEED);
    drop(game);
    advance(game, 2000, ALL);
    drop(game);

    const events = advance(game, 7000, ALL);

    const merges = events.filter((event) => event.type === 'merge');
    expect(merges).toHaveLength(1);
    expect(merges[0]).toMatchObject({ type: 'merge', level: 5, points: 15 });
    expect(game.score).toBe(15);
    expect(levels(game)).toEqual([6]);
  });

  it('R11·R12 떨어지는 중인 과일은 선 위에 있어도 세지 않는다', () => {
    const game = createGame(SEED);
    drop(game);

    advance(game, 100, ALL);

    expect(game.overSteps).toBe(0);
    expect(frameOf(game).danger).toBe(false);
  });

  it('R12·R13 착지한 과일이 선 위에 2초 넘게 있으면 탈락하고 판이 멈춘다', () => {
    const game = createGame(SEED);
    // 바닥부터 멜론·파인애플·멜론·파인애플을 서로 닿게 쌓으면 맨 위 과일의 윗끝이 y 20이다(선 90 위).
    [[10, 470], [9, 340], [10, 210], [9, 80]].forEach(([level, y]) => addFruit(game.world, { level, x: 180, y, landed: true }));

    advance(game, 1000, ALL);
    expect(game.out).toBe(false);
    expect(frameOf(game).danger).toBe(true);
    const events = advance(game, 5000, ALL);

    expect(types(events)).toContain('out');
    expect(game.out).toBe(true);
    expect(game.steps).toBe(121);
    expect(heldLevel(game)).toBe(0);
    expect(drop(game)).toEqual([]);
    expect(advance(game, 60000, ALL)).toEqual([]);
    expect(game.steps).toBe(121);
    expect(frameOf(game).held).toBe(0);
  });

  it('freeze는 서버가 탈락이라 할 때 판을 멈춘다', () => {
    const game = createGame(SEED);

    freeze(game);

    expect(game.out).toBe(true);
    expect(heldLevel(game)).toBe(0);
    expect(advance(game, 1000, ALL)).toEqual([]);
  });
});

describe('판의 시계', () => {
  it('R15 stepsAt은 그 시각까지의 걸음 수다', () => {
    expect([0, 16, 17, 499, 500, 1000, 10000, 600000].map(stepsAt)).toEqual([0, 0, 1, 29, 30, 60, 600, 36000]);
    expect(stepsAt(-5)).toBe(0);
  });

  it('R16 한 번에 maxSteps까지만 밟고 이어 밟으면 한 번에 밟은 것과 같다', () => {
    const chunked = createGame(SEED);
    const whole = createGame(SEED);
    drop(chunked);
    drop(whole);

    advance(chunked, 20000, MAX_STEPS_PER_TICK);
    expect(chunked.steps).toBe(300);
    expect(simMs(chunked)).toBeCloseTo(5000, 5);
    advance(chunked, 20000, MAX_STEPS_PER_TICK);
    advance(chunked, 20000, MAX_STEPS_PER_TICK);
    advance(chunked, 20000, MAX_STEPS_PER_TICK);
    advance(whole, 20000, ALL);

    expect(chunked.steps).toBe(1200);
    expect(whole.steps).toBe(1200);
    expect(chunked.dropIndex).toBe(whole.dropIndex);
    expect(chunked.score).toBe(whole.score);
    expect(levels(chunked)).toEqual(levels(whole));
  });

  it('이미 지난 시각으로는 밟지 않는다', () => {
    const game = createGame(SEED);
    advance(game, 1000, ALL);

    expect(advance(game, 500, ALL)).toEqual([]);
    expect(game.steps).toBe(60);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd frontend && npx vitest run src/games/fruitstack/engine/game.test.ts`
Expected: FAIL(`./game` 없음).

- [ ] **Step 3: 구현**

`F/games/fruitstack/engine/game.ts`:

```ts
import { AUTO_DROP_STEPS, BOARD_W, DROP_COOLDOWN_STEPS, DROP_Y, LINE_Y, OVER_LINE_STEPS, STEP_MS, pointsOf, radiusOf, type BoardFrame } from './constants';
import { levelAt } from './prng';
import { addFruit, createWorld, fruitsOf, stepWorld, type World } from './world';

export type GameEvent =
  | { type: 'drop' | 'autoDrop'; level: number }
  | { type: 'merge'; level: number; x: number; y: number; points: number }
  | { type: 'out' };

export type FruitGame = {
  seed: number; world: World; steps: number; dropIndex: number; score: number; aimX: number;
  heldSinceStep: number | null; lastDropStep: number | null; overSteps: number; out: boolean;
};

export function createGame(seed: number): FruitGame {
  return { seed, world: createWorld(), steps: 0, dropIndex: 0, score: 0, aimX: BOARD_W / 2, heldSinceStep: 0, lastDropStep: null, overSteps: 0, out: false };
}

const upcoming = (game: FruitGame) => levelAt(game.seed, game.dropIndex);

export function heldLevel(game: FruitGame): number {
  return game.out || game.heldSinceStep === null ? 0 : upcoming(game);
}

export function nextLevel(game: FruitGame): number {
  return levelAt(game.seed, game.dropIndex + 1);
}

// R5
export function aim(game: FruitGame, x: number): void {
  const radius = radiusOf(upcoming(game));
  game.aimX = Math.min(BOARD_W - radius, Math.max(radius, x));
}

// R6·R7
function release(game: FruitGame, type: 'drop' | 'autoDrop'): GameEvent {
  const level = upcoming(game);
  aim(game, game.aimX);
  addFruit(game.world, { level, x: game.aimX, y: DROP_Y });
  game.dropIndex += 1;
  game.heldSinceStep = null;
  game.lastDropStep = game.steps;
  return { type, level };
}

export function drop(game: FruitGame): GameEvent[] {
  if (game.out || game.heldSinceStep === null) {
    return [];
  }
  return [release(game, 'drop')];
}

export function stepsAt(ms: number): number {
  return Math.max(0, Math.floor((ms * 60) / 1000 + 0.000001));
}

function isOverLine(game: FruitGame): boolean {
  return fruitsOf(game.world).some((fruit) => fruit.landed && fruit.y - radiusOf(fruit.level) < LINE_Y);
}

function stepOnce(game: FruitGame, events: GameEvent[]): void {
  const { merges } = stepWorld(game.world);
  game.steps += 1;
  merges.forEach((merge) => {
    const points = pointsOf(merge.level);
    game.score += points; // R10
    events.push({ type: 'merge', level: merge.level, x: merge.x, y: merge.y, points });
  });
  if (game.heldSinceStep === null && game.lastDropStep !== null && game.steps - game.lastDropStep >= DROP_COOLDOWN_STEPS) {
    game.heldSinceStep = game.steps; // R6
  }
  if (game.heldSinceStep !== null && game.steps - game.heldSinceStep >= AUTO_DROP_STEPS) {
    events.push(release(game, 'autoDrop')); // R7
  }
  game.overSteps = isOverLine(game) ? game.overSteps + 1 : 0; // R12
  if (game.overSteps > OVER_LINE_STEPS) {
    freeze(game); // R13
    events.push({ type: 'out' });
  }
}

// R15·R16
export function advance(game: FruitGame, untilMs: number, maxSteps: number): GameEvent[] {
  const events: GameEvent[] = [];
  const target = stepsAt(untilMs);
  let taken = 0;
  while (!game.out && game.steps < target && taken < maxSteps) {
    stepOnce(game, events);
    taken += 1;
  }
  return events;
}

export function simMs(game: FruitGame): number {
  return game.steps * STEP_MS;
}

export function autoDropLeftMs(game: FruitGame): number | null {
  if (game.out || game.heldSinceStep === null) {
    return null;
  }
  return (AUTO_DROP_STEPS - (game.steps - game.heldSinceStep)) * STEP_MS;
}

export function frameOf(game: FruitGame): BoardFrame {
  const fruits = fruitsOf(game.world).map(({ level, x, y, angle }) => ({ level, x, y, angle }));
  return { held: heldLevel(game), aimX: game.aimX, danger: game.overSteps > 0, fruits };
}

export function freeze(game: FruitGame): void {
  game.out = true;
  game.heldSinceStep = null;
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd frontend && npx vitest run src/games/fruitstack/engine/game.test.ts && npx vitest run && npm run build`
Expected: 전체 통과, 빌드 성공. "R12·R13 … 탈락" 테스트에서 쌓은 탑이 2초 안에 흔들려 `steps`가 121이 아니게 나오면 네 과일의 x를 모두 70으로 옮겨(왼쪽 벽에 기댄다) 다시 돌린다. 단언 값 121은 바꾸지 않는다. "R10 …" 테스트가 5초 안에 합쳐지지 않으면 `advance(game, 7000, ALL)`의 7000을 12000으로 늘린다(단언은 그대로. 12000이면 자동 떨어뜨리기가 한 번 더 일어나 `levels`가 달라지므로 그 경우 `levels` 단언만 `toContain(6)`으로 바꾼다).

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/games/fruitstack/engine/game.ts frontend/src/games/fruitstack/engine/game.test.ts
git commit -m "feat: 과일 쌓기 한 판의 규칙을 만든다(들고 떨어뜨리기, 500ms 쿨다운, 10초 자동 떨어뜨리기, 합치기 점수, 선 넘김 2초 탈락, 걸음으로 세는 판의 시계)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 프론트 엔진 — 판 신호 인코딩과 상대 판 보간 (R23, R25의 계산)

**Files:**
- Create: `F/games/fruitstack/engine/snapshot.ts`, `F/games/fruitstack/engine/interpolate.ts`
- Create test: `F/games/fruitstack/engine/snapshot.test.ts`, `F/games/fruitstack/engine/interpolate.test.ts`

**Interfaces:**
- Consumes(Task 7 `constants.ts`): `BOARD_W = 360`, `BOARD_H = 540`, `MAX_SNAPSHOT_FRUITS = 239`, `MATCH_DISTANCE = 80`, `MAX_LEVEL = 11`, 타입 `FrameFruit = { level: number; x: number; y: number; angle: number }`, `BoardFrame = { held: number; aimX: number; danger: boolean; fruits: FrameFruit[] }`.
- Produces(Task 13·14가 쓴다): `encodeBoard(frame: BoardFrame): string`, `decodeBoard(text: string): BoardFrame | null`, `matchFruits(prev: FrameFruit[], next: FrameFruit[]): (number | null)[]`(최신 판의 i번째 과일과 이어진 이전 판 과일의 번호, 없으면 `null`), `blend(prev: BoardFrame | null, next: BoardFrame, t: number): BoardFrame`(`t` 0 = 이전, 1 = 최신).

**규칙(글자 그대로):**
- R23: 글자표 `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_`(값 0~63). 30비트 낱말 하나 = 5글자, 높은 6비트부터. 첫 낱말(머리): 비트 29~26 = 들고 있는 과일 단계(없으면 0), 25~16 = `aimQ`, 15 = 위험이면 1, 14~0 = 0. 다음 낱말(과일, 받은 순서 그대로, 많아야 239개. 넘으면 앞의 239개만): 29~26 = 단계, 25~16 = `xQ`, 15~6 = `yQ`, 5~0 = `angleQ`. `xQ`·`aimQ` = `clamp(round(x ÷ 360 × 1023), 0, 1023)`, `yQ` = `clamp(round(y ÷ 540 × 1023), 0, 1023)`, `angleQ` = `round(((angle mod 2π) + 2π) mod 2π ÷ 2π × 64) mod 64`. 확인 값: 감(5)을 x 180에 들고 위험 아님 + 체리(1) 하나 (180, 529) 각도 0 → `WAAAAGAPqA`.
- 풀기: 길이가 5 미만이거나 5의 배수가 아니거나 글자표 밖 글자가 있으면 `null`. 과일 낱말의 단계가 0이거나 11보다 크면 그 낱말만 건너뛴다. `x = xQ ÷ 1023 × 360`, `y = yQ ÷ 1023 × 540`, `angle = angleQ ÷ 64 × 2π`.
- R25: 짝짓기 — 최신 판의 과일을 순서대로, 아직 안 쓴 이전 판 과일 가운데 단계가 같고 거리가 80 이하인 가장 가까운 것과 잇는다. 보간 — 이어진 과일은 위치를 선형으로, 각도는 짧은 쪽으로 보간하고, 짝이 없는 최신 과일은 제자리에 그대로, 짝이 없는 이전 과일은 그리지 않는다. 조준 x도 선형 보간. `held`·`danger`는 최신 값. 이전 판이 없거나 `t ≥ 1`이면 최신 판 그대로.

- [ ] **Step 1: 실패하는 테스트 작성**

`F/games/fruitstack/engine/snapshot.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { BoardFrame } from './constants';
import { decodeBoard, encodeBoard } from './snapshot';

const frame = (overrides: Partial<BoardFrame> = {}): BoardFrame => ({ held: 5, aimX: 180, danger: false, fruits: [{ level: 1, x: 180, y: 529, angle: 0 }], ...overrides });

describe('R23 판 신호 인코딩', () => {
  it('확인 값: 감을 들고 체리 하나가 바닥에 있는 판', () => {
    expect(encodeBoard(frame())).toBe('WAAAAGAPqA');
  });

  it('머리만 있는 빈 판은 5글자이고 들고 있지 않으면 단계 0이다', () => {
    expect(encodeBoard({ held: 0, aimX: 0, danger: false, fruits: [] })).toBe('AAAAA');
    expect(encodeBoard({ held: 0, aimX: 0, danger: true, fruits: [] })).toBe('AAIAA');
  });

  it('풀면 양자화 오차 안에서 같은 판이 나온다', () => {
    const original = frame({ held: 3, aimX: 271.3, danger: true, fruits: [{ level: 11, x: 80, y: 460, angle: 1.25 }, { level: 4, x: 333.3, y: 12.5, angle: -0.5 }] });

    const decoded = decodeBoard(encodeBoard(original));

    expect(decoded).not.toBeNull();
    expect(decoded?.held).toBe(3);
    expect(decoded?.danger).toBe(true);
    expect(decoded?.aimX).toBeCloseTo(271.3, 0);
    expect(decoded?.fruits.map((fruit) => fruit.level)).toEqual([11, 4]);
    expect(decoded?.fruits[0].x).toBeCloseTo(80, 0);
    expect(decoded?.fruits[0].y).toBeCloseTo(460, 0);
    expect(decoded?.fruits[0].angle).toBeCloseTo(1.25, 1);
    expect(decoded?.fruits[1].angle).toBeCloseTo(2 * Math.PI - 0.5, 1);
  });

  it('과일은 239개까지만 싣고 길이는 1200을 넘지 않는다', () => {
    const many = Array.from({ length: 300 }, (_, index) => ({ level: (index % 11) + 1, x: index, y: index, angle: 0 }));

    const text = encodeBoard(frame({ fruits: many }));

    expect(text).toHaveLength(1200);
    expect(text).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(decodeBoard(text)?.fruits).toHaveLength(239);
  });

  it('판 밖 좌표는 가장자리로 자른다', () => {
    const decoded = decodeBoard(encodeBoard(frame({ fruits: [{ level: 2, x: -50, y: 9999, angle: 0 }] })));

    expect(decoded?.fruits[0]).toMatchObject({ level: 2, x: 0, y: 540 });
  });

  it('형식이 어긋난 글은 null이고 단계가 틀린 과일 낱말은 건너뛴다', () => {
    expect(decodeBoard('')).toBeNull();
    expect(decodeBoard('WAAA')).toBeNull();
    expect(decodeBoard('WAAAAG')).toBeNull();
    expect(decodeBoard('WAAA+')).toBeNull();
    expect(decodeBoard('WAAAAAAAAAGAPqA')?.fruits).toEqual([expect.objectContaining({ level: 1 })]);
    expect(decodeBoard('WAAAA8AAAA')?.fruits).toEqual([]);
  });
});
```

`F/games/fruitstack/engine/interpolate.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { BoardFrame, FrameFruit } from './constants';
import { blend, matchFruits } from './interpolate';

const fruit = (level: number, x: number, y: number, angle = 0): FrameFruit => ({ level, x, y, angle });
const board = (fruits: FrameFruit[], aimX = 180, held = 1): BoardFrame => ({ held, aimX, danger: false, fruits });

describe('R25 짝짓기', () => {
  it('단계가 같고 가장 가까운 이전 과일과 잇는다', () => {
    const prev = [fruit(1, 100, 500), fruit(1, 200, 500), fruit(2, 105, 500)];
    const next = [fruit(1, 190, 505), fruit(1, 110, 505)];

    expect(matchFruits(prev, next)).toEqual([1, 0]);
  });

  it('거리가 80을 넘거나 단계가 다르면 잇지 않는다', () => {
    expect(matchFruits([fruit(1, 100, 100)], [fruit(1, 100, 181)])).toEqual([null]);
    expect(matchFruits([fruit(1, 100, 100)], [fruit(1, 100, 180)])).toEqual([0]);
    expect(matchFruits([fruit(2, 100, 100)], [fruit(1, 100, 100)])).toEqual([null]);
  });

  it('이전 과일 하나는 한 번만 쓴다', () => {
    expect(matchFruits([fruit(1, 100, 100)], [fruit(1, 101, 100), fruit(1, 102, 100)])).toEqual([0, null]);
  });
});

describe('R25 보간', () => {
  it('이어진 과일의 위치와 조준 x를 선형으로 보간한다', () => {
    const mixed = blend(board([fruit(3, 100, 400)], 100), board([fruit(3, 120, 440)], 200, 4), 0.25);

    expect(mixed.fruits[0]).toMatchObject({ level: 3, x: 105, y: 410 });
    expect(mixed.aimX).toBe(125);
    expect(mixed.held).toBe(4);
  });

  it('각도는 짧은 쪽으로 돈다', () => {
    const mixed = blend(board([fruit(3, 100, 400, 6.2)]), board([fruit(3, 100, 400, 0.1)]), 0.5);

    expect(mixed.fruits[0].angle).toBeCloseTo(6.2 + (0.1 + 2 * Math.PI - 6.2) / 2, 5);
  });

  it('새 과일은 제자리에 바로 나타나고 사라진 과일은 그리지 않는다', () => {
    const mixed = blend(board([fruit(1, 50, 500), fruit(1, 300, 500)]), board([fruit(2, 60, 495)]), 0.5);

    expect(mixed.fruits).toEqual([fruit(2, 60, 495)]);
  });

  it('이전 판이 없거나 t가 1 이상이면 최신 판 그대로, 0 이하면 이전 위치다', () => {
    const next = board([fruit(3, 120, 440)], 200);
    const prev = board([fruit(3, 100, 400)], 100);

    expect(blend(null, next, 0.3)).toBe(next);
    expect(blend(prev, next, 1)).toBe(next);
    expect(blend(prev, next, 5)).toBe(next);
    expect(blend(prev, next, -1).fruits[0]).toMatchObject({ x: 100, y: 400 });
  });
});
```

- [ ] **Step 2: 실패 확인 뒤 구현**

Run: `cd frontend && npx vitest run src/games/fruitstack/engine/snapshot.test.ts src/games/fruitstack/engine/interpolate.test.ts` → FAIL(모듈 없음).

`F/games/fruitstack/engine/snapshot.ts`:

```ts
import { BOARD_H, BOARD_W, MAX_LEVEL, MAX_SNAPSHOT_FRUITS, type BoardFrame, type FrameFruit } from './constants';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const WORD = 5;
const TAU = Math.PI * 2;

const quantize = (value: number, span: number) => Math.min(1023, Math.max(0, Math.round((value / span) * 1023)));
const quantizeAngle = (angle: number) => Math.round(((((angle % TAU) + TAU) % TAU) / TAU) * 64) % 64;

function write(word: number): string {
  let text = '';
  for (let shift = 24; shift >= 0; shift -= 6) {
    text += ALPHABET[(word >>> shift) & 63];
  }
  return text;
}

function read(text: string, at: number): number | null {
  let word = 0;
  for (let index = at; index < at + WORD; index += 1) {
    const value = ALPHABET.indexOf(text[index]);
    if (value < 0) {
      return null;
    }
    word = word * 64 + value;
  }
  return word;
}

/** R23. */
export function encodeBoard(frame: BoardFrame): string {
  const head = ((frame.held << 26) | (quantize(frame.aimX, BOARD_W) << 16) | ((frame.danger ? 1 : 0) << 15)) >>> 0;
  const fruits = frame.fruits.slice(0, MAX_SNAPSHOT_FRUITS).map((fruit) =>
    ((fruit.level << 26) | (quantize(fruit.x, BOARD_W) << 16) | (quantize(fruit.y, BOARD_H) << 6) | quantizeAngle(fruit.angle)) >>> 0);
  return [head, ...fruits].map(write).join('');
}

function fruitOf(word: number): FrameFruit | null {
  const level = word >>> 26;
  if (level < 1 || level > MAX_LEVEL) {
    return null;
  }
  return { level, x: (((word >>> 16) & 1023) / 1023) * BOARD_W, y: (((word >>> 6) & 1023) / 1023) * BOARD_H, angle: ((word & 63) / 64) * TAU };
}

export function decodeBoard(text: string): BoardFrame | null {
  if (text.length < WORD || text.length % WORD !== 0) {
    return null;
  }
  const words: number[] = [];
  for (let at = 0; at < text.length; at += WORD) {
    const word = read(text, at);
    if (word === null) {
      return null;
    }
    words.push(word);
  }
  const [head, ...rest] = words;
  return {
    held: head >>> 26, aimX: (((head >>> 16) & 1023) / 1023) * BOARD_W, danger: ((head >>> 15) & 1) === 1,
    fruits: rest.flatMap((word) => fruitOf(word) ?? []),
  };
}
```

`F/games/fruitstack/engine/interpolate.ts`:

```ts
import { MATCH_DISTANCE, type BoardFrame, type FrameFruit } from './constants';

const TAU = Math.PI * 2;

/** R25: 최신 판의 i번째 과일과 이어진 이전 판 과일의 번호(없으면 null). */
export function matchFruits(prev: FrameFruit[], next: FrameFruit[]): (number | null)[] {
  const used = new Set<number>();
  return next.map((fruit) => {
    let best: number | null = null;
    let bestDistance = Number.POSITIVE_INFINITY;
    prev.forEach((candidate, index) => {
      const distance = Math.hypot(candidate.x - fruit.x, candidate.y - fruit.y);
      if (!used.has(index) && candidate.level === fruit.level && distance <= MATCH_DISTANCE && distance < bestDistance) {
        best = index;
        bestDistance = distance;
      }
    });
    if (best !== null) {
      used.add(best);
    }
    return best;
  });
}

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

// 각도는 짧은 쪽으로.
function lerpAngle(from: number, to: number, t: number): number {
  const delta = ((((to - from + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
  return from + delta * t;
}

export function blend(prev: BoardFrame | null, next: BoardFrame, t: number): BoardFrame {
  if (!prev || t >= 1) {
    return next;
  }
  const at = Math.max(0, t);
  const matches = matchFruits(prev.fruits, next.fruits);
  const fruits = next.fruits.map((fruit, index) => {
    const match = matches[index];
    if (match === null) {
      return fruit;
    }
    const from = prev.fruits[match];
    return { level: fruit.level, x: lerp(from.x, fruit.x, at), y: lerp(from.y, fruit.y, at), angle: lerpAngle(from.angle, fruit.angle, at) };
  });
  return { held: next.held, aimX: lerp(prev.aimX, next.aimX, at), danger: next.danger, fruits };
}
```

- [ ] **Step 3: 통과 확인**

Run: `cd frontend && npx vitest run src/games/fruitstack/engine && npx vitest run && npm run build`
Expected: 전체 통과, 빌드 성공.

- [ ] **Step 4: 커밋**

```bash
git add frontend/src/games/fruitstack/engine/snapshot.ts frontend/src/games/fruitstack/engine/interpolate.ts frontend/src/games/fruitstack/engine/snapshot.test.ts frontend/src/games/fruitstack/engine/interpolate.test.ts
git commit -m "feat: 과일 쌓기 판 모습을 과일마다 5글자로 싣고 풀며, 받은 두 판 사이를 가까운 과일끼리 이어 보간한다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: 프론트 엔진 — 판 저장·복원과 보고 계획 (R18, R20, R21, R32~R34의 계산)

**Files:**
- Create: `F/games/fruitstack/engine/persist.ts`, `F/games/fruitstack/engine/reconcile.ts`
- Create test: `F/games/fruitstack/engine/persist.test.ts`, `F/games/fruitstack/engine/reconcile.test.ts`

**Interfaces:**
- Consumes: Task 7 `constants.ts`의 `STEP_MS = 1000 / 60`, `SCORE_REPORT_GAP_MS = 500`, `SCORE_RUSH_FROM_MS = 597_000`, `OUT_RETRY_MS = 1000`. Task 7 `world.ts`의 `addFruit(world, { level, x, y, vx?, vy?, angle?, angularVelocity?, landed? })`, `fruitsOf(world)`(들어온 순서의 `{ id, level, landed, x, y, vx, vy, angle, angularVelocity }`). Task 8 `game.ts`의 `createGame(seed): FruitGame`, `type FruitGame = { seed; world; steps; dropIndex; score; aimX; heldSinceStep: number | null; lastDropStep: number | null; overSteps; out }`, `drop`, `advance(game, untilMs, maxSteps)`. Task 1의 `GameAction`(`{ type: 'SCORE' | 'OUT'; score }`), `FruitStackPlayerState`.
- Produces(Task 13이 쓴다):

```ts
// persist.ts
export const BOARD_KEY_PREFIX = 'bg.fruit:';
export type SavedBoard = {
  v: 1; startedAt: number; seed: number; simMs: number; dropIndex: number; score: number; aimX: number;
  heldSinceMs: number | null; lastDropMs: number | null; overMs: number; out: boolean;
  /** 들어온 순서의 [level, x, y, vx, vy, angle, angularVelocity, landed(0 | 1)]. */
  fruits: number[][];
};
export type BoardStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;
export function boardKey(code: string, meId: number): string;                 // `bg.fruit:${code}:${meId}`
export function serialize(game: FruitGame, startedAt: number): SavedBoard;
export function restore(saved: SavedBoard): FruitGame;
export function saveBoard(storage: BoardStorage, key: string, saved: SavedBoard): void;
export function loadBoard(storage: BoardStorage, key: string, match: { startedAt: number; seed: number }): SavedBoard | null;
export function removeBoard(storage: BoardStorage, key: string): void;
export function clearOtherBoards(storage: BoardStorage, keepKey: string | null): void;

// reconcile.ts
export type ReportInput = {
  connected: boolean; gameOver: boolean; now: number; elapsedMs: number;
  local: { score: number; out: boolean };
  /** 가장 최근 화면의 내 줄. 내가 참가자가 아니면 null. */
  server: { score: number; state: FruitStackPlayerState } | null;
  lastScoreSentAt: number | null; lastOutSentAt: number | null;
  /** 이 시각 전에는 보내지 않는다(R21 거절·무응답 뒤 미룸). 없으면 0. */
  holdUntil: number;
};
export type ReportPlan = { send: GameAction | null; wakeAt: number | null };
export function planReport(input: ReportInput): ReportPlan;
```

**규칙(글자 그대로):**
- R32: 저장 내용은 위 `SavedBoard`. 시각은 걸음 × `STEP_MS`, 소수는 둘째 자리까지 반올림. 저장할 수 없으면 조용히 넘어간다.
- R33: 저장된 판은 `v === 1`이고 `startedAt`·`seed`가 지금 화면과 모두 같을 때만 쓴다. 다르거나 읽을 수 없으면 `null`을 돌려주고 그 키를 지운다. `clearOtherBoards`는 `bg.fruit:`로 시작하고 `keepKey`가 아닌 키를 모두 지운다(다른 키는 건드리지 않는다).
- R34: `restore`는 저장된 값으로 판을 다시 만든다(과일의 위치·속도·각도·착지 여부, 걸음 수 = `round(ms ÷ STEP_MS)`).
- R18·R20·R21 `planReport`(위에서부터, 먼저 맞는 것):
  1. 끊겼거나, 게임이 끝났거나, `server`가 없거나, `server.state`가 `PLAYING`이 아니면 `{ send: null, wakeAt: null }`.
  2. `now < holdUntil`이면 `{ send: null, wakeAt: holdUntil }`.
  3. `local.out`이면: `lastOutSentAt`이 없거나 `now - lastOutSentAt ≥ 1000`이면 `{ send: { type: 'OUT', score: max(local.score, server.score) }, wakeAt: now + 1000 }`, 아니면 `{ send: null, wakeAt: lastOutSentAt + 1000 }`.
  4. `local.score > server.score`이면: 간격 = `elapsedMs ≥ 597000 ? 0 : 500`. `lastScoreSentAt`이 없거나 `now - lastScoreSentAt ≥ 간격`이면 `{ send: { type: 'SCORE', score: local.score }, wakeAt: null }`, 아니면 `{ send: null, wakeAt: lastScoreSentAt + 간격 }`.
  5. 그 밖에는 `{ send: null, wakeAt: null }`.

- [ ] **Step 1: 실패하는 테스트 작성**

`F/games/fruitstack/engine/persist.test.ts`:

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { advance, aim, createGame, drop, heldLevel } from './game';
import { boardKey, clearOtherBoards, loadBoard, removeBoard, restore, saveBoard, serialize, type BoardStorage } from './persist';
import { fruitsOf } from './world';

const STARTED_AT = 1_791_900_000_000;
const ALL = Number.MAX_SAFE_INTEGER;

function played() {
  const game = createGame(12345);
  aim(game, 120);
  drop(game);
  advance(game, 2000, ALL);
  aim(game, 240);
  drop(game);
  advance(game, 2300, ALL);
  return game;
}

describe('R32~R34 판 저장과 복원', () => {
  beforeEach(() => window.localStorage.clear());

  it('키는 방 코드와 회원 id로 만든다', () => {
    expect(boardKey('ABCDEF', 7)).toBe('bg.fruit:ABCDEF:7');
  });

  it('저장한 판을 복원하면 시각·점수·과일이 같다', () => {
    const game = played();

    const saved = serialize(game, STARTED_AT);
    const again = restore(JSON.parse(JSON.stringify(saved)));

    expect(saved).toMatchObject({ v: 1, startedAt: STARTED_AT, seed: 12345, dropIndex: 2, score: 0, aimX: 240, out: false });
    expect(saved.simMs).toBe(2300);
    expect(saved.lastDropMs).toBe(2000);
    expect(saved.heldSinceMs).toBeNull();
    expect(saved.fruits).toHaveLength(2);
    expect(saved.fruits[0]).toHaveLength(8);
    expect(again.steps).toBe(game.steps);
    expect(again.dropIndex).toBe(2);
    expect(again.lastDropStep).toBe(game.lastDropStep);
    expect(again.heldSinceStep).toBeNull();
    expect(again.aimX).toBe(240);
    const before = fruitsOf(game.world);
    const after = fruitsOf(again.world);
    expect(after.map((fruit) => [fruit.level, fruit.landed])).toEqual(before.map((fruit) => [fruit.level, fruit.landed]));
    after.forEach((fruit, index) => {
      expect(fruit.x).toBeCloseTo(before[index].x, 1);
      expect(fruit.y).toBeCloseTo(before[index].y, 1);
      expect(fruit.vy).toBeCloseTo(before[index].vy, 1);
    });
  });

  it('복원한 판은 이어서 돈다', () => {
    const again = restore(serialize(played(), STARTED_AT));

    advance(again, 2500, ALL);

    expect(again.steps).toBe(150);
    expect(heldLevel(again)).toBe(1);
  });

  it('탈락한 판도 그대로 복원된다', () => {
    const game = played();
    game.out = true;
    game.overSteps = 121;

    const again = restore(serialize(game, STARTED_AT));

    expect(again.out).toBe(true);
    expect(again.overSteps).toBe(121);
    expect(heldLevel(again)).toBe(0);
  });

  it('R33 같은 경기의 저장만 읽고 다르면 지운다', () => {
    const key = boardKey('ABCDEF', 7);
    saveBoard(window.localStorage, key, serialize(played(), STARTED_AT));

    expect(loadBoard(window.localStorage, key, { startedAt: STARTED_AT, seed: 12345 })?.dropIndex).toBe(2);
    expect(loadBoard(window.localStorage, key, { startedAt: STARTED_AT + 1, seed: 12345 })).toBeNull();
    expect(window.localStorage.getItem(key)).toBeNull();

    saveBoard(window.localStorage, key, serialize(played(), STARTED_AT));
    expect(loadBoard(window.localStorage, key, { startedAt: STARTED_AT, seed: 999 })).toBeNull();
    window.localStorage.setItem(key, '{"v":2}');
    expect(loadBoard(window.localStorage, key, { startedAt: STARTED_AT, seed: 12345 })).toBeNull();
    window.localStorage.setItem(key, '깨진 글');
    expect(loadBoard(window.localStorage, key, { startedAt: STARTED_AT, seed: 12345 })).toBeNull();
    expect(loadBoard(window.localStorage, 'bg.fruit:NONE:1', { startedAt: STARTED_AT, seed: 12345 })).toBeNull();
  });

  it('R33 지금 키가 아닌 과일 쌓기 저장만 지운다', () => {
    window.localStorage.setItem('bg.fruit:AAAAAA:7', '{}');
    window.localStorage.setItem('bg.fruit:BBBBBB:7', '{}');
    window.localStorage.setItem('bg.muted', '1');

    clearOtherBoards(window.localStorage, 'bg.fruit:BBBBBB:7');

    expect(window.localStorage.getItem('bg.fruit:AAAAAA:7')).toBeNull();
    expect(window.localStorage.getItem('bg.fruit:BBBBBB:7')).toBe('{}');
    expect(window.localStorage.getItem('bg.muted')).toBe('1');
    removeBoard(window.localStorage, 'bg.fruit:BBBBBB:7');
    expect(window.localStorage.getItem('bg.fruit:BBBBBB:7')).toBeNull();
  });

  it('R32 저장소가 예외를 던져도 조용히 넘어간다', () => {
    const broken: BoardStorage = {
      length: 1,
      key: () => { throw new Error('막힘'); },
      getItem: () => { throw new Error('막힘'); },
      setItem: () => { throw new Error('막힘'); },
      removeItem: () => { throw new Error('막힘'); },
    };

    expect(() => saveBoard(broken, 'bg.fruit:A:1', serialize(played(), STARTED_AT))).not.toThrow();
    expect(loadBoard(broken, 'bg.fruit:A:1', { startedAt: STARTED_AT, seed: 12345 })).toBeNull();
    expect(() => clearOtherBoards(broken, null)).not.toThrow();
    expect(() => removeBoard(broken, 'bg.fruit:A:1')).not.toThrow();
  });
});
```

(`played()`: 걸음 0에 떨어뜨림 → 2000 ms(120걸음) → 걸음 30에 다시 든 과일을 걸음 120에 떨어뜨림 → 2300 ms(138걸음). 두 과일은 x 120과 240이라 닿지 않는다. "이어서 돈다": 걸음 150에 `120 + 30`이 되어 세 번째 과일(씨앗 12345의 2번 = 체리)을 든다.)

`F/games/fruitstack/engine/reconcile.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { planReport, type ReportInput } from './reconcile';

const input = (overrides: Partial<ReportInput> = {}): ReportInput => ({
  connected: true, gameOver: false, now: 10_000, elapsedMs: 10_000, local: { score: 30, out: false },
  server: { score: 10, state: 'PLAYING' }, lastScoreSentAt: null, lastOutSentAt: null, holdUntil: 0, ...overrides,
});
const NOTHING = { send: null, wakeAt: null };

describe('R18·R20·R21 보고 계획', () => {
  it('R18 내 점수가 서버보다 크면 총점을 보낸다', () => {
    expect(planReport(input())).toEqual({ send: { type: 'SCORE', score: 30 }, wakeAt: null });
  });

  it('R18 마지막으로 보낸 지 500ms가 안 됐으면 그때 깨어난다', () => {
    expect(planReport(input({ lastScoreSentAt: 9_700 }))).toEqual({ send: null, wakeAt: 10_200 });
    expect(planReport(input({ lastScoreSentAt: 9_500 }))).toEqual({ send: { type: 'SCORE', score: 30 }, wakeAt: null });
  });

  it('R18 경기 마지막 3초는 묶지 않고 바로 보낸다', () => {
    expect(planReport(input({ elapsedMs: 597_000, lastScoreSentAt: 9_990 }))).toEqual({ send: { type: 'SCORE', score: 30 }, wakeAt: null });
    expect(planReport(input({ elapsedMs: 596_999, lastScoreSentAt: 9_990 }))).toEqual({ send: null, wakeAt: 10_490 });
  });

  it('점수가 같거나 서버가 더 크면 보내지 않는다', () => {
    expect(planReport(input({ local: { score: 10, out: false } }))).toEqual(NOTHING);
    expect(planReport(input({ local: { score: 5, out: false } }))).toEqual(NOTHING);
  });

  it('R21 끊겼거나 끝났거나 내가 참가자가 아니거나 서버에서 이미 탈락이면 아무것도 보내지 않는다', () => {
    expect(planReport(input({ connected: false }))).toEqual(NOTHING);
    expect(planReport(input({ gameOver: true }))).toEqual(NOTHING);
    expect(planReport(input({ server: null }))).toEqual(NOTHING);
    expect(planReport(input({ server: { score: 10, state: 'OUT' }, local: { score: 30, out: true } }))).toEqual(NOTHING);
    expect(planReport(input({ server: { score: 10, state: 'FORFEITED' } }))).toEqual(NOTHING);
  });

  it('R20·R21 내 판이 탈락인데 서버는 아직 모르면 탈락을 보내고 1초에 한 번까지 다시 보낸다', () => {
    const out = { score: 30, out: true };

    expect(planReport(input({ local: out }))).toEqual({ send: { type: 'OUT', score: 30 }, wakeAt: 11_000 });
    expect(planReport(input({ local: out, lastOutSentAt: 9_400 }))).toEqual({ send: null, wakeAt: 10_400 });
    expect(planReport(input({ local: out, lastOutSentAt: 9_000 }))).toEqual({ send: { type: 'OUT', score: 30 }, wakeAt: 11_000 });
    expect(planReport(input({ local: { score: 5, out: true } })).send).toEqual({ type: 'OUT', score: 10 });
  });

  it('R21 미루는 동안에는 보내지 않고 그 시각에 깨어난다', () => {
    expect(planReport(input({ holdUntil: 15_000 }))).toEqual({ send: null, wakeAt: 15_000 });
    expect(planReport(input({ holdUntil: 15_000, local: { score: 30, out: true } }))).toEqual({ send: null, wakeAt: 15_000 });
    expect(planReport(input({ holdUntil: 10_000 })).send).toEqual({ type: 'SCORE', score: 30 });
  });
});
```

- [ ] **Step 2: 실패 확인 뒤 구현**

Run: `cd frontend && npx vitest run src/games/fruitstack/engine/persist.test.ts src/games/fruitstack/engine/reconcile.test.ts` → FAIL(모듈 없음).

`F/games/fruitstack/engine/persist.ts`:

```ts
import { STEP_MS } from './constants';
import { createGame, type FruitGame } from './game';
import { addFruit, fruitsOf } from './world';

export const BOARD_KEY_PREFIX = 'bg.fruit:';
export type SavedBoard = {
  v: 1; startedAt: number; seed: number; simMs: number; dropIndex: number; score: number; aimX: number;
  heldSinceMs: number | null; lastDropMs: number | null; overMs: number; out: boolean; fruits: number[][];
};
export type BoardStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem' | 'key' | 'length'>;

export const boardKey = (code: string, meId: number) => `${BOARD_KEY_PREFIX}${code}:${meId}`;

const round2 = (value: number) => Math.round(value * 100) / 100;
const toMs = (steps: number) => round2(steps * STEP_MS);
const toSteps = (ms: number) => Math.round(ms / STEP_MS);
const maybe = <T, U>(value: T | null, map: (value: T) => U): U | null => (value === null ? null : map(value));

export function serialize(game: FruitGame, startedAt: number): SavedBoard {
  return {
    v: 1, startedAt, seed: game.seed, simMs: toMs(game.steps), dropIndex: game.dropIndex, score: game.score, aimX: round2(game.aimX),
    heldSinceMs: maybe(game.heldSinceStep, toMs), lastDropMs: maybe(game.lastDropStep, toMs), overMs: toMs(game.overSteps), out: game.out,
    fruits: fruitsOf(game.world).map((fruit) => [fruit.level, round2(fruit.x), round2(fruit.y), round2(fruit.vx), round2(fruit.vy), round2(fruit.angle), round2(fruit.angularVelocity), fruit.landed ? 1 : 0]),
  };
}

export function restore(saved: SavedBoard): FruitGame {
  const game = createGame(saved.seed);
  game.steps = toSteps(saved.simMs);
  game.dropIndex = saved.dropIndex;
  game.score = saved.score;
  game.aimX = saved.aimX;
  game.heldSinceStep = maybe(saved.heldSinceMs, toSteps);
  game.lastDropStep = maybe(saved.lastDropMs, toSteps);
  game.overSteps = toSteps(saved.overMs);
  game.out = saved.out;
  saved.fruits.forEach(([level, x, y, vx, vy, angle, angularVelocity, landed]) =>
    addFruit(game.world, { level, x, y, vx, vy, angle, angularVelocity, landed: landed === 1 }));
  return game;
}

// 저장소가 막힌 환경(비공개 창 등)에서는 조용히 넘어간다.
function quietly<T>(run: () => T, fallback: T): T {
  try {
    return run();
  } catch {
    return fallback;
  }
}

export function saveBoard(storage: BoardStorage, key: string, saved: SavedBoard): void {
  quietly(() => storage.setItem(key, JSON.stringify(saved)), undefined);
}

export function removeBoard(storage: BoardStorage, key: string): void {
  quietly(() => storage.removeItem(key), undefined);
}

// R33
export function loadBoard(storage: BoardStorage, key: string, match: { startedAt: number; seed: number }): SavedBoard | null {
  const saved = quietly(() => JSON.parse(storage.getItem(key) ?? 'null') as SavedBoard | null, null);
  if (saved && saved.v === 1 && saved.startedAt === match.startedAt && saved.seed === match.seed && Array.isArray(saved.fruits)) {
    return saved;
  }
  removeBoard(storage, key);
  return null;
}

export function clearOtherBoards(storage: BoardStorage, keepKey: string | null): void {
  const keys = quietly(() => Array.from({ length: storage.length }, (_, index) => storage.key(index)), [] as (string | null)[]);
  keys.filter((key): key is string => key !== null && key.startsWith(BOARD_KEY_PREFIX) && key !== keepKey)
    .forEach((key) => removeBoard(storage, key));
}
```

`F/games/fruitstack/engine/reconcile.ts`:

```ts
import type { FruitStackPlayerState, GameAction } from '../../../api/types';
import { OUT_RETRY_MS, SCORE_REPORT_GAP_MS, SCORE_RUSH_FROM_MS } from './constants';

export type ReportInput = {
  connected: boolean; gameOver: boolean; now: number; elapsedMs: number;
  local: { score: number; out: boolean };
  server: { score: number; state: FruitStackPlayerState } | null;
  lastScoreSentAt: number | null; lastOutSentAt: number | null; holdUntil: number;
};
export type ReportPlan = { send: GameAction | null; wakeAt: number | null };

const NOTHING: ReportPlan = { send: null, wakeAt: null };
const due = (lastAt: number | null, now: number, gap: number) => lastAt === null || now - lastAt >= gap;

/** R18·R20·R21: 지금 보낼 보고와 다음에 다시 볼 시각. */
export function planReport({ connected, gameOver, now, elapsedMs, local, server, lastScoreSentAt, lastOutSentAt, holdUntil }: ReportInput): ReportPlan {
  if (!connected || gameOver || !server || server.state !== 'PLAYING') {
    return NOTHING;
  }
  if (now < holdUntil) {
    return { send: null, wakeAt: holdUntil };
  }
  if (local.out) {
    return due(lastOutSentAt, now, OUT_RETRY_MS)
      ? { send: { type: 'OUT', score: Math.max(local.score, server.score) }, wakeAt: now + OUT_RETRY_MS }
      : { send: null, wakeAt: (lastOutSentAt ?? now) + OUT_RETRY_MS };
  }
  if (local.score <= server.score) {
    return NOTHING;
  }
  const gap = elapsedMs >= SCORE_RUSH_FROM_MS ? 0 : SCORE_REPORT_GAP_MS;
  return due(lastScoreSentAt, now, gap)
    ? { send: { type: 'SCORE', score: local.score }, wakeAt: null }
    : { send: null, wakeAt: (lastScoreSentAt ?? now) + gap };
}
```

- [ ] **Step 3: 통과 확인**

Run: `cd frontend && npx vitest run src/games/fruitstack/engine && npx vitest run && npm run build`
Expected: 전체 통과, 빌드 성공.

- [ ] **Step 4: 커밋**

```bash
git add frontend/src/games/fruitstack/engine/persist.ts frontend/src/games/fruitstack/engine/reconcile.ts frontend/src/games/fruitstack/engine/persist.test.ts frontend/src/games/fruitstack/engine/reconcile.test.ts
git commit -m "feat: 과일 쌓기 판을 브라우저에 저장·복원하고, 점수·탈락 보고를 언제 보낼지 정하는 계획을 만든다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: 프론트 공통 이음매 — 신호 구독, 게임 모듈의 컴퓨터 지원 칸, 합치기 소리 (스펙 5장, D9)

**Files:**
- Modify: `F/games/gameModule.ts`, `F/room/useRoomChannel.ts`, `F/pages/RoomPage.tsx`, `F/lib/sound.tsx`
- Modify test: `F/room/useRoomChannel.test.tsx`, `F/lib/sound.test.tsx`

**Interfaces:**
- Consumes: Task 1의 `GameSignal`(= `OldMaidPeekSignal | FruitStackBoardSignal`), `FruitStackBoardSignal = { gameType: 'FRUIT_STACK'; type: 'BOARD'; startedAt; playerId; seq; board }`.
- Produces(Task 13·15가 쓴다):
  - `TableProps`에 `subscribeSignal?: (listener: (signal: GameSignal) => void) => () => void`(돌려주는 함수를 부르면 구독을 끊는다).
  - `GameModule`에 `supportsBots?: boolean`(없으면 true로 본다).
  - `useRoomChannel(...)`의 반환값에 `subscribeSignal`(위와 같은 타입, 렌더마다 같은 함수). `RoomPage`가 테이블에 `subscribeSignal={subscribeSignal}`로 넘긴다.
  - `QUIET_ERROR_CODES`에 `'FRUIT_STACK_SCORE_REJECTED'`.
  - `SoundName`에 `'merge'`.

**동작(글자 그대로):** `/user/queue/signal`로 신호가 오면, 구독자가 한 명이라도 있으면 구독자 모두에게 그 신호를 넘기고 `signal` 상태는 바꾸지 않는다(다시 그리지 않는다). 구독자가 없으면 지금처럼 `setSignal`한다. 도둑잡기는 구독하지 않으므로 동작이 그대로다.

- [ ] **Step 1: 실패하는 테스트 작성**

`F/room/useRoomChannel.test.tsx`의 `'도둑잡기 신호를 받아 signal로 내보낸다'` 테스트 바로 아래에 같은 짜임(그 테스트가 쓰는 연결 준비와 `state.handlers.get('/user/queue/signal')`)으로 추가:

```tsx
  it('신호 구독자가 있으면 구독자에게만 넘기고 signal 상태는 그대로 둔다', async () => {
    const board = { gameType: 'FRUIT_STACK', type: 'BOARD', startedAt: 1, playerId: 2, seq: 1, board: 'WAAAAGAPqA' } as const;
    const { result } = renderHook(() => useRoomChannel('ABCDEF'));
    await act(async () => {});
    const seen: unknown[] = [];
    let off = () => {};
    act(() => { off = result.current.subscribeSignal((signal) => seen.push(signal)); });

    act(() => state.handlers.get('/user/queue/signal')?.(board));
    act(() => state.handlers.get('/user/queue/signal')?.({ ...board, seq: 2 }));

    expect(seen).toEqual([board, { ...board, seq: 2 }]);
    expect(result.current.signal).toBeNull();

    act(() => off());
    act(() => state.handlers.get('/user/queue/signal')?.({ ...board, seq: 3 }));
    expect(seen).toHaveLength(2);
    expect(result.current.signal).toEqual({ ...board, seq: 3 });
  });

  it('subscribeSignal은 렌더가 바뀌어도 같은 함수다', async () => {
    const { result, rerender } = renderHook(() => useRoomChannel('ABCDEF'));
    await act(async () => {});
    const first = result.current.subscribeSignal;
    rerender();
    expect(result.current.subscribeSignal).toBe(first);
  });

  it('과일 쌓기 점수 거절은 알림을 띄우지 않는다', async () => {
    renderHook(() => useRoomChannel('ABCDEF'));
    await act(async () => {});

    act(() => state.handlers.get('/user/queue/errors')?.({ status: 409, code: 'FRUIT_STACK_SCORE_REJECTED', message: '점수를 반영할 수 없어요.' }));

    expect(toast.show).not.toHaveBeenCalled();
  });
```

`toast`는 그 파일 맨 위의 가짜(`vi.hoisted(() => ({ show: vi.fn() }))`)다. 마지막 테스트는 오류를 넣기 전에 `toast.show.mockClear()`를 부른다. 연결 준비 줄(`await act(async () => {})`)도 바로 위 도둑잡기 신호 테스트가 쓰는 준비와 같게 맞춘다.

`F/lib/sound.test.tsx`의 `'AudioContext가 없어도 play는 아무 일 없이 끝난다'` 테스트 아래에, 그 테스트와 같은 짜임으로 `play('merge')`를 부르는 테스트 `'합치기 소리(merge)를 재생해도 오류가 없다'`를 추가한다(`expect(() => play('merge')).not.toThrow()`).

- [ ] **Step 2: 실패 확인**

Run: `cd frontend && npx vitest run src/room/useRoomChannel.test.tsx src/lib/sound.test.tsx`
Expected: FAIL(`subscribeSignal`이 없음, `'merge'` 타입 오류는 `npm run build`에서 드러난다).

- [ ] **Step 3: 구현**

`F/games/gameModule.ts`:
- `TableProps`의 `sendSignal?` 아래에:

```ts
  /** 잦은 신호(과일 쌓기 판 모습)를 React 상태를 거치지 않고 바로 받는다. 구독자가 있는 동안 signal은 바뀌지 않는다. 돌려준 함수로 끊는다. */
  subscribeSignal?: (listener: (signal: GameSignal) => void) => () => void;
```

- `GameModule`의 `maxPlayers` 아래에:

```ts
  /** 컴퓨터 플레이어를 받는지. 없으면 받는다. 과일 쌓기만 false(서버도 거절한다). */
  supportsBots?: boolean;
```

`F/room/useRoomChannel.ts`:
- `QUIET_ERROR_CODES`에 `'FRUIT_STACK_SCORE_REJECTED'`를 더하고 위 주석에 한 줄: `// 과일 쌓기 점수·탈락 보고의 거절은 사용자가 누른 행동이 아니라 알리지 않는다.`
- 훅 안에:

```ts
  // 잦은 신호를 상태 없이 넘겨받는 구독자들(D9). 있는 동안에는 signal 상태를 건드리지 않아 방 화면이 신호마다 다시 그려지지 않는다.
  const signalListenersRef = useRef(new Set<(signal: GameSignal) => void>());
  const subscribeSignal = useCallback((listener: (signal: GameSignal) => void) => {
    signalListenersRef.current.add(listener);
    return () => {
      signalListenersRef.current.delete(listener);
    };
  }, []);
  const acceptSignal = useCallback((next: GameSignal) => {
    const listeners = signalListenersRef.current;
    if (listeners.size === 0) {
      setSignal(next);
      return;
    }
    listeners.forEach((listener) => listener(next));
  }, []);
```

- 구독 줄을 `realtime.subscribe('/user/queue/signal', (body) => acceptSignal(body as GameSignal)),`로 바꾸고 그 `useEffect`의 의존성 배열에 `acceptSignal`을 더한다.
- 반환 객체에 `subscribeSignal`을 더한다.

`F/pages/RoomPage.tsx`: `useRoomChannel`에서 `subscribeSignal`을 꺼내 `<Table … sendSignal={sendSignal} subscribeSignal={subscribeSignal} … />`로 넘긴다. 그 밖에는 고치지 않는다.

`F/lib/sound.tsx`: `SoundName`에 `| 'merge'`를 더하고 `RECIPES`에:

```ts
  // 과일 쌓기 합치기: 짧게 올라가는 맑은 음(사인파 520 → 780 Hz, 0.09초).
  merge: (ctx, out) => glide(ctx, out, 520, 780, 0, 0.09, 0.14),
```

- [ ] **Step 4: 통과 확인**

Run: `cd frontend && npx vitest run && npm run build`
Expected: 전체 통과(도둑잡기 신호 테스트 포함), 빌드 성공.

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/games/gameModule.ts frontend/src/room/useRoomChannel.ts frontend/src/pages/RoomPage.tsx frontend/src/lib/sound.tsx frontend/src/room/useRoomChannel.test.tsx frontend/src/lib/sound.test.tsx
git commit -m "feat: 방 채널이 잦은 신호를 구독자에게 바로 넘길 수 있고, 게임 모듈이 컴퓨터 지원 여부를 밝히며, 합치기 소리를 더한다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: 프론트 — 과일 그림, 판 그리기, 크기 계산 (스펙 6.3, 6.4의 `fitBoard`, 6.8의 그리기 부담, D17·D18)

**Files:**
- Create(모두 `F/games/fruitstack/`): `art/fruitArt.ts`, `FruitIcon.tsx`, `paint.ts`, `canvasPainter.ts`, `BoardCanvas.tsx`, `fit.ts`
- Create test: `art/fruitArt.test.ts`, `FruitIcon.test.tsx`, `paint.test.ts`, `BoardCanvas.test.tsx`, `fit.test.ts`(같은 폴더)

**Interfaces:**
- Consumes: Task 7 `engine/constants.ts`의 `BOARD_W = 360`, `BOARD_H = 540`, `LINE_Y = 90`, `DROP_Y = 45`, `FRUITS`(단계별 `{ level, name, radius, points, color }`), `radiusOf(level)`, `fruitName(level)`, 타입 `BoardFrame = { held: number; aimX: number; danger: boolean; fruits: { level; x; y; angle }[] }`. 기존 `TableLayout = 'pc' | 'landscape' | 'portrait'`(`F/lib/useTableLayout.ts`).
- Produces(Task 14·15가 쓴다):

```ts
// art/fruitArt.ts — 과일 그림의 하나뿐인 원천. 좌표는 -50~50(몸 원 반지름 48).
export type ArtShape =
  | { kind: 'circle'; cx: number; cy: number; r: number; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number }
  | { kind: 'ellipse'; cx: number; cy: number; rx: number; ry: number; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number }
  | { kind: 'path'; d: string; fill?: string; stroke?: string; strokeWidth?: number; opacity?: number };
export function fruitArt(level: number): ArtShape[];
export function shade(hex: string, factor: number): string;   // 각 채널 × factor, 내림

// FruitIcon.tsx
export function FruitIcon(props: { level: number; size: number; className?: string; title?: string }): JSX.Element;

// paint.ts
export type Painter = {
  clear(width: number, height: number): void;
  rect(x: number, y: number, width: number, height: number, fill: string): void;
  line(x1: number, y1: number, x2: number, y2: number, color: string, width: number, dash: number[]): void;
  fruit(level: number, x: number, y: number, radius: number, angle: number, alpha: number): void;
  ring(x: number, y: number, radius: number, color: string, alpha: number): void;
  text(text: string, x: number, y: number, size: number, color: string): void;
};
export type MergeEffect = { x: number; y: number; radius: number; progress: number };   // progress 0~1
export type PaintOptions = { scale: number; mine: boolean; dimmed: boolean; effects: MergeEffect[]; autoDropLeftMs: number | null };
export function paintBoard(painter: Painter, frame: BoardFrame | null, options: PaintOptions): void;

// canvasPainter.ts
export function createCanvasPainter(context: CanvasRenderingContext2D): Painter;

// BoardCanvas.tsx (memo)
export type BoardCanvasProps = {
  width: number;                                  // CSS px. 높이 = width × 1.5, 배율 = width ÷ 360
  getFrame: () => BoardFrame | null;              // 프레임마다 부른다(ref에서 읽는다)
  mine?: boolean; dimmed?: boolean;
  everyOtherFrame?: boolean;                      // 작은 판: 두 프레임에 한 번
  getEffects?: () => MergeEffect[]; getAutoDropLeftMs?: () => number | null;
  label: string;                                  // aria-label
  role?: 'img' | 'application';
};
export const BoardCanvas: React.MemoExoticComponent<(props: BoardCanvasProps) => JSX.Element>;

// fit.ts
export type FitInput = { layout: TableLayout; box: { w: number; h: number }; mode: 'play' | 'watch'; big: number; mini: number };
export type BoardFit = { bigWidth: number; miniWidth: number; bigCols: number; miniCols: number };
export function fitBoard(input: FitInput): BoardFit;
```

**그림(스펙 6.3, 글자 그대로):** 과일마다 `fruitArt(level)`은 이 순서의 도형 목록이다. (1) 몸: `circle` 중심 (0, 0) 반지름 48, `fill` = `FRUITS`의 몸 색, `stroke` = `shade(몸 색, 0.7)`, `strokeWidth` 4. (2) 과일별 무늬(아래 표, 몸 위에 그린다). (3) 반사광: `ellipse` 중심 (-18, -22) `rx` 12 `ry` 7, `fill` `#FFFFFF`, `opacity` 0.35. (4) 얼굴: 눈 `circle` 둘 — 중심 (-14, 6)·(14, 6) 반지름 4 `fill` `#3A2A1E`, 입 `path` `M -9 18 Q 0 26 9 18` `stroke` `#3A2A1E` `strokeWidth` 3 `fill` `none`. 모든 좌표와 반지름은 -50~50 안이다.

| 단계 | 무늬 도형 |
|---|---|
| 1 체리 | `path` `M 0 -44 Q 8 -50 18 -46` `stroke` `#5B7F2A` 폭 4 `fill` `none`, `path` `M 0 -44 Q -6 -50 -14 -48` 같은 선 |
| 2 딸기 | 씨 `circle` 6개 — (-24, -6), (24, -6), (-30, 20), (30, 20), (-12, 34), (12, 34) 반지름 2.5 `fill` `#FFE08A`. 꼭지잎 `path` `M -18 -40 L 0 -30 L 18 -40 L 8 -46 L 0 -40 L -8 -46 Z` `fill` `#4E9A3A` |
| 3 포도 | `circle` 셋 — (-22, -14) 반지름 12, (22, -14) 반지름 12, (0, 30) 반지름 12, `fill` `shade('#8E5BD0', 0.85)`, `opacity` 0.6 |
| 4 귤 | 잎 `path` `M 0 -44 Q 14 -50 22 -40 Q 10 -36 0 -44 Z` `fill` `#4E9A3A` |
| 5 감 | 꼭지잎 `path` `M 0 -46 L 12 -38 L 26 -40 L 14 -32 L 0 -34 L -14 -32 L -26 -40 L -12 -38 Z` `fill` `#4E7A2E` |
| 6 사과 | 꼭지 `path` `M 0 -40 L 2 -50` `stroke` `#6B4A2B` 폭 4 `fill` `none`, 잎 `path` `M 2 -46 Q 16 -50 22 -42 Q 10 -40 2 -46 Z` `fill` `#4E9A3A` |
| 7 배 | 밝은 띠 `ellipse` 중심 (0, -26) `rx` 26 `ry` 14 `fill` `#EFEA9A` `opacity` 0.7, 꼭지 `path` `M 0 -42 L -2 -50` `stroke` `#6B4A2B` 폭 4 `fill` `none` |
| 8 복숭아 | 골 `path` `M 0 -46 Q -10 0 0 44` `stroke` `shade('#F7A8B8', 0.8)` 폭 3 `fill` `none`, 볼 `circle` 둘 — (-26, 16)·(26, 16) 반지름 6 `fill` `#F27C97` `opacity` 0.6 |
| 9 파인애플 | 격자 `path` `M -34 -20 L 34 20 M -34 20 L 34 -20 M -20 -40 L 40 0 M -40 0 L 20 40` `stroke` `shade('#F2C230', 0.75)` 폭 3 `fill` `none`, 관 `path` `M -12 -42 L -6 -50 L 0 -42 L 6 -50 L 12 -42 Z` `fill` `#4E9A3A` |
| 10 멜론 | 그물 `path` `M -40 -16 Q 0 -30 40 -16 M -44 10 Q 0 -4 44 10 M -16 -42 Q -30 0 -16 42 M 16 -42 Q 30 0 16 42` `stroke` `#D8F0B8` 폭 2.5 `fill` `none` |
| 11 수박 | 줄무늬 `path` 다섯 — `M -30 -34 Q -38 0 -30 34`, `M -15 -43 Q -20 0 -15 43`, `M 0 -46 L 0 46`, `M 15 -43 Q 20 0 15 43`, `M 30 -34 Q 38 0 30 34`, 모두 `stroke` `#1F6B32` 폭 5 `fill` `none` |

**그리기 순서(`paintBoard`, 글자 그대로, 좌표는 물리 단위 × `scale`):** (1) `clear(360 × scale, 540 × scale)`. (2) 바탕 `rect(0, 0, 폭, 높이, 'rgba(0, 0, 0, 0.28)')`. (3) 위쪽 선 `line(0, 90s, 360s, 90s, 색, 2, [6, 6])` — 색은 `frame.danger`면 `'#EF4444'`, 아니면 `'rgba(255, 255, 255, 0.45)'`. (4) `frame`이 `null`이면 여기서 끝. (5) `mine`이고 `frame.held > 0`이면 조준선 `line(aimX·s, 45s, aimX·s, 540s, 'rgba(255, 255, 255, 0.35)', 1, [4, 8])`. (6) 과일을 받은 순서대로 `fruit(level, x·s, y·s, radiusOf(level)·s, angle, dimmed ? 0.45 : 1)`. (7) `frame.held > 0`이면 든 과일 `fruit(held, aimX·s, 45s, radiusOf(held)·s, 0, dimmed ? 0.45 : 1)`. (8) `effects`마다 `ring(x·s, y·s, radius·s·(1 + progress), '#FFFFFF', 1 - progress)`. (9) `mine`이고 `autoDropLeftMs`가 `null`이 아니며 3000 이하이고 `frame.held > 0`이면 `text(String(Math.ceil(autoDropLeftMs / 1000)), aimX·s, (45 - radiusOf(held) - 8)·s, 16, '#FFFFFF')`(0 이하면 `'1'`). (10) `mine`이고 `frame.danger`면 `text('위험', 360s - 22, 90s - 8, 12, '#EF4444')`.

**`fitBoard`(스펙 6.4, 글자 그대로):** 폭 = `floor(목표 높이 × 2 ÷ 3)`(음수면 0). 상수 간격 12, 이름·점수 줄 22, 점수 띠 44, 눕힌 화면 세로 띠 64, 작은 판 사이 8.

- [ ] **Step 1: 실패하는 테스트 작성**

`F/games/fruitstack/fit.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { TableLayout } from '../../lib/useTableLayout';
import { fitBoard } from './fit';

describe('fitBoard 확인 값(스펙 6.4)', () => {
  it('PC 844×660, 상대 4명', () => {
    const fit = fitBoard({ layout: 'pc', box: { w: 844, h: 660 }, mode: 'play', big: 1, mini: 4 });
    expect(fit).toEqual({ bigWidth: 400, miniWidth: 196, bigCols: 1, miniCols: 2 });
    expect(fit.bigWidth + fit.miniCols * (fit.miniWidth + 12)).toBe(816);
  });

  it('세로 328×500(360×640 화면), 상대 4명', () => {
    expect(fitBoard({ layout: 'portrait', box: { w: 328, h: 500 }, mode: 'play', big: 1, mini: 4 })).toEqual({ bigWidth: 220, miniWidth: 53, bigCols: 1, miniCols: 4 });
  });

  it('세로 328×660, 상대 4명', () => {
    expect(fitBoard({ layout: 'portrait', box: { w: 328, h: 660 }, mode: 'play', big: 1, mini: 4 })).toEqual({ bigWidth: 310, miniWidth: 70, bigCols: 1, miniCols: 4 });
  });

  it('가로 632×326, 상대 4명', () => {
    const fit = fitBoard({ layout: 'landscape', box: { w: 632, h: 326 }, mode: 'play', big: 1, mini: 4 });
    expect(fit).toEqual({ bigWidth: 217, miniWidth: 91, bigCols: 1, miniCols: 2 });
    expect(64 + 12 + fit.bigWidth + 12 + 2 * fit.miniWidth + 8).toBe(495);
  });

  it('상대가 한 명이면 PC는 오른쪽 한 줄, 가로는 한 칸이다', () => {
    expect(fitBoard({ layout: 'pc', box: { w: 844, h: 660 }, mode: 'play', big: 1, mini: 1 })).toEqual({ bigWidth: 400, miniWidth: 200, bigCols: 1, miniCols: 1 });
    expect(fitBoard({ layout: 'landscape', box: { w: 632, h: 326 }, mode: 'play', big: 1, mini: 1 }).miniCols).toBe(1);
  });

  it('지켜보기: 살아 있는 사람 수에 따라 큰 판 칸 수가 정해진다', () => {
    const cols = (layout: TableLayout, big: number) => fitBoard({ layout, box: { w: 844, h: 660 }, mode: 'watch', big, mini: 1 }).bigCols;
    expect([1, 2, 3, 4, 5].map((big) => cols('pc', big))).toEqual([1, 2, 3, 2, 3]);
    expect([1, 2, 3, 4, 5].map((big) => cols('portrait', big))).toEqual([1, 2, 2, 2, 2]);
    expect([1, 2, 3, 4, 5].map((big) => cols('landscape', big))).toEqual([1, 2, 3, 4, 5]);
    expect(fitBoard({ layout: 'pc', box: { w: 844, h: 660 }, mode: 'watch', big: 1, mini: 1 })).toEqual({ bigWidth: 325, miniWidth: 48, bigCols: 1, miniCols: 1 });
    expect(fitBoard({ layout: 'pc', box: { w: 844, h: 660 }, mode: 'watch', big: 2, mini: 0 }).bigWidth).toBe(396);
  });

  it('어느 배치·모드·인원에서도 전체가 상자 안에 들어간다', () => {
    const boxes: Record<TableLayout, { w: number; h: number }> = { pc: { w: 844, h: 660 }, portrait: { w: 328, h: 500 }, landscape: { w: 632, h: 326 } };
    (['pc', 'portrait', 'landscape'] as TableLayout[]).forEach((layout) => {
      [1, 2, 3, 4].forEach((mini) => {
        const fit = fitBoard({ layout, box: boxes[layout], mode: 'play', big: 1, mini });
        const sideWidth = layout === 'portrait' ? 0 : fit.miniCols * (fit.miniWidth + 12);
        expect(fit.bigWidth).toBeGreaterThanOrEqual(150);
        expect(fit.miniWidth).toBeGreaterThanOrEqual(40);
        expect(fit.bigWidth + sideWidth + (layout === 'landscape' ? 76 : 0)).toBeLessThanOrEqual(boxes[layout].w);
        expect(fit.bigWidth * 1.5).toBeLessThanOrEqual(boxes[layout].h);
        if (layout === 'portrait') {
          expect(mini * fit.miniWidth + (mini - 1) * 8).toBeLessThanOrEqual(boxes[layout].w);
        }
      });
      [1, 2, 3, 4, 5].forEach((big) => {
        const fit = fitBoard({ layout, box: boxes[layout], mode: 'watch', big, mini: 5 - big });
        expect(fit.bigWidth).toBeGreaterThan(40);
        expect(fit.bigCols * fit.bigWidth + (fit.bigCols - 1) * 12).toBeLessThanOrEqual(boxes[layout].w);
      });
    });
  });
});
```

(지켜보기 확인 값의 셈: PC 844×660·큰 판 1·작은 판 1 → 작은 판 줄 `72 + 22 + 12 = 106`, 칸 높이 `660 - 44 - 106 - 22 = 488`, 폭 `floor(488 × 2 ÷ 3) = 325`. 큰 판 2·작은 판 0 → 칸 높이 `660 - 44 - 22 = 594` → 396, 칸 폭 `floor((844 - 12) ÷ 2) = 416`, 상한 400 → 396.)

`F/games/fruitstack/art/fruitArt.test.ts`의 테스트:

| 테스트 | 단언 |
|---|---|
| `11단계 모두 그림이 있고 첫 도형은 몸 원이다` | `[1..11]`마다 `fruitArt(level)[0]`이 `{ kind: 'circle', cx: 0, cy: 0, r: 48, fill: FRUITS[level - 1].color, stroke: shade(color, 0.7), strokeWidth: 4 }`와 같다 |
| `모든 과일에 반사광과 눈 두 개와 입이 있다` | 목록에 `{ kind: 'ellipse', cx: -18, cy: -22, opacity: 0.35 }`, 반지름 4인 `circle` 둘(`cx` -14, 14), `d: 'M -9 18 Q 0 26 9 18'`인 `path`가 있다 |
| `모든 좌표가 -50~50 안이다` | `circle`·`ellipse`는 `|cx| + r(또는 rx) ≤ 50`·`|cy| + r(또는 ry) ≤ 50`, `path`의 `d`에서 뽑은 모든 숫자(`/-?\d+(\.\d+)?/g`)의 절댓값 ≤ 50 |
| `수박은 짙은 초록 줄무늬 다섯 개다` | `fruitArt(11)`에서 `stroke === '#1F6B32'`인 `path`가 5개 |
| `shade는 채널마다 곱해 내린다` | `shade('#FFFFFF', 0.5)` = `'#7f7f7f'`, `shade('#3FA34D', 0.7)` = `'#2c7235'` |

`F/games/fruitstack/FruitIcon.test.tsx`: `render(<FruitIcon level={11} size={28} title="수박" />)` → `svg`의 `viewBox`가 `-50 -50 100 100`, `width`·`height` 속성 `28`, `<title>`이 "수박", `circle` 요소가 3개 이상·`path` 요소가 6개 이상. `title`이 없으면 `aria-hidden="true"`. `level={0}`이나 `12`를 주면 아무것도 그리지 않는다(`container.firstChild`가 `null`).

`F/games/fruitstack/paint.test.ts`: 부른 내용을 `calls: [이름, ...인자][]`에 쌓는 가짜 `Painter`로:

| 테스트 | 준비 | 단언 |
|---|---|---|
| `판이 없으면 바탕과 선만 그린다` | `paintBoard(fake, null, { scale: 1, mine: false, dimmed: false, effects: [], autoDropLeftMs: null })` | `calls` = `[['clear', 360, 540], ['rect', 0, 0, 360, 540, 'rgba(0, 0, 0, 0.28)'], ['line', 0, 90, 360, 90, 'rgba(255, 255, 255, 0.45)', 2, [6, 6]]]` |
| `과일과 든 과일을 배율에 맞춰 그린다` | `frame = { held: 5, aimX: 180, danger: false, fruits: [{ level: 1, x: 100, y: 500, angle: 0.5 }] }`, `scale: 0.5`, `mine: false` | `['fruit', 1, 50, 250, 5.5, 0.5, 1]`과 `['fruit', 5, 90, 22.5, 15, 0, 1]`이 이 순서로 있고 조준선(`dash [4, 8]`인 `line`)은 없다 |
| `내 판은 조준선과 위험 표시를 그린다` | 같은 판에 `danger: true`, `mine: true`, `scale: 1` | `['line', 180, 45, 180, 540, 'rgba(255, 255, 255, 0.35)', 1, [4, 8]]`, 선 색 `'#EF4444'`, `['text', '위험', 338, 82, 12, '#EF4444']` |
| `남은 시간이 3초 이하면 든 과일 위에 초를 쓴다` | `mine: true`, `autoDropLeftMs: 2400` / `3001` / `0` | 2400 → `['text', '3', 180, 7, 16, '#FFFFFF']`, 3001 → 그런 글자 없음, 0 → 글자 `'1'` |
| `탈락한 판은 과일을 흐리게, 합치기 고리는 퍼지며 옅어진다` | `dimmed: true`, `effects: [{ x: 100, y: 200, radius: 20, progress: 0.5 }]` | 과일의 마지막 인자 0.45, `['ring', 100, 200, 30, '#FFFFFF', 0.5]` |

`F/games/fruitstack/BoardCanvas.test.tsx`:

| 테스트 | 단언 |
|---|---|
| `폭에 맞춘 2:3 캔버스와 이름을 그린다` | `render(<BoardCanvas width={200} getFrame={() => null} label="내 판" role="application" />)` → `canvas`의 스타일 폭 `200px`·높이 `300px`, `role="application"`, `aria-label="내 판"`. `role`을 안 주면 `img` |
| `캔버스를 쓸 수 없으면(jsdom) 오류 없이 넘어간다` | `getContext`를 건드리지 않고 그려도 예외가 없다 |
| `그릴 수 있으면 프레임마다 판을 읽어 그린다` | `vi.spyOn(HTMLCanvasElement.prototype, 'getContext')`가 `clearRect`·`fillRect`·`beginPath`·`moveTo`·`lineTo`·`stroke`·`fill`·`arc`·`setLineDash`·`save`·`restore`·`translate`·`rotate`·`scale`·`fillText`·`drawImage`·`setTransform`을 `vi.fn()`으로 가진 가짜를 주게 하고, `vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame'] })`로 프레임을 두 번 돌리면 `getFrame`이 2번 이상 불리고 `clearRect`가 불린다. `everyOtherFrame`이면 네 프레임에 `getFrame`이 2번 불린다. 내리면(`unmount`) 더 불리지 않는다 |

- [ ] **Step 2: 실패 확인**

Run: `cd frontend && npx vitest run src/games/fruitstack/fit.test.ts src/games/fruitstack/art src/games/fruitstack/FruitIcon.test.tsx src/games/fruitstack/paint.test.ts src/games/fruitstack/BoardCanvas.test.tsx`
Expected: FAIL(모듈 없음).

- [ ] **Step 3: 구현**

`F/games/fruitstack/fit.ts`:

```ts
import type { TableLayout } from '../../lib/useTableLayout';

export type FitInput = { layout: TableLayout; box: { w: number; h: number }; mode: 'play' | 'watch'; big: number; mini: number };
export type BoardFit = { bigWidth: number; miniWidth: number; bigCols: number; miniCols: number };

const GAP = 12;
const MINI_GAP = 8;
const LABEL = 22;
const HUD = 44;
const COMPACT_HUD = 28;
const RAIL = 64;
const widthOf = (height: number) => Math.max(0, Math.floor((height * 2) / 3));
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function playPc({ box, mini }: FitInput): BoardFit {
  const height = Math.min(600, box.h - HUD - GAP);
  const bigWidth = widthOf(height);
  const cols = Math.min(mini, 2);
  if (cols === 0) {
    return { bigWidth, miniWidth: 0, bigCols: 1, miniCols: 0 };
  }
  const rows = mini <= 2 ? 1 : 2;
  const target = Math.min(300, (height + HUD - (rows - 1) * GAP) / rows - LABEL);
  const room = Math.floor((box.w - bigWidth - cols * GAP) / cols);
  return { bigWidth, miniWidth: Math.max(0, Math.min(widthOf(target), room)), bigCols: 1, miniCols: cols };
}

function playPortrait({ box, mini }: FitInput): BoardFit {
  const target = clamp(Math.floor(box.h * 0.16), 60, 120);
  const miniWidth = mini === 0 ? 0 : Math.min(widthOf(target), Math.floor((box.w - (mini - 1) * MINI_GAP) / mini));
  const row = mini === 0 ? 0 : target + LABEL;
  const height = box.h - row - HUD - 24;
  return { bigWidth: Math.min(box.w, widthOf(height)), miniWidth, bigCols: 1, miniCols: mini };
}

function playLandscape({ box, mini }: FitInput): BoardFit {
  const bigWidth = widthOf(box.h);
  if (mini === 0) {
    return { bigWidth, miniWidth: 0, bigCols: 1, miniCols: 0 };
  }
  const cols = mini <= 2 ? 1 : 2;
  const rows = mini <= 1 ? 1 : 2;
  const target = Math.min(300, (box.h - (rows - 1) * MINI_GAP) / rows - LABEL);
  const room = Math.floor((box.w - RAIL - GAP - bigWidth - GAP - (cols - 1) * MINI_GAP) / cols);
  return { bigWidth, miniWidth: Math.max(0, Math.min(widthOf(target), room)), bigCols: 1, miniCols: cols };
}

const WATCH_PC_COLS = [1, 2, 3, 2, 3];

function watch({ layout, box, big, mini }: FitInput): BoardFit {
  const count = clamp(big, 1, 5);
  if (layout === 'landscape') {
    const side = mini > 0 ? 40 + GAP : 0;
    const cell = box.h - LABEL - COMPACT_HUD;
    const bigWidth = Math.min(Math.floor((box.w - side - (count - 1) * GAP) / count), widthOf(cell));
    return { bigWidth, miniWidth: mini > 0 ? 40 : 0, bigCols: count, miniCols: mini > 0 ? 1 : 0 };
  }
  const pc = layout === 'pc';
  const cols = pc ? WATCH_PC_COLS[count - 1] : Math.min(count, 2);
  const rows = Math.ceil(count / cols);
  const miniHeight = pc ? 72 : 60;
  const miniRow = mini > 0 ? miniHeight + LABEL + GAP : 0;
  const cell = (box.h - HUD - miniRow - (rows - 1) * GAP) / rows - LABEL;
  const bigWidth = Math.min(pc ? 400 : box.w, Math.floor((box.w - (cols - 1) * GAP) / cols), widthOf(cell));
  return { bigWidth, miniWidth: mini > 0 ? widthOf(miniHeight) : 0, bigCols: cols, miniCols: mini };
}

const PLAY: Record<TableLayout, (input: FitInput) => BoardFit> = { pc: playPc, portrait: playPortrait, landscape: playLandscape };

/** 스펙 6.4: 테이블 몸통 상자 안에 큰 판과 작은 판이 들어가는 폭(px). 높이 = 폭 × 1.5. */
export function fitBoard(input: FitInput): BoardFit {
  return input.mode === 'play' ? PLAY[input.layout](input) : watch(input);
}
```

`F/games/fruitstack/art/fruitArt.ts`: `shade(hex, factor)`는 `#RRGGBB`의 세 채널을 `Math.floor(채널 × factor)`로 바꿔 소문자 `#rrggbb`로 돌려준다. `fruitArt(level)`은 위 "그림" 절의 순서(몸 → 무늬 → 반사광 → 얼굴)로 목록을 만든다. 무늬는 `const PATTERNS: Record<number, ArtShape[]>`에 표 그대로 적는다. 1~11 밖의 단계는 빈 목록.

`F/games/fruitstack/FruitIcon.tsx`: `fruitArt(level)`이 비어 있으면 `null`. 아니면 `<svg viewBox="-50 -50 100 100" width={size} height={size} className={className} role={title ? 'img' : undefined} aria-hidden={title ? undefined : true}>` 안에 `title`이 있으면 `<title>`, 도형마다 `kind`에 맞는 `<circle>`·`<ellipse>`·`<path>`(없는 `fill`은 `'none'`, `strokeLinecap="round"`, `strokeLinejoin="round"`).

`F/games/fruitstack/paint.ts`: 위 "그리기 순서" 그대로.

`F/games/fruitstack/canvasPainter.ts`: `createCanvasPainter(context)`가 `Painter`를 만든다. `clear` = `clearRect`, `rect` = `fillStyle` + `fillRect`, `line` = `setLineDash(dash)` + `strokeStyle`·`lineWidth` + `beginPath`/`moveTo`/`lineTo`/`stroke` 뒤 `setLineDash([])`, `ring` = `globalAlpha` + `arc` + `stroke`, `text` = `font = `bold ${size}px sans-serif``·`textAlign = 'center'`·`fillText`. `fruit`는 스프라이트를 쓴다: `Map<string, HTMLCanvasElement>`에 `${level}:${Math.round(radius)}`로 한 번만 만든 작은 캔버스(변 = `ceil(radius × 2) + 2`)에 `fruitArt(level)`의 도형을 `scale(radius / 50)`으로 그려 두고(`circle`·`ellipse`는 `arc`·`ellipse`, `path`는 `new Path2D(d)`), 그릴 때 `save` → `globalAlpha = alpha` → `translate(x, y)` → `rotate(angle)` → `drawImage(sprite, -변 / 2, -변 / 2)` → `restore`. 스프라이트 캔버스를 만들 수 없으면(`getContext`가 `null`) 몸 색 원만 그린다.

`F/games/fruitstack/BoardCanvas.tsx`(`memo`): `<canvas ref role={role ?? 'img'} aria-label={label} style={{ width, height: width * 1.5 }} />`. `useEffect`(의존성 `width`)에서 `const ratio = Math.min(window.devicePixelRatio || 1, 2)`, 캔버스의 `width`·`height` 속성을 `round(width × ratio)`·`round(width × 1.5 × ratio)`로 두고 `canvas.getContext('2d')`가 없으면 아무것도 하지 않는다(jsdom은 "Not implemented"를 찍으므로 `try/catch`로 감싼다). 있으면 `context.setTransform(ratio, 0, 0, ratio, 0, 0)`, `createCanvasPainter(context)`를 만들고 `requestAnimationFrame` 고리를 돈다: 프레임마다(`everyOtherFrame`이면 짝수 번째만) `paintBoard(painter, getFrame(), { scale: width / 360, mine, dimmed, effects: getEffects?.() ?? [], autoDropLeftMs: getAutoDropLeftMs?.() ?? null })`. `getFrame` 등 함수 props는 ref에 담아 최신 것을 부른다(바뀌어도 고리를 다시 만들지 않는다). 내릴 때 `cancelAnimationFrame`.

- [ ] **Step 4: 통과 확인**

Run: `cd frontend && npx vitest run src/games/fruitstack && npx vitest run && npm run build`
Expected: 전체 통과(`noEmoji.test.ts` 포함), 빌드 성공.

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/games/fruitstack/art frontend/src/games/fruitstack/FruitIcon.tsx frontend/src/games/fruitstack/FruitIcon.test.tsx frontend/src/games/fruitstack/paint.ts frontend/src/games/fruitstack/paint.test.ts frontend/src/games/fruitstack/canvasPainter.ts frontend/src/games/fruitstack/BoardCanvas.tsx frontend/src/games/fruitstack/BoardCanvas.test.tsx frontend/src/games/fruitstack/fit.ts frontend/src/games/fruitstack/fit.test.ts
git commit -m "feat: 과일 11가지를 우리 그림으로 그리고, 판을 캔버스에 그리는 순서와 배치별 판 크기 계산을 만든다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: 프론트 훅 — 판 돌리기·서버와 맞추기·저장, 점수·탈락 보고, 판 신호 보내기·받기 (R15, R16, R18, R20~R22, R25, R32~R34)

**Files:**
- Create(모두 `F/games/fruitstack/`): `useFruitGame.ts`, `useScoreReporter.ts`, `useBoardSignals.ts`
- Create test: `useFruitGame.test.tsx`, `useScoreReporter.test.tsx`, `useBoardSignals.test.tsx`(같은 폴더)

**Interfaces:**
- Consumes:
  - Task 1: `FruitStackView = { viewerId; status: 'IN_PROGRESS' | 'GAME_OVER'; startedAt; seed; participantIds; players: { playerId; score; state: 'PLAYING' | 'OUT' | 'FORFEITED' }[]; result; winnerId; deadline; serverNow }`, `GameAction`, `GameSignal`, 픽스처 `fruitView(overrides?)`(두 사람 1·2, 0점, `startedAt = FRUIT_STARTED_AT = 1_791_900_000_000`, `seed = 12345`), `fruitPlayer(playerId, score?, state?)`.
  - Task 7: `STEP_MS`, `MAX_STEPS_PER_TICK = 300`, `TICK_BUDGET_MS = 12`, `CATCH_UP_NOTICE_MS = 1000`, `HIDDEN_TICK_MS = 1000`, `SAVE_MS = 1000`, `BOARD_SIGNAL_MS = 250`, `OUT_SIGNAL_MS = 2000`, `BLEND_MS = 250`, `REPORT_BACKOFF_MS = 5000`, `radiusOf`, `BoardFrame`.
  - Task 8: `createGame(seed)`, `advance(game, untilMs, maxSteps): GameEvent[]`, `aim(game, x)`, `drop(game): GameEvent[]`, `frameOf(game)`, `freeze(game)`, `heldLevel`, `nextLevel`, `autoDropLeftMs`, `simMs`, `stepsAt(ms)`, 타입 `FruitGame`, `GameEvent`(`{ type: 'drop' | 'autoDrop'; level }`, `{ type: 'merge'; level; x; y; points }`, `{ type: 'out' }`).
  - Task 9: `encodeBoard(frame): string`, `decodeBoard(text): BoardFrame | null`, `blend(prev, next, t)`.
  - Task 10: `boardKey(code, meId)`, `serialize(game, startedAt)`, `restore(saved)`, `saveBoard(storage, key, saved)`, `loadBoard(storage, key, { startedAt, seed })`, `removeBoard(storage, key)`, `clearOtherBoards(storage, keepKey)`, `BoardStorage`, `planReport(input): { send: GameAction | null; wakeAt: number | null }`(입력 `{ connected, gameOver, now, elapsedMs, local: { score, out }, server: { score, state } | null, lastScoreSentAt, lastOutSentAt, holdUntil }`).
  - Task 12: 타입 `MergeEffect = { x; y; radius; progress }`.
  - 기존: `useReducedMotion`(`motion/react`).
- Produces(Task 14·15가 쓴다):

```ts
// useFruitGame.ts
export type FruitHud = { score: number; held: number; next: number; danger: boolean; out: boolean; catchingUp: boolean };
/** run을 되풀이해 부르게 하고, 멈추는 함수를 돌려준다. 기본은 화면이 보이면 requestAnimationFrame, 가려지면 1000 ms 타이머. */
export type Ticker = (run: () => void) => () => void;
export type FruitGameOptions = { code: string; meId: number; game: FruitStackView; storage?: BoardStorage; ticker?: Ticker; now?: () => number };
export type FruitGameHandle = {
  /** 내 판이 있다(내가 기권하지 않은 참가자). 탈락한 판도 true. */
  hasBoard: boolean;
  hud: FruitHud;
  getFrame: () => BoardFrame | null;
  getEffects: () => MergeEffect[];
  getAutoDropLeftMs: () => number | null;
  getLocal: () => { score: number; out: boolean } | null;
  elapsedMs: () => number;
  aim: (x: number) => void;
  drop: () => void;
  onEvents: (listener: (events: GameEvent[]) => void) => () => void;
};
export function useFruitGame(options: FruitGameOptions): FruitGameHandle;
export function runTick(game: FruitGame, elapsedMs: number, limits: { maxSteps: number; budgetMs: number | null; now: () => number }): GameEvent[];

// useScoreReporter.ts
export type ScoreReporterOptions = {
  send: (action: GameAction) => void; connected: boolean; game: FruitStackView; meId: number; errorSeq: number;
  getLocal: () => { score: number; out: boolean } | null; elapsedMs: () => number; now?: () => number;
};
export function useScoreReporter(options: ScoreReporterOptions): { poke: () => void };

// useBoardSignals.ts
export type BoardSignalsOptions = {
  sendSignal?: (action: GameAction) => void;
  subscribeSignal?: (listener: (signal: GameSignal) => void) => () => void;
  startedAt: number; meId: number;
  /** 내 판(없으면 보내지 않는다). */
  getFrame: () => BoardFrame | null;
  out: boolean; active: boolean; now?: () => number;
};
export function useBoardSignals(options: BoardSignalsOptions): { frameOf: (playerId: number) => BoardFrame | null };
```

**동작(글자 그대로):**

`useFruitGame`
- 경기 시작의 내 시계 시각(R15): 화면을 받을 때마다 `받은 시각 - (game.serverNow - game.startedAt)`을 셈해 같은 `startedAt` 안에서 가장 이른 값을 기억한다. `elapsedMs() = max(0, now() - 그 값)`. `startedAt`이 바뀌면 처음부터.
- 판 만들기(R33·R34): `startedAt`이 바뀔 때 `clearOtherBoards(storage, boardKey(code, meId))`. 화면이 `IN_PROGRESS`이고 `players`에 내가 있고 내 `state`가 `FORFEITED`가 아니면, `loadBoard`로 읽은 판이 있으면 `restore`, 없으면 `createGame(game.seed)`. 그 밖에는 판이 없다(`hasBoard = false`, `getFrame()`은 `null`). `storage`의 기본값은 `window.localStorage`(접근이 예외를 던지면 저장 없이 돈다).
- 화면과 맞추기(R21 (1)·(2)): 화면을 받을 때마다 내 판의 점수 = `max(내 판 점수, 화면의 내 점수)`. 화면에서 내가 `OUT`인데 내 판이 살아 있으면 `freeze`.
- 틱(R15·R16): 판이 있고 화면이 `IN_PROGRESS`이고 판이 탈락하지 않은 동안 `ticker`가 `runTick(game, elapsedMs(), 한도)`를 부른다. 한도는 화면이 보이면 `{ maxSteps: 300, budgetMs: 12 }`, 가려져 있으면 `{ maxSteps: 300, budgetMs: null }`. `runTick`은 `advance(game, elapsedMs, 30)`을 되풀이해 걸음이 `maxSteps`에 이르거나, 더 밟을 걸음이 없거나, 탈락하거나, `budgetMs`가 있고 시작부터 `now()`로 잰 시간이 그것을 넘으면 멈추고, 모은 알림을 돌려준다.
- 알림: 틱이 낸 알림과 `drop()`이 낸 알림을 `onEvents` 구독자에게 준다(빈 목록은 주지 않는다).
- 입력: `aim(x)`·`drop()`은 판이 있고, 화면이 `IN_PROGRESS`이고, 밀림(`elapsedMs() - simMs(game)`)이 1000 ms 이하일 때만 듣는다(R16).
- `hud`: 틱마다 `{ score, held: heldLevel, next: nextLevel, danger: overSteps > 0, out, catchingUp: 밀림 > 1000 }`을 만들어 앞의 값과 다를 때만 상태를 바꾼다(다시 그리기를 줄인다). 판이 없으면 모두 0·false.
- 합치기 효과(스펙 6.8): `merge` 알림마다 `{ x, y, radius: radiusOf(min(level + 1, 11)), 시작 시각 }`을 150 ms 동안 기억하고 `getEffects()`가 `progress = (now - 시작) ÷ 150`으로 돌려준다. 동작 줄이기면 늘 빈 목록.
- 저장(R32): 틱에서 마지막 저장으로부터 1000 ms가 지났으면, `out` 알림이 났을 때, `pagehide`와 `visibilitychange`(가려짐)에서 `saveBoard(storage, key, serialize(game, startedAt))`.
- 끝(R33): 화면이 `GAME_OVER`가 되면 틱을 멈추고 `removeBoard`. 판은 마지막 모습으로 남는다(`getFrame()`이 계속 준다).

`useScoreReporter`
- `run()`: `getLocal()`이 `null`이면 아무것도 안 한다. 아니면 `planReport({ connected, gameOver: game.status === 'GAME_OVER', now: now(), elapsedMs: elapsedMs(), local, server: 화면의 내 줄(없으면 null), lastScoreSentAt, lastOutSentAt, holdUntil })`. `send`가 있으면 `send(그 행동)`을 부르고 종류에 따라 `lastScoreSentAt`(`SCORE`) 또는 `lastOutSentAt`(`OUT`, `lastScoreSentAt`도 함께)을 `now()`로 적는다. `wakeAt`이 있으면 그 시각에 `run()`을 다시 부르는 타이머를 하나만 둔다(앞의 타이머는 지운다).
- `run()`을 부르는 때: `game`이 바뀔 때(화면을 받을 때), `connected`가 바뀔 때, `poke()`가 불릴 때, 타이머.
- `errorSeq`가 처음 값에서 바뀔 때마다 `holdUntil = now() + 5000`으로 두고 `run()`(R21).
- 끊긴 동안에는 `send`를 부르지 않는다(계획이 막는다). 내릴 때 타이머를 지운다.

`useBoardSignals`
- 보내기(R22): `active`이고 `sendSignal`이 있는 동안, `out`이 아니면 250 ms마다, `out`이면 2000 ms마다 `getFrame()`이 `null`이 아닐 때 `sendSignal({ type: 'BOARD', board: encodeBoard(frame) })`. `out`이 true로 바뀌는 순간에도 한 번 바로 보낸다.
- 받기(R25): `subscribeSignal`로 구독한다. `gameType`이 `'FRUIT_STACK'`이 아니거나, `startedAt`이 다르거나, `playerId`가 나이거나, `decodeBoard`가 `null`인 신호는 버린다. 사람마다 `{ prev, next, at }`(이전·최신·최신을 받은 시각)을 ref에 둔다. `startedAt`이 바뀌면 모두 지운다.
- `frameOf(playerId)`: 받은 판이 없으면 `null`. 동작 줄이기면 최신 판 그대로. 아니면 `blend(prev, next, (now() - at) ÷ 250)`.

- [ ] **Step 1: 실패하는 테스트 작성**

세 테스트 파일 모두 `renderHook`(`@testing-library/react`)을 쓰고(방 코드는 `'ABCDEF'`, 따로 적지 않으면 `meId = 1`), 시각은 `let clock = FRUIT_STARTED_AT; const now = () => clock;`로 손으로 흘린다. `useFruitGame`은 `ticker`를 `(run) => { tick = run; return () => { tick = () => {}; }; }`로 주어 테스트가 `act(() => tick())`으로 틱을 민다. `storage`는 `window.localStorage`(각 테스트 앞에서 `clear()`).

`F/games/fruitstack/useFruitGame.test.tsx`:

| 테스트 | 하는 일 | 단언 |
|---|---|---|
| `R34 진행 중인 화면을 받으면 빈 판으로 시작해 첫 과일을 든다` | `game = fruitView()`, `meId = 1` | `hasBoard` true, `hud` = `{ score: 0, held: 5, next: 5, danger: false, out: false, catchingUp: false }`, `getFrame()` = `{ held: 5, aimX: 180, danger: false, fruits: [] }`, `getLocal()` = `{ score: 0, out: false }` |
| `관전자와 기권한 사람에게는 판이 없다` | `meId = 9` / `players: [fruitPlayer(1, 0, 'FORFEITED'), fruitPlayer(2)]` | `hasBoard` false, `getFrame()` null, `getLocal()` null, `drop()`을 불러도 예외 없음 |
| `R15 판의 시계는 경기 경과 시간을 따라간다` | `clock += 1000`, `tick()` | `elapsedMs()` = 1000, `getAutoDropLeftMs()`가 9000에 가깝다(`toBeCloseTo(9000, 0)`) |
| `R15 화면의 serverNow로 시작 시각을 맞춘다` | `game = fruitView({ serverNow: FRUIT_STARTED_AT + 4000 })`를 `clock = FRUIT_STARTED_AT + 4200`에 받음 | `elapsedMs()` = 4000 |
| `R6 떨어뜨리면 알림이 가고 조준한 자리에 과일이 생긴다` | `onEvents(listener)`, `act(() => { aim(100); drop(); })` | `listener`가 `[{ type: 'drop', level: 5 }]`로 불림, `getFrame().fruits[0]`이 `{ level: 5, x: 100, y: 45 }`를 포함 |
| `R16 한 틱에 300걸음까지만 밟고 밀리는 동안 입력을 받지 않는다` | `clock += 20_000`, `tick()` | `hud.catchingUp` true, `act(() => drop())` 뒤에도 `listener`가 `drop`으로 불리지 않음. `tick()`을 세 번 더 → `hud.catchingUp` false |
| `R7 자리를 비운 동안의 자동 떨어뜨리기도 일어난다` | `clock += 10_600`, `tick()` 세 번 | `listener`가 받은 알림에 `{ type: 'autoDrop', level: 5 }`, `hud.held` 5 |
| `R21 화면의 내 점수가 더 크면 내 점수를 올린다` | `rerender`로 `players: [fruitPlayer(1, 40), fruitPlayer(2)]` | `getLocal().score` 40, `tick()` 뒤 `hud.score` 40 |
| `R21 화면에서 내가 탈락이면 내 판을 멈춘다` | `rerender`로 `players: [fruitPlayer(1, 0, 'OUT'), fruitPlayer(2)]` | `getLocal().out` true, `tick()` 뒤 `hud.out` true·`hud.held` 0 |
| `R32 1초마다 판을 저장하고 R34 다시 열면 이어진다` | `aim(100); drop()`, `clock += 1100`, `tick()`, 훅을 내리고(`unmount`) 같은 화면으로 다시 `renderHook` | `localStorage.getItem('bg.fruit:ABCDEF:1')`이 있고, 다시 연 훅의 `getFrame().fruits`가 1개, `tick()` 뒤 `hud.held` 5 |
| `R33 다른 경기의 저장은 버리고 다른 방의 저장은 지운다` | 저장소에 `bg.fruit:ZZZZZZ:1` = `'{}'`, `bg.fruit:ABCDEF:1` = `startedAt`이 다른 저장 글, `bg.muted` = `'1'`을 넣고 훅을 연다 | 두 `bg.fruit:` 키가 없어지고 `bg.muted`는 남으며 `getFrame().fruits`는 빈 목록 |
| `R33 게임이 끝나면 저장을 지우고 판은 마지막 모습으로 남는다` | 떨어뜨리고 저장된 뒤 `rerender`로 `status: 'GAME_OVER'` | 키가 없어짐, `getFrame().fruits`가 1개, `clock += 5000; tick()` 뒤에도 과일의 y가 그대로 |
| `runTick은 걸음 상한과 시간 한도에서 멈춘다` | `runTick(createGame(1), 20_000, { maxSteps: 300, budgetMs: null, now })` / `budgetMs: 12`에 `now`가 부를 때마다 5씩 느는 시계 | 첫째 `game.steps` 300, 둘째 `game.steps`가 30의 배수이고 300보다 작다 |
| `합치기 효과는 150ms 동안만 있다` | 틱의 알림에 `merge`가 나오게 판을 만든다(같은 자리에 두 번 떨어뜨리고 `clock`을 8000까지 500씩 올리며 `tick()`) | `merge` 알림 직후 `getEffects()` 길이 1·`progress` 0 이상 1 미만, `clock += 200` 뒤 빈 목록 |

`F/games/fruitstack/useScoreReporter.test.tsx`(`vi.useFakeTimers()`로 타이머만 가짜, `now`는 위의 `clock`과 `vi.setSystemTime`을 함께 올리는 도우미 `advance(ms)` = `clock += ms; vi.advanceTimersByTime(ms)`. `local = { score: 0, out: false }`를 테스트가 바꾼다):

| 테스트 | 하는 일 | 단언 |
|---|---|---|
| `R18 점수가 오르면 바로 보내고 500ms 안의 다음 점수는 묶어 한 번 보낸다` | `local.score = 10; poke()` → `local.score = 16; poke()` → `local.score = 31; poke()` → `advance(500)` | `send` 호출 순서 `[{ type: 'SCORE', score: 10 }, { type: 'SCORE', score: 31 }]` |
| `화면의 내 점수가 따라오면 더 보내지 않는다` | 10을 보낸 뒤 `rerender`로 `players[0].score = 10`, `advance(2000)` | `send` 1번 |
| `R18 경기 마지막 3초에는 묶지 않는다` | `elapsedMs = () => 598_000`, `local.score = 10; poke(); local.score = 20; poke()` | `send` 2번 |
| `R21 끊긴 동안에는 보내지 않고 다시 붙으면 가장 최근 점수를 한 번 보낸다` | `connected: false`로 `local.score = 10; poke(); local.score = 25; poke()` → `rerender`로 `connected: true` | 끊긴 동안 `send` 0번, 붙은 뒤 `[{ type: 'SCORE', score: 25 }]` |
| `R20 내 판이 탈락하면 탈락을 보내고 화면이 탈락이 될 때까지 1초마다 다시 보낸다` | `local = { score: 30, out: true }; poke()` → `advance(1000)` → `rerender`로 내 `state: 'OUT'` → `advance(3000)` | `send`가 `{ type: 'OUT', score: 30 }`으로 정확히 2번 |
| `R21 errorSeq가 오르면 다음 보고를 5초 미룬다` | `rerender`로 `errorSeq: 1`, `local.score = 10; poke()` → `advance(4999)` → `advance(1)` | 4999까지 `send` 0번, 그 뒤 1번 |
| `게임이 끝났거나 내가 참가자가 아니면 보내지 않는다` | `status: 'GAME_OVER'` / `getLocal = () => null` | `send` 0번 |
| `내리면 남은 타이머를 지운다` | 묶인 보고가 기다리는 중에 `unmount`, `advance(1000)` | 추가 `send` 없음 |

`F/games/fruitstack/useBoardSignals.test.tsx`(`vi.useFakeTimers()`. `subscribeSignal`은 받은 `listener`를 변수에 잡아 두는 가짜. `frame = { held: 5, aimX: 180, danger: false, fruits: [{ level: 1, x: 180, y: 529, angle: 0 }] }`):

| 테스트 | 하는 일 | 단언 |
|---|---|---|
| `R22 살아 있는 동안 250ms마다 내 판을 보낸다` | `advance(1000)` | `sendSignal`이 `{ type: 'BOARD', board: 'WAAAAGAPqA' }`로 4번 |
| `R22 탈락하면 바로 한 번, 그 뒤로는 2초마다 보낸다` | `rerender`로 `out: true`, `advance(4000)` | `out` 뒤 호출 3번 |
| `활성이 아니거나 내 판이 없으면 보내지 않는다` | `active: false` / `getFrame = () => null`로 `advance(1000)` | 0번 |
| `R25 남의 판을 받아 돌려준다` | `listener({ gameType: 'FRUIT_STACK', type: 'BOARD', startedAt, playerId: 2, seq: 1, board: 'WAAAAGAPqA' })` | `frameOf(2)`가 `{ held: 5, danger: false }`를 포함하고 과일 1개, `frameOf(3)`은 null |
| `R25 내 신호·다른 경기의 신호·깨진 판·다른 게임의 신호는 버린다` | `playerId: meId` / `startedAt + 1` / `board: 'bad'` / `{ gameType: 'OLD_MAID', type: 'PEEK', … }` | 모두 `frameOf(...)` null |
| `R25 두 판 사이를 250ms 동안 보간한다` | x 100인 판을 받고 `clock += 250` 뒤 x 140인 판을 받은 다음 `clock += 125` | `frameOf(2).fruits[0].x`가 120에 가깝다(±1), `clock += 125` 뒤 140에 가깝다 |
| `동작 줄이기면 보간하지 않는다` | `vi.mock('motion/react', …)`로 `useReducedMotion`이 true | 두 번째 판을 받은 직후 `frameOf(2).fruits[0].x`가 140에 가깝다 |
| `경기가 바뀌면 받은 판을 지운다` | 판을 받은 뒤 `rerender`로 `startedAt + 1000` | `frameOf(2)` null |

- [ ] **Step 2: 실패 확인**

Run: `cd frontend && npx vitest run src/games/fruitstack/useFruitGame.test.tsx src/games/fruitstack/useScoreReporter.test.tsx src/games/fruitstack/useBoardSignals.test.tsx`
Expected: FAIL(모듈 없음).

- [ ] **Step 3: 구현**

위 "동작" 절 그대로 세 훅을 만든다. 지킬 점:
- 판(`FruitGame`), 시작 시각, 효과 목록, 마지막 저장 시각, 받은 판은 모두 `useRef`에 둔다. React 상태는 `hud`와 `hasBoard`뿐이다.
- 반환하는 함수(`getFrame`, `getEffects`, `getAutoDropLeftMs`, `getLocal`, `elapsedMs`, `aim`, `drop`, `onEvents`, `poke`, `frameOf`)는 `useCallback`으로 고정해 렌더가 바뀌어도 같은 함수다(캔버스 고리가 다시 만들어지지 않는다).
- 기본 `ticker`: `document.visibilityState === 'visible'`이면 `requestAnimationFrame` 고리, 아니면 `window.setInterval(run, 1000)`. `visibilitychange`에서 서로 바꾸고, 돌아온 순간 한 번 바로 `run()`. 멈추는 함수가 둘 다 정리한다.
- `runTick`의 걸음 묶음은 30(시간 한도 확인 간격).

- [ ] **Step 4: 통과 확인**

Run: `cd frontend && npx vitest run src/games/fruitstack && npx vitest run && npm run build`
Expected: 전체 통과, 빌드 성공.

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/games/fruitstack/useFruitGame.ts frontend/src/games/fruitstack/useScoreReporter.ts frontend/src/games/fruitstack/useBoardSignals.ts frontend/src/games/fruitstack/useFruitGame.test.tsx frontend/src/games/fruitstack/useScoreReporter.test.tsx frontend/src/games/fruitstack/useBoardSignals.test.tsx
git commit -m "feat: 과일 쌓기 판을 경기 경과 시간에 맞춰 돌리고 저장·복원하며, 점수·탈락을 묶어 보고하고 판 모습을 주고받는 훅을 만든다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: 프론트 화면 부품 — 내 판 입력, 작은 판, 점수 띠, 안내 문구, 진행 기록, 결과 창 (스펙 6.4~6.9, 6.12, R26의 남은 점수 안내)

**Files:**
- Create(모두 `F/games/fruitstack/`): `texts.ts`, `describe.ts`, `MyBoard.tsx`, `MiniBoard.tsx`, `Hud.tsx`, `FruitStackGameOverPanel.tsx`
- Create test: `texts.test.ts`, `describe.test.ts`, `MyBoard.test.tsx`, `MiniBoard.test.tsx`, `Hud.test.tsx`, `FruitStackGameOverPanel.test.tsx`(같은 폴더)

**Interfaces:**
- Consumes:
  - Task 1: `FruitStackView`, `FruitStackSessionView`, `FruitStackPlayerView`, `FruitStackResult`(`{ reason: 'ALL_OUT' | 'DECIDED' | 'TIME_UP' | 'FORFEIT'; standings: { playerId; score; outcome: 'WIN' | 'DRAW' | 'LOSE'; rank; state }[] }`), 픽스처 `fruitView`, `fruitSession`, `fruitPlayer`.
  - Task 7: `BOARD_W = 360`, `fruitName(level)`, `radiusOf(level)`, `BoardFrame`.
  - Task 12: `BoardCanvas`(props `{ width; getFrame; mine?; dimmed?; everyOtherFrame?; getEffects?; getAutoDropLeftMs?; label; role? }`), `FruitIcon`(props `{ level; size; className?; title? }`), `MergeEffect`.
  - 기존: `Nickname = (memberId: number) => string`·`ViewTransition`(`F/games/gameModule.ts`), `LogDraft = { kind; actorId?; text }`(`F/lib/eventLog.ts`, `kind`는 `'start' | 'finish' | 'timeout' | 'result'`를 쓴다), `Room`·`RoomMember`(`F/api/types.ts`), `RollingNumber`(`F/components/RollingNumber.tsx`, props `{ value: number | null; className? }`), `MemberAvatar`(`F/components/Avatar.tsx`, props `{ memberId; avatar?; size }`), `EmoteBubble`(`F/emote/EmoteBubble.tsx`, props `{ memberId; className? }`), `useRemaining(deadline, serverNow): number | null`(`F/components/Countdown.tsx`, 남은 ms), `Modal`·`Confetti`와 `HeadlineIcon({ won })`·`ReadyChips({ members })`·`FooterButton({ guest, onReady, onClose })`(`F/table/gameOver.tsx`). `Modal`·`Confetti`를 쓰는 법은 `F/games/oldmaid/OldMaidGameOverPanel.tsx`와 같다.
- Produces(Task 15가 쓴다):

```ts
// texts.ts
export function aliveIds(game: FruitStackView): number[];                       // state가 PLAYING인 사람(자리 순)
/** R26 (나): 살아 있는 사람이 한 명이고 견줄 사람이 있을 때, 그 사람이 이기려면 더 얻어야 할 점수. 아니면 null. */
export function pointsToWin(game: FruitStackView, aliveScore?: number): { playerId: number; points: number } | null;
export function instructionOf(game: FruitStackView, meId: number, nicknameOf: Nickname, wide: boolean, myScore: number | null): string;
export function formatScore(score: number): string;                             // 1234 → "1,234"
export function formatClock(remainingMs: number | null): string;                // 61000 → "1:01", null → "0:00"

// describe.ts
export function describeFruitStack(prev: FruitStackSessionView | null, next: FruitStackSessionView, nicknameOf: Nickname): LogDraft[];

// MyBoard.tsx
export function MyBoard(props: {
  width: number; getFrame: () => BoardFrame | null; getEffects: () => MergeEffect[]; getAutoDropLeftMs: () => number | null;
  score: number; held: number; out: boolean; catchingUp: boolean; interactive: boolean;
  onAim: (x: number) => void; onDrop: () => void;
}): JSX.Element;

// MiniBoard.tsx
export function MiniBoard(props: {
  width: number; player: FruitStackPlayerView; nickname: string; avatar?: string | null;
  getFrame: () => BoardFrame | null; hasFrame: boolean; danger: boolean; large?: boolean;
  connected?: boolean; offlineSeconds?: number;
}): JSX.Element;

// Hud.tsx
export function Hud(props: { score: number | null; next: number | null; deadline: number | null; serverNow: number; compact?: boolean; vertical?: boolean }): JSX.Element;

// FruitStackGameOverPanel.tsx
export function FruitStackGameOverPanel(props: { game: FruitStackView; room: Room; meId: number; nicknameOf: Nickname; onReady: () => void; onClose: () => void }): JSX.Element;
```

**문구와 규칙(글자 그대로):**

`pointsToWin(game, aliveScore?)`: 살아 있는 사람이 정확히 한 명이 아니면 `null`. 견줄 사람 = `state`가 `OUT`인 사람들(기권한 사람은 뺀다). 없으면 `null`. `points = 견줄 사람의 최고 점수 - (aliveScore ?? 그 사람의 화면 점수) + 1`. 1 미만이면 `null`.

`instructionOf`(위에서부터 먼저 맞는 것, `wide`면 PC 문구):

| 상황 | PC | 좁은 화면 |
|---|---|---|
| `status`가 `GAME_OVER` | 게임이 끝났어요. | 게임이 끝났어요. |
| 내가 `PLAYING`이고 `pointsToWin(game, myScore ?? 내 화면 점수)`가 나를 가리킴 | 혼자 남았어요. {N}점만 더 얻으면 이겨요. | {N}점만 더 얻으면 이겨요 |
| 내가 `PLAYING` | 끌어서 자리를 정하고 놓으면 떨어져요. | 끌어서 놓으면 떨어져요 |
| (내가 `PLAYING`이 아님) `pointsToWin(game)`이 있음 | {닉네임}님이 {N}점만 더 얻으면 이겨요. | {닉네임}님 {N}점 남음 |
| 내가 `OUT` | 판이 가득 찼어요. 남은 사람의 판을 지켜보세요. | 남은 판을 지켜보세요 |
| 그 밖(관전자) | 모두 과일을 쌓는 중… | 과일을 쌓는 중… |

`{N}`은 `formatScore(points)`.

`describeFruitStack`(스펙 6.7): `prev`가 `null`이거나 `prev.game.startedAt !== next.game.startedAt`이면 새 경기다 — `next`가 `IN_PROGRESS`이고 모든 점수가 0일 때만 `{ kind: 'start', text: '새 게임을 시작해요. 과일을 합쳐 점수를 쌓아요' }` 한 줄, 아니면 빈 목록(이미 진행 중이거나 끝난 화면을 처음 받은 경우). 같은 경기면 차례로: (1) `prev`에서 `PLAYING`이고 `next`에서 `OUT`인 사람마다 `{ kind: 'finish', actorId, text: '{닉네임}님의 판이 가득 찼어요 ({N}점)' }`. (2) `prev`가 `IN_PROGRESS`이고 `next`가 `GAME_OVER`면 끝 줄 — 이유 `FORFEIT`: `{ kind: 'result', actorId: 승자, text: '모두 나가서 {닉네임}님이 이겼어요' }` 한 줄. 이유 `TIME_UP`: 먼저 `{ kind: 'timeout', text: '10분이 지나 지금 점수로 끝났어요' }`. 그리고(`TIME_UP`·`ALL_OUT`·`DECIDED`) `winnerId`가 있으면 `{ kind: 'result', actorId: 승자, text: '{닉네임}님이 {N}점으로 이겼어요!' }`, 없으면 `outcome`이 `DRAW`인 사람들(등수 순)로 `{ kind: 'result', text: '{닉네임}님, {닉네임}님이 {N}점으로 비겼어요' }`(닉네임은 `'님, '`로 잇는다). `{N}`은 `formatScore`.

`MyBoard`: 바깥 `div`(`data-testid="my-board"`, `data-no-click-sound`, `tabIndex={0}`, `relative`, 폭 `width`·높이 `width × 1.5`, `touch-action: none`) 안에 `<BoardCanvas mine role="application" width getFrame getEffects getAutoDropLeftMs dimmed={out} label={…} />`. `label` = `내 판. 점수 ${formatScore(score)}점, 들고 있는 과일 ${held > 0 ? fruitName(held) : '없음'}. 좌우 화살표로 자리를 정하고 스페이스로 떨어뜨려요`.
- 포인터 → 물리 x: `(clientX - 바깥 div의 getBoundingClientRect().left) ÷ width × 360`.
- `interactive`가 false면 아래 입력을 모두 무시한다.
- `pointerdown`: `setPointerCapture(pointerId)`(없거나 예외면 넘어간다), `onAim(x)`, "이 누름으로 떨어뜨릴 수 있음" = 누르는 순간 `held > 0`.
- `pointermove`: 누르는 중이거나 `window.matchMedia('(pointer: fine)').matches`이면 `onAim(x)`.
- `pointerup`: 누르는 중이었고 "떨어뜨릴 수 있음"이면 `onAim(x)` 뒤 `onDrop()`. 누름 상태를 지운다.
- `pointercancel`: 누름 상태만 지운다(떨어뜨리지 않는다).
- `keydown`: `ArrowLeft`/`ArrowRight`는 조준 x(마지막으로 `onAim`에 넘긴 값, 처음은 180)에서 12(Shift면 36)를 빼거나 더해 `onAim`, `' '`·`Enter`는 `onDrop()`. 넷 모두 `preventDefault()`.
- `catchingUp`이면 판 위 가운데에 알약 "따라잡는 중…"(`role="status"`).
- `out`이면 판 위 가운데에 `role="status"`로 "가득 찼어요!"와 그 아래 `${formatScore(score)}점`.

`MiniBoard`: 바깥 `div`(`data-testid="mini-board"`, `data-player={playerId}`, `data-state={state}`, 폭 `width`) 안에 판 상자(높이 `width × 1.5`, 테두리 — `danger`이고 `state`가 `PLAYING`이면 붉은 테두리 `data-danger="true"`)와 그 아래 이름 줄(높이 22px).
- `<BoardCanvas width getFrame dimmed={state === 'OUT'} everyOtherFrame={!large} label={…} />`. `label` = `${nickname}님의 판, ${formatScore(score)}점` + (`danger`이고 `PLAYING`이면 `, 위험`) + (`OUT`이면 `, 탈락`).
- `hasFrame`이 false면 판 위 가운데에 "불러오는 중…".
- `state`가 `OUT`이면 판 위에 "탈락" 배지.
- 이름 줄: `MemberAvatar`(크기 16) + 닉네임(넘치면 말줄임) + `${formatScore(score)}점`. `connected === false`면 닉네임 자리에 `연결 끊김 ${offlineSeconds ?? 0}초`.
- 판 상자 위쪽에 `<EmoteBubble memberId={playerId} />`.

`Hud`(`data-testid="fruit-hud"`): `score`가 `null`이 아니면 "점수" + `<RollingNumber value={score} />`를 감싼 `aria-live="polite"` 요소(천 단위 쉼표는 `score < 1000`이면 그대로, 1000 이상이면 `RollingNumber` 대신 `formatScore(score)` 글자). `next`가 `null`이 아니면 "다음" + `<FruitIcon level={next} size={28} title={fruitName(next)} />`. 늘 "남은 시간" + `formatClock(useRemaining(deadline, serverNow))`(남은 시간이 10000 ms 이하면 `data-urgent="true"`와 붉은 글자). `score`와 `next`가 모두 `null`이면 그 자리에 "관전 중". `vertical`이면 세로로 쌓고(`data-vertical="true"`), `compact`면 높이 28px 한 줄.

`FruitStackGameOverPanel`(`Modal` 제목 "게임 결과", `data-testid="fruit-game-over"`):
- 머리말: 내 `outcome`이 `WIN`이면 "내가 이겼어요!", `winnerId`가 있고 내가 아니면 "{닉네임}님이 이겼어요!", `winnerId`가 없으면 "비겼어요!". `HeadlineIcon`의 `won`은 내가 `WIN`일 때 true. 내가 `WIN`이면 `Confetti`.
- 이유 줄(`data-testid="end-reason"`): `TIME_UP` "10분이 지나 지금 점수로 끝났어요", `FORFEIT` "상대가 나가서 게임이 끝났어요", `DECIDED` "마지막 한 사람의 점수가 가장 높아 바로 끝났어요", `ALL_OUT`이면 줄이 없다.
- 순위 표: `standings` 순서로 `li`(`data-testid="standing-row"`, 내 줄은 `data-me="true"`)마다 `${rank}등`, `MemberAvatar`, 닉네임, `${formatScore(score)}점`, 오른쪽 표시 — `WIN`은 메달 아이콘(`MedalIcon`, `F/components/icons.tsx`)과 숨은 글자 "승리", `DRAW`는 "무승부", `state`가 `FORFEITED`면 "기권"(줄 전체를 흐리게), 그 밖에는 없음.
- 아래: `ReadyChips members={room.members}`, `FooterButton guest={room.hostId !== meId} onReady onClose`.

- [ ] **Step 1: 실패하는 테스트 작성**

`F/games/fruitstack/texts.test.ts`(닉네임은 `(id) => `P${id}``):

| 테스트 | 입력 | 단언 |
|---|---|---|
| `두 명 이상 살아 있으면 남은 점수가 없다` | `fruitView()` | `pointsToWin` null, `aliveIds` `[1, 2]` |
| `R26 혼자 남은 사람이 넘어야 할 점수` | `players: [fruitPlayer(1, 20), fruitPlayer(2, 50, 'OUT')]` | `{ playerId: 1, points: 31 }`. `pointsToWin(game, 45)` → `points: 6`. `pointsToWin(game, 50)` → `points: 1`. `pointsToWin(game, 51)` → null |
| `견줄 사람 가운데 가장 높은 점수를 본다` | `participantIds: [1, 2, 3]`, `[fruitPlayer(1, 10), fruitPlayer(2, 50, 'OUT'), fruitPlayer(3, 70, 'OUT')]` | `points: 61` |
| `기권한 사람은 견주지 않는다` | `[fruitPlayer(1, 10), fruitPlayer(2, 90, 'FORFEITED'), fruitPlayer(3, 30, 'OUT')]` / `[fruitPlayer(1, 10), fruitPlayer(2, 90, 'FORFEITED')]` | `points: 21` / null |
| `안내 문구 여섯 가지` | 위 표의 상황마다 `wide` true·false | PC·좁은 화면 문구가 표와 글자 그대로. 예: `instructionOf(혼자 남은 판, 1, nick, true, 45)` = `'혼자 남았어요. 6점만 더 얻으면 이겨요.'`, 같은 판을 2번(탈락)이 보면 `'P1님이 31점만 더 얻으면 이겨요.'`·좁으면 `'P1님 31점 남음'`, 관전자(9)가 두 명 살아 있는 판을 보면 `'모두 과일을 쌓는 중…'` |
| `점수가 이미 넘었으면 보통 문구로 돌아간다` | 혼자 남은 판에 `myScore: 51` | `'끌어서 자리를 정하고 놓으면 떨어져요.'` |
| `점수와 시계 글자` | | `formatScore(0)` `'0'`, `formatScore(1234)` `'1,234'`, `formatClock(61_000)` `'1:01'`, `formatClock(600_000)` `'10:00'`, `formatClock(999)` `'0:01'`, `formatClock(0)` `'0:00'`, `formatClock(null)` `'0:00'`, `formatClock(-5)` `'0:00'` |

(`formatClock`은 올림한 초로 쓴다: `ceil(ms ÷ 1000)`.)

`F/games/fruitstack/describe.test.ts`:

| 테스트 | 단언 |
|---|---|
| `처음 받은 0점 진행 화면은 시작 줄을 쓴다` | `describeFruitStack(null, fruitSession(), nick)` = `[{ kind: 'start', text: '새 게임을 시작해요. 과일을 합쳐 점수를 쌓아요' }]` |
| `진행 중이거나 끝난 화면을 처음 받으면 쓰지 않는다` | 점수가 있는 화면 / `GAME_OVER` 화면 → `[]` |
| `같은 방의 다음 경기는 시작 줄을 쓴다` | `prev`의 `startedAt`과 다른 `next` → 시작 줄 |
| `탈락하면 한 줄을 쓴다` | `[{ kind: 'finish', actorId: 2, text: 'P2님의 판이 가득 찼어요 (1,250점)' }]` |
| `점수만 바뀌면 쓰지 않고 같은 화면 두 번에도 쓰지 않는다` | `[]` |
| `승자 한 명으로 끝나면` | `ALL_OUT`·`DECIDED` 모두 `[…탈락 줄, { kind: 'result', actorId: 1, text: 'P1님이 320점으로 이겼어요!' }]` |
| `시간이 다 되어 비기면` | `[{ kind: 'timeout', text: '10분이 지나 지금 점수로 끝났어요' }, { kind: 'result', text: 'P1님, P2님이 40점으로 비겼어요' }]` |
| `상대가 모두 나가 끝나면` | `[{ kind: 'result', actorId: 1, text: '모두 나가서 P1님이 이겼어요' }]` |
| `기권은 쓰지 않는다` | `PLAYING` → `FORFEITED`만 바뀐 화면 → `[]` |

`F/games/fruitstack/MyBoard.test.tsx`(`getBoundingClientRect`는 `vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')`로 `{ left: 10, top: 0, width: 180, height: 270 }`을 주고 `width={180}`. 포인터는 `fireEvent.pointerDown(board, { clientX, pointerId: 1 })` 꼴):

| 테스트 | 하는 일 | 단언 |
|---|---|---|
| `누르고 끌다 떼면 그 자리에 떨어뜨린다` | `pointerDown` x 100 → `pointerMove` x 145 → `pointerUp` x 145 | `onAim`이 180, 270, 270 순으로, `onDrop` 1번 |
| `들고 있지 않을 때 누른 것으로는 떨어뜨리지 않는다` | `held={0}`으로 누르고, 누른 채 `rerender`로 `held={3}`, 뗌 | `onDrop` 0번 |
| `pointercancel은 떨어뜨리지 않는다` | 누르고 `pointerCancel`, 그 뒤 `pointerUp` | `onDrop` 0번 |
| `정밀 포인터는 누르지 않아도 조준이 따라간다` | `setMediaMatches(true)`로 `pointerMove` x 55 / `setMediaMatches(false)`로 같은 일 | 앞은 `onAim(90)`, 뒤는 호출 없음 |
| `키보드로 조준하고 떨어뜨린다` | `keyDown` `ArrowRight`, `ArrowLeft`(Shift), `' '`, `Enter` | `onAim(192)`, `onAim(156)`, `onDrop` 2번 |
| `입력을 받지 않을 때는 아무것도 하지 않는다` | `interactive={false}`로 누름·뗌·키 | `onAim`·`onDrop` 0번 |
| `따라잡는 중과 탈락 안내` | `catchingUp` / `out score={1250}` | "따라잡는 중…"이 `status`로 보임 / "가득 찼어요!"와 "1,250점" |
| `이름표` | `score={30} held={5}` | `application` 역할의 이름이 `'내 판. 점수 30점, 들고 있는 과일 감. 좌우 화살표로 자리를 정하고 스페이스로 떨어뜨려요'`, 바깥에 `data-no-click-sound` |

`F/games/fruitstack/MiniBoard.test.tsx`: `이름과 점수`("P2", "1,250점", `img` 이름 `'P2님의 판, 1,250점'`), `위험이면 붉은 테두리와 이름표에 위험`(`data-danger="true"`, 이름 `'…, 위험'`), `탈락이면 배지와 이름표에 탈락`("탈락", `data-state="OUT"`, 탈락한 판은 `danger`여도 `data-danger`가 없다), `신호를 못 받았으면 불러오는 중…`, `연결이 끊기면 "연결 끊김 12초"`, `폭과 높이`(판 상자 스타일 `180px`·`270px`).

`F/games/fruitstack/Hud.test.tsx`: `점수·다음 과일·남은 시간`("점수", "128", "다음", `title` "감"인 그림, "남은 시간", `deadline - serverNow = 61_000`이면 "1:01"), `천 점부터 쉼표`("1,234"), `마지막 10초는 급함 표시`(`data-urgent="true"`), `관전자는 "관전 중"`(`score={null} next={null}` → "관전 중"이 있고 "점수"·"다음"이 없다), `세로 띠`(`data-vertical="true"`).

`F/games/fruitstack/FruitStackGameOverPanel.test.tsx`(모달 안 요소는 `await waitFor(...)`. `room`은 방장 1·손님 2인 방 객체):

| 테스트 | 화면 | 단언 |
|---|---|---|
| `내가 이기면` | `winnerId: 1`, `reason: 'ALL_OUT'`, `standings: [{1, 320, WIN, 1, OUT}, {2, 100, LOSE, 2, OUT}]`, `meId = 1` | "내가 이겼어요!", `end-reason` 없음, 줄 2개 — 첫 줄 "1등"·"320점"·"승리"·`data-me="true"`, 방장이므로 "대기실로" 버튼 |
| `남이 이기면` | 같은 화면, `meId = 2` | "P1님이 이겼어요!", "다음 게임 준비" 버튼을 누르면 `onReady` |
| `비기면` | `winnerId: null`, 둘 다 `DRAW`·`rank 1` | "비겼어요!", "무승부"가 2번 |
| `이유 줄 세 가지` | `TIME_UP` / `FORFEIT` / `DECIDED` | 각각 "10분이 지나 지금 점수로 끝났어요" / "상대가 나가서 게임이 끝났어요" / "마지막 한 사람의 점수가 가장 높아 바로 끝났어요" |
| `기권한 사람은 흐리게 "기권"` | `standings`의 마지막이 `state: 'FORFEITED'`·`rank 3` | 그 줄에 "3등"·"기권" |
| `천 단위 쉼표` | 점수 12345 | "12,345점" |

- [ ] **Step 2: 실패 확인**

Run: `cd frontend && npx vitest run src/games/fruitstack/texts.test.ts src/games/fruitstack/describe.test.ts src/games/fruitstack/MyBoard.test.tsx src/games/fruitstack/MiniBoard.test.tsx src/games/fruitstack/Hud.test.tsx src/games/fruitstack/FruitStackGameOverPanel.test.tsx`
Expected: FAIL(모듈 없음).

- [ ] **Step 3: 구현**

위 "문구와 규칙" 절 그대로 여섯 파일을 만든다. 색·간격은 테마 변수와 기존 클래스(`pill`, `paper`, `felt-ink`)를 쓰고, 글자·아이콘에 이모지를 쓰지 않는다.

- [ ] **Step 4: 통과 확인**

Run: `cd frontend && npx vitest run src/games/fruitstack && npx vitest run && npm run build`
Expected: 전체 통과, 빌드 성공.

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/games/fruitstack/texts.ts frontend/src/games/fruitstack/describe.ts frontend/src/games/fruitstack/MyBoard.tsx frontend/src/games/fruitstack/MiniBoard.tsx frontend/src/games/fruitstack/Hud.tsx frontend/src/games/fruitstack/FruitStackGameOverPanel.tsx frontend/src/games/fruitstack/texts.test.ts frontend/src/games/fruitstack/describe.test.ts frontend/src/games/fruitstack/MyBoard.test.tsx frontend/src/games/fruitstack/MiniBoard.test.tsx frontend/src/games/fruitstack/Hud.test.tsx frontend/src/games/fruitstack/FruitStackGameOverPanel.test.tsx
git commit -m "feat: 과일 쌓기 화면 부품을 만든다(끌어서 놓는 내 판, 상대의 작은 판, 점수 띠, 혼자 남았을 때 남은 점수 안내, 진행 기록, 결과 창)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: 프론트 — 테이블 조립, 규칙, 상자 그림, 등록, 컴퓨터 메뉴 감추기 (스펙 6.4·6.8·6.10·6.11, R36)

**Files:**
- Create(모두 `F/games/fruitstack/`): `useBoardBox.ts`, `FruitStackTable.tsx`, `rules.ts`, `FruitStackBoxArt.tsx`, `module.tsx`
- Modify: `F/games/registry.ts`, `F/pages/RoomPage.tsx`
- Create test: `F/games/fruitstack/FruitStackTable.test.tsx`, `F/games/fruitstack/rules.test.tsx`, `F/games/fruitstack/FruitStackBoxArt.test.tsx`
- Modify test: `F/games/catalog.test.ts`, `F/games/registry.test.ts`, `F/pages/RoomPage.test.tsx`

**Interfaces:**
- Consumes:
  - Task 1: `FruitStackSessionView`, `FruitStackView`, 픽스처 `fruitSession`, `fruitView`, `fruitPlayer`, `FRUIT_STARTED_AT`.
  - Task 11: `TableProps<V>`(칸 `view, room, meId, log, receivedAt, now, errorSeq, nicknameOf, send, onCloseGameOver, onReadyNext, transition?, signal?, sendSignal?, subscribeSignal?, aside?, asideFooter?`), `GameModule<V>`(칸 `gameType, name, slug, tagline, minPlayers, maxPlayers, supportsBots?, Table, describeChanges, isGameOver, wasParticipant, gameOverKey, rules: { title, summary, slides, renderArt }, BoxArt, averageScoreLabel, roundScoreText?, stepKey, isStaleRejection?`), `RuleSlideBase = { title: string; body: string[] }`, 소리 `'merge'`.
  - Task 12: `fitBoard({ layout, box, mode, big, mini }): { bigWidth, miniWidth, bigCols, miniCols }`, `FruitIcon({ level, size, title? })`.
  - Task 13: `useFruitGame({ code, meId, game }): { hasBoard, hud: { score, held, next, danger, out, catchingUp }, getFrame, getEffects, getAutoDropLeftMs, getLocal, elapsedMs, aim, drop, onEvents }`, `useScoreReporter({ send, connected, game, meId, errorSeq, getLocal, elapsedMs }): { poke }`, `useBoardSignals({ sendSignal, subscribeSignal, startedAt, meId, getFrame, out, active }): { frameOf }`.
  - Task 14: `MyBoard`, `MiniBoard`, `Hud`, `FruitStackGameOverPanel`, `instructionOf(game, meId, nicknameOf, wide, myScore)`, `aliveIds(game)`, `describeFruitStack(prev, next, nicknameOf)`.
  - 기존: `useTableLayout()`(`F/lib/useTableLayout.ts`), `useRealtime()`(`F/realtime/RealtimeContext.tsx`, `connected`), `TurnBar`(`F/table/TurnBar.tsx`, props `{ instruction, myTurn, log, nicknameOf, deadline, serverNow, compact, stacked, locked }`), `useFinalePhase(game, transition, instant)`(`F/table/useFinalePhase.ts`, 반환 `'playing' | 'flying' | 'banner' | 'done'`), `GameEndBanner`(`F/table/GameEndBanner.tsx`), `liveGameEnd(game, transition)`·`useGameOverCue(ended, ready, won)`(`F/table/gameOver.tsx`), `seatOrder(playerIds, meId)`(`F/table/seats.ts`, 내 다음 사람부터 도는 순서. 내가 없으면 그대로), `EmoteDock({ meId, className })`(`F/emote/EmoteDock.tsx`), `roomAvatarOf(room, memberId)`(`F/lib/avatars.ts`), `useSound()`(`F/lib/sound.tsx`, `play(name)`), `useReducedMotion`(`motion/react`).
- Produces: `fruitStackModule: GameModule<FruitStackSessionView>`, `GAME_ORDER = ['PAPER_SAFARI', 'UNO', 'OLD_MAID', 'FRUIT_STACK']`, `GAMES.FRUIT_STACK`. 이 작업 뒤 선반·로비·방·전적에 과일 쌓기가 나온다.

**동작(글자 그대로):**

`useBoardBox(layout): { ref: RefObject<HTMLDivElement | null>; box: { w: number; h: number } }` — `ref`를 단 요소의 폭(`clientWidth`)과 `window.innerHeight - getBoundingClientRect().top - 아래 여백`(아래 여백: `pc` 24, `portrait` 8, `landscape` 4)을 잰다. `ResizeObserver`(있으면)와 `window`의 `resize`에서 다시 잰다. 잰 폭이나 높이가 0 이하면(jsdom, 첫 렌더) 배치별 기본 상자를 쓴다: `pc` 844×660, `portrait` 328×500, `landscape` 632×326.

`FruitStackTable`(`TableProps<FruitStackSessionView>`):
- `game = view.game`, `layout = useTableLayout()`, `wide = layout === 'pc'`.
- 훅: `fruit = useFruitGame({ code: room.code, meId, game })`. `reporter = useScoreReporter({ send, connected: useRealtime().connected, game, meId, errorSeq, getLocal: fruit.getLocal, elapsedMs: fruit.elapsedMs })`. `boards = useBoardSignals({ sendSignal, subscribeSignal, startedAt: game.startedAt, meId, getFrame: fruit.getFrame, out: fruit.hud.out, active: game.status === 'IN_PROGRESS' && fruit.hasBoard })`.
- 알림(`fruit.onEvents`): 알림 묶음마다 `reporter.poke()`. 소리 — `drop`·`autoDrop`은 `'place'`, `merge`는 `'merge'`(마지막으로 낸 지 80 ms가 안 됐으면 건너뛴다), `out`은 `'roundLose'`.
- 자동 떨어뜨리기 3초 전 소리: 200 ms 타이머로 `fruit.getAutoDropLeftMs()`를 보고, 3000 이하로 처음 내려간 때 `'tick'`을 한 번 낸다(값이 `null`이거나 3000보다 커지면 다시 낼 수 있게 된다).
- 모드: 내 화면 줄의 `state`가 `PLAYING`이고 `fruit.hasBoard`이고 "탈락 안내가 끝남"이 아니면 `play`, 아니면 `watch`. "탈락 안내가 끝남" = `fruit.hud.out`이 true가 된 뒤 1500 ms(동작 줄이기면 0 ms)가 지남. 그사이에는 `play` 배치 그대로 내 판에 "가득 찼어요!"가 보인다.
- 판 나누기: `others = seatOrder(game.participantIds, meId)`에서 나를 뺀 사람들. `play` — 큰 판 = 나, 작은 판 = `others` 가운데 `state`가 `FORFEITED`가 아닌 사람. `watch` — 큰 판 = `aliveIds(game)`(한 명도 없으면 기권하지 않은 모든 참가자), 작은 판 = 기권하지 않은 나머지(내 판이 있으면 나 포함).
- 판의 모습: 나는 `fruit.getFrame`, 남은 `() => boards.frameOf(id)`. `hasFrame`·`danger`는 250 ms 타이머로 `frameOf(id)`를 읽어 상태에 둔다(값이 바뀔 때만 갱신).
- 크기: `const { ref, box } = useBoardBox(layout)`, `fit = fitBoard({ layout, box, mode, big: 큰 판 수, mini: 작은 판 수 })`.
- 그리기:
  - `TurnBar`: `instruction={instructionOf(game, meId, nicknameOf, wide, fruit.getLocal()?.score ?? null)}`, `myTurn={false}`, `deadline={game.deadline}`, `serverNow={game.serverNow}`, `compact={!wide}`, `stacked={layout === 'landscape'}`, `locked={finale !== 'playing'}`.
  - `Hud`: `play`면 `score={fruit.hud.score}`·`next={fruit.hud.held > 0 || !fruit.hud.out ? fruit.hud.next : null}`, 내 판이 없으면(관전자) `score={null} next={null}`, 내가 탈락했으면 `score={fruit.hud.score} next={null}`. `landscape`에서 `play`면 `vertical`, `watch`면 `compact`.
  - 내 큰 판(`play`): `relative` 상자 안에 `<EmoteDock meId={meId} className="-top-3 left-1" />`와 `<MyBoard width={fit.bigWidth} … interactive={game.status === 'IN_PROGRESS' && !fruit.hud.out && !fruit.hud.catchingUp} onAim={fruit.aim} onDrop={fruit.drop} />`.
  - 남의 큰 판(`watch`): `<MiniBoard large width={fit.bigWidth} … />`. 작은 판: `<MiniBoard width={fit.miniWidth} … />`. `connected`·`offlineSeconds`는 `room.members`에서 그 사람을 찾아 넘긴다(없으면 넘기지 않는다).
  - 배치(스펙 6.4): `pc`·`play` — 왼쪽 작은 판 줄 | (점수 띠 + 내 판) | 오른쪽 작은 판 줄(작은 판 1개 → 오른쪽 1, 2개 → 왼쪽 1·오른쪽 1, 3개 → 왼쪽 1·오른쪽 2, 4개 → 왼쪽 2·오른쪽 2). `portrait`·`play` — 작은 판 한 줄, 점수 띠, 내 판. `landscape`·`play` — 세로 점수 띠 | 내 판 | 작은 판 격자(`fit.miniCols`칸). `watch` — 점수 띠, 큰 판 격자(`fit.bigCols`칸), 작은 판 한 줄(`landscape`는 오른쪽 세로 한 줄, `portrait`는 큰 판 위).
  - 바깥: `<div ref data-testid="fruit-table" data-layout={layout} data-mode={mode} inert={finale !== 'playing'}>`. `landscape`면 기존 게임처럼 `grid grid-cols-[10.5rem_minmax(0,1fr)]`의 왼쪽 칸에 `{aside}{turnBar}{asideFooter}`, 오른쪽에 몸통. 아니면 `turnBar` 아래 몸통.
- 끝: `finale = useFinalePhase(game, transition, game.result?.reason === 'FORFEIT')`. `useGameOverCue(liveGameEnd(game, transition), finale === 'banner' || finale === 'done', game.winnerId === meId)`. `finale === 'banner'`이면 `<GameEndBanner />`를 더 그리고, `finale === 'done'`이고 `status`가 `GAME_OVER`면 테이블 대신 `<FruitStackGameOverPanel game room meId nicknameOf onReady={onReadyNext} onClose={onCloseGameOver} />`만 그린다.

`rules.ts`: `export type FruitRuleSlide = RuleSlideBase & { fruits: number[] }`, `FRUIT_RULE_SLIDES`(6장, 아래 그대로), `FRUIT_RULE_SUMMARY`.

| 제목 | 본문 두 줄 | `fruits` |
|---|---|---|
| 목표 | "같은 과일 두 개를 붙여 더 큰 과일로 합쳐요." / "합칠 때마다 점수를 얻고, 끝났을 때 점수가 가장 높은 사람이 이겨요." | `[1, 1, 2]` |
| 과일 | "체리부터 수박까지 11가지예요. 큰 과일을 합칠수록 점수가 커요." / "떨어뜨릴 과일은 작은 다섯 가지(체리·딸기·포도·귤·감) 중에서 나오고, 모두 같은 순서로 받아요." | `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]` |
| 떨어뜨리기 | "내 판을 끌어 자리를 정하고 손을 떼면 떨어져요." / "10초 안에 떨어뜨리지 않으면 그 자리에 저절로 떨어져요." | `[4]` |
| 탈락 | "과일이 위쪽 선을 2초 넘게 넘어 있으면 판이 가득 찬 거예요." / "가득 차도 내 점수는 그대로 남고, 남은 사람들의 판을 크게 지켜봐요." | `[5, 6]` |
| 끝 | "모두 가득 차거나 10분이 지나면 끝나요. 한 사람만 남았을 때 그 사람 점수가 가장 높으면 바로 끝나요." / "가장 높은 점수가 이기고, 가장 높은 점수가 같으면 그 사람들끼리 비겨요." | `[11]` |
| 나가기와 끊김 | "게임 중에 나가면 기권이라 점수와 상관없이 져요." / "연결이 잠깐 끊겨도 내 판은 계속 움직여요. 60초 넘게 끊기면 기권이 돼요." | `[]` |

요약 4줄: "같은 과일 두 개를 합쳐 점수를 쌓아요.", "10초 안에 떨어뜨리지 않으면 저절로 떨어져요.", "과일이 선을 2초 넘게 넘으면 탈락이에요.", "가장 높은 점수가 이겨요."

`FruitStackBoxArt`: 다른 상자 그림(`F/games/oldmaid/OldMaidBoxArt.tsx`)과 같은 바깥 크기·`aria-hidden`의 `svg`/`div`. 연두색(`#CDE8A8`) 바탕 위에 `FruitIcon`을 아래부터 수박(11, 크기 72) · 그 위에 멜론(10, 56)과 복숭아(8, 44) · 그 위에 귤(4, 30) · 맨 위 체리(1, 20)로 쌓고, 아래에 "과일 쌓기" 글자(흰 글자, 어두운 테두리). `data-testid="fruit-box-art"`.

`module.tsx`:

```tsx
import type { FruitStackSessionView } from '../../api/types';
import type { GameModule, RuleSlideBase } from '../gameModule';
import { describeFruitStack } from './describe';
import { FruitIcon } from './FruitIcon';
import { FruitStackBoxArt } from './FruitStackBoxArt';
import { FruitStackTable } from './FruitStackTable';
import { FRUIT_RULE_SLIDES, FRUIT_RULE_SUMMARY, type FruitRuleSlide } from './rules';

function renderArt(slide: RuleSlideBase) {
  return (slide as FruitRuleSlide).fruits.map((level, index) => <FruitIcon key={`${level}-${index}`} level={level} size={44} />);
}

export const fruitStackModule: GameModule<FruitStackSessionView> = {
  gameType: 'FRUIT_STACK',
  name: '과일 쌓기',
  slug: 'fruit-stack',
  tagline: '2~5인 · 합쳐서 점수를 쌓아라!',
  minPlayers: 2,
  maxPlayers: 5,
  // R35·R36: 물리가 브라우저에서 돌아 컴퓨터가 대신 둘 수 없다.
  supportsBots: false,
  Table: FruitStackTable,
  describeChanges: describeFruitStack,
  isGameOver: (view) => view.game.status === 'GAME_OVER',
  wasParticipant: (view, meId) => view.game.participantIds.includes(meId),
  gameOverKey: (code, view) => `${code}:FRUIT_STACK:${view.game.startedAt}`,
  // 이 게임의 행동(SCORE·OUT)은 훅이 보내는 보고라 거절은 모두 조용한 코드다. 걸음은 경기 하나다.
  stepKey: ({ game }) => `${game.status}:${game.startedAt}`,
  rules: { title: '과일 쌓기 규칙', summary: FRUIT_RULE_SUMMARY, slides: FRUIT_RULE_SLIDES, renderArt },
  BoxArt: FruitStackBoxArt,
  averageScoreLabel: '평균 점수',
};
```

`F/games/registry.ts`: `import { fruitStackModule } from './fruitstack/module';`, `GAME_ORDER`를 `['PAPER_SAFARI', 'UNO', 'OLD_MAID', 'FRUIT_STACK']`로, `GAMES`에 `FRUIT_STACK: fruitStackModule,`.

`F/pages/RoomPage.tsx`(R36): `const Table = game.Table;` 근처에 `const botsAllowed = game.supportsBots !== false;`를 두고 `WaitingRoom`의 두 props를 `onAddBot={botsAllowed ? (difficulty) => run(() => roomsApi.addBot(code, difficulty)) : undefined}`, `onChangeBot={botsAllowed ? (botId, difficulty) => run(() => roomsApi.changeBot(code, botId, difficulty)) : undefined}`로 바꾼다. `WaitingRoom`·`MemberList`·`SeatMenu`는 고치지 않는다(`onAddBot`이 없으면 이미 "친구 초대"만 보이고 여분 의자도 그리지 않는다).

- [ ] **Step 1: 실패하는 테스트 작성**

`F/games/fruitstack/FruitStackTable.test.tsx` — 맨 위에 `vi.mock('../../realtime/RealtimeContext', () => ({ useRealtime: () => ({ connected: true, realtime: {} }) }));`. `renderTable(overrides)` 도우미가 `<FruitStackTable view={fruitSession(…)} room={방장 1·손님 2(·3)인 대기 아닌 방} meId={1} log={[]} receivedAt={0} now={0} errorSeq={0} nicknameOf={(id) => `P${id}`} send={send} sendSignal={sendSignal} subscribeSignal={subscribe} onCloseGameOver={…} onReadyNext={…} transition={null} />`를 그린다. `subscribe`는 받은 `listener`를 잡아 두는 가짜. 배치는 `setMediaMatches`로 고른다.

| 테스트 | 준비 | 단언 |
|---|---|---|
| `PC: 내 판이 크게, 상대는 작은 판으로 보인다` | `setMediaMatches(true)`, 기본 화면 | `fruit-table`의 `data-layout="pc"`·`data-mode="play"`, `my-board` 1개(폭 400px), `mini-board` 1개(`data-player="2"`), `fruit-hud`에 "점수"·"다음"·"남은 시간", 안내 "끌어서 자리를 정하고 놓으면 떨어져요." |
| `세로와 가로 배치` | `setMediaMatches(false)` / `setMediaMatches((query) => query === LANDSCAPE_PHONE_QUERY)` | `data-layout`이 `portrait`(안내 "끌어서 놓으면 떨어져요", 내 판 폭 220px) / `landscape`(`fruit-hud`의 `data-vertical="true"`, `aside`로 넘긴 요소가 그려짐) |
| `상대 4명이면 작은 판이 4개다` | `participantIds: [1, 2, 3, 4, 5]`와 다섯 사람 | `mini-board` 4개, 순서(`data-player`)가 2, 3, 4, 5 |
| `기권한 사람의 판은 그리지 않는다` | 3번이 `FORFEITED` | `mini-board`가 2번 하나뿐 |
| `관전자는 지켜보기 모드로 살아 있는 판을 크게 본다` | `meId = 9` | `data-mode="watch"`, `my-board` 없음, `mini-board` 2개, `fruit-hud`에 "관전 중", 안내 "모두 과일을 쌓는 중…" |
| `받은 판 신호가 없으면 불러오는 중, 받으면 사라진다` | 기본 화면 → `listener({ gameType: 'FRUIT_STACK', type: 'BOARD', startedAt: FRUIT_STARTED_AT, playerId: 2, seq: 1, board: 'WAAAAGAPqA' })` 뒤 가짜 타이머 300 ms | 처음 "불러오는 중…" 있음 → 없음 |
| `위험한 상대 판은 붉은 테두리다` | 위험 비트가 선 판(`'WAIAA'`)을 받고 300 ms | 2번 `mini-board`에 `data-danger="true"` |
| `R22 내 판 모습을 250ms마다 보낸다` | 가짜 타이머 1000 ms | `sendSignal`이 `{ type: 'BOARD', board: expect.stringMatching(/^[A-Za-z0-9_-]{5,}$/) }`로 4번 |
| `내가 탈락하면 안내 뒤 지켜보기로 바뀐다` | `rerender`로 내 `state: 'OUT'`·점수 40 | 바로 "가득 찼어요!"와 "40점", `data-mode="play"`. 가짜 타이머 1500 ms 뒤 `data-mode="watch"`, `my-board` 없음, `mini-board`가 2번(큰 판)과 1번(작은 판, "탈락") |
| `R26 혼자 남으면 남은 점수를 알려 준다` | `players: [fruitPlayer(1, 20), fruitPlayer(2, 50, 'OUT')]` / 같은 화면을 `meId = 2`로 | "혼자 남았어요. 31점만 더 얻으면 이겨요." / (1500 ms 뒤) "P1님이 31점만 더 얻으면 이겨요." |
| `떨어뜨리면 소리가 나고 점수는 보고하지 않는다` | `SoundContext`의 `play` 가짜, `my-board`에서 `pointerDown`·`pointerUp` | `play('place')`, `send` 0번 |
| `끝난 화면을 처음 받으면 바로 결과 창이다` | `status: 'GAME_OVER'`, 결과 있는 화면, `transition={null}` | `fruit-game-over`가 보이고(`waitFor`) `fruit-table`은 없다 |
| `게임 중에 끝나면 "게임 끝!" 뒤에 결과 창이 열린다` | 진행 화면을 그린 뒤 `rerender`로 끝난 화면 + `transition={{ seq: 2, from: 진행 화면의 game, to: 끝난 화면의 game, animate: true }}`, 가짜 타이머 | 450 ms 뒤 `game-end-banner`, 다시 1800 ms 뒤 `fruit-game-over` |
| `상대가 나가 끝나면 배너 없이 결과 창이다` | 위와 같되 `reason: 'FORFEIT'` | 곧바로 `fruit-game-over`, `game-end-banner` 없음 |

`F/games/fruitstack/rules.test.tsx`: `규칙은 6장이고 제목이 순서대로다`(`['목표', '과일', '떨어뜨리기', '탈락', '끝', '나가기와 끊김']`), `본문은 장마다 두 줄이다`, `끝 장은 일찍 끝나는 규칙을 말한다`(`body[0]`에 "한 사람만 남았을 때 그 사람 점수가 가장 높으면 바로 끝나요"), `요약은 4줄이다`, `어디에도 "수박게임"이라고 쓰지 않는다`(모든 제목·본문·요약에 그 글자가 없다), `모듈의 renderArt가 장의 과일 수만큼 그림을 그린다`(`render(<>{fruitStackModule.rules.renderArt(FRUIT_RULE_SLIDES[1])}</>)` → `svg` 11개).

`F/games/fruitstack/FruitStackBoxArt.test.tsx`: `fruit-box-art` 안에 `svg`(과일 그림) 5개 이상과 글자 "과일 쌓기".

`F/games/catalog.test.ts`: 소개 문구 배열 단언을 `['2~5인 · 낮은 점수를 노려라!', '2~5인 · 손패를 먼저 비워라!', '2~6인 · 조커를 피해라!', '2~5인 · 합쳐서 점수를 쌓아라!']`로 바꾸고 테스트를 더한다:

```ts
  it('과일 쌓기 로비 주소', () => {
    expect(lobbyPath('FRUIT_STACK')).toBe('/games/fruit-stack');
    expect(entryBySlug('fruit-stack')?.gameType).toBe('FRUIT_STACK');
  });
```

`F/games/registry.test.ts`: `expect(GAME_ORDER).toEqual(['PAPER_SAFARI', 'UNO', 'OLD_MAID'])`를 `expect(GAME_ORDER.slice(0, 3)).toEqual(['PAPER_SAFARI', 'UNO', 'OLD_MAID'])`로 바꾸고 테스트를 더한다:

```ts
  it('과일 쌓기 모듈이 네 번째로 등록되어 있다', () => {
    expect(GAME_ORDER).toEqual(['PAPER_SAFARI', 'UNO', 'OLD_MAID', 'FRUIT_STACK']);
    const game = gameOf('FRUIT_STACK');
    expect(game).toMatchObject({ name: '과일 쌓기', slug: 'fruit-stack', minPlayers: 2, maxPlayers: 5, supportsBots: false, averageScoreLabel: '평균 점수' });
    expect(game.rules.title).toBe('과일 쌓기 규칙');
    expect(game.rules.slides).toHaveLength(6);
    expect(game.roundScoreText).toBeUndefined();
    const view = { gameType: 'FRUIT_STACK', game: { status: 'GAME_OVER', startedAt: 77, participantIds: [1, 2] } };
    expect(game.isGameOver(view)).toBe(true);
    expect(game.wasParticipant(view, 2)).toBe(true);
    expect(game.wasParticipant(view, 9)).toBe(false);
    expect(game.gameOverKey('ABCDEF', view)).toBe('ABCDEF:FRUIT_STACK:77');
    expect(game.stepKey(view)).toBe('GAME_OVER:77');
    expect(gameOf('UNO').supportsBots).toBeUndefined();
  });
```

`F/pages/RoomPage.test.tsx`: 그 파일의 대기실 테스트가 쓰는 준비(방 응답·로그인한 방장)를 그대로 써서 두 테스트를 더한다 — `R36 과일 쌓기 방의 대기실에는 컴퓨터를 앉히는 길이 없다`(방의 `gameType: 'FRUIT_STACK'`, `gameTypeName: '과일 쌓기'`, 방장으로 들어가 빈자리 버튼이 있으면 누른 뒤 `screen.queryByText('컴퓨터와 하기')`와 `screen.queryByLabelText('빈자리에 컴퓨터 추가')`가 모두 `null`)와 `우노 방의 대기실에는 그대로 컴퓨터를 앉히는 길이 있다`(같은 준비에 `gameType: 'UNO'`, 빈자리를 누르면 "컴퓨터와 하기"가 보인다. 이미 같은 단언을 하는 테스트가 그 파일에 있으면 더하지 않는다).

- [ ] **Step 2: 실패 확인**

Run: `cd frontend && npx vitest run src/games/fruitstack src/games/catalog.test.ts src/games/registry.test.ts src/pages/RoomPage.test.tsx`
Expected: FAIL(모듈 없음, 등록 전).

- [ ] **Step 3: 구현**

위 "동작" 절 그대로 만든다. `FruitStackTable`에서 타이머로 읽는 값(`hasFrame`, `danger`, 탈락 안내 지연, 3초 전 소리)은 각각 작은 훅으로 나눠 테이블 본문이 배치만 다루게 한다. 캔버스·판은 훅의 ref에 있으므로 화면(`view`)이 초당 여러 번 바뀌어도 다시 만들어지지 않는다.

- [ ] **Step 4: 전체 통과 확인**

Run: `cd frontend && npx vitest run && npm run build`
Expected: 전체 통과, 빌드 성공. 게임이 4개가 되어 깨지는 다른 기존 테스트(게임 선반·로비·전적 탭이 게임 수나 목록 전체를 단언하는 곳)가 있으면 과일 쌓기 항목을 더하는 만큼만 고치고, 고친 파일을 커밋에 넣는다. 그 밖의 기존 단언은 바꾸지 않는다.

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/games/fruitstack/useBoardBox.ts frontend/src/games/fruitstack/FruitStackTable.tsx frontend/src/games/fruitstack/FruitStackTable.test.tsx frontend/src/games/fruitstack/rules.ts frontend/src/games/fruitstack/rules.test.tsx frontend/src/games/fruitstack/FruitStackBoxArt.tsx frontend/src/games/fruitstack/FruitStackBoxArt.test.tsx frontend/src/games/fruitstack/module.tsx frontend/src/games/registry.ts frontend/src/games/registry.test.ts frontend/src/games/catalog.test.ts frontend/src/pages/RoomPage.tsx frontend/src/pages/RoomPage.test.tsx
git commit -m "feat: 과일 쌓기를 게임 목록에 올린다(테이블 조립, 규칙 6장, 상자 그림, 등록, 대기실 빈자리 메뉴에서 컴퓨터 감추기)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(Step 4에서 고친 다른 테스트 파일이 있으면 `git add`에 그 경로를 더한다.)

---

### Task 16: 실제 브라우저 확인 (스펙 7.3의 최종 확인)

**Files:**
- 제품 코드를 고치지 않는다. 문제를 찾으면 고치지 말고 "무엇을 했더니 무엇이 보였는지, 기대는 무엇이었는지"를 적어 알린다(고치는 일은 새 작업으로 받는다).
- Create: `docs/superpowers/research/2026-10-13-fruit-stack-browser-check.md`(확인 기록)

**Interfaces:**
- Consumes: Task 6(백엔드 전체)과 Task 15(프론트 전체)가 끝난 `feat/fruit-stack`.
- Produces: 아래 표의 항목마다 "통과 / 실패(본 것)"와 화면 크기, 프레임 수치를 적은 확인 기록.

- [ ] **Step 1: 띄우기**

Run(터미널 둘): `cd backend && mvn -q spring-boot:run`(8899), `cd frontend && npm run dev`(5177). 계정 셋(A·B·C)을 가입해 둔다. 브라우저는 계정마다 따로 띄운다(창 하나는 시크릿 창이 아니라 다른 프로필·다른 브라우저로. 같은 브라우저의 탭 둘은 로그인을 나눠 쓴다).

- [ ] **Step 2: 두 계정으로 한 판을 끝까지**

| # | 하는 일 | 기대 |
|---|---|---|
| 1 | 게임 선반 | 네 번째로 "과일 쌓기" 상자 그림과 "2~5인 · 합쳐서 점수를 쌓아라!", "규칙 보기"에 6장 |
| 2 | A가 과일 쌓기 방을 만든다 | 정원 고르기가 2~5, 대기실 규칙 요약 4줄 |
| 3 | A가 빈자리를 누른다 | 메뉴에 "친구 초대"만 있다("컴퓨터와 하기" 없음, 꽉 찬 방에 "컴퓨터 추가" 의자 없음) |
| 4 | B가 들어와 준비, A가 시작 | 3-2-1 카운트다운 뒤 두 사람 모두 같은 첫 과일을 든다. 다음 과일도 같다 |
| 5 | A가 끌어서 놓는다 | 놓은 자리에 떨어지고 0.5초 뒤 다음 과일을 든다. 놓는 소리가 난다 |
| 6 | A가 같은 과일 둘을 붙인다 | 합쳐져 다음 단계가 되고 점수가 오른다. B의 화면에서 A의 점수가 1초 안에 따라온다 |
| 7 | B가 10초 동안 가만히 있는다 | 남은 3초부터 숫자가 뜨고 저절로 떨어진다 |
| 8 | B의 화면에서 A의 작은 판 | 초당 네 번쯤 부드럽게 따라 움직이고, A가 드는 과일과 조준 자리도 보인다 |
| 9 | 감정 표현 | 내 판 모서리 버튼으로 보내면 상대의 작은 판 이름표 위에 뜬다 |
| 10 | A가 과일을 선 위로 쌓아 2초를 넘긴다 | 선이 붉게 깜박이다가 "가득 찼어요!"와 점수, 1.5초 뒤 B의 판을 크게 본다. B의 화면에서 A의 판이 흐려지고 "탈락" |
| 11 | (일찍 끝내기) B의 점수가 A보다 낮을 때 | B의 안내가 "혼자 남았어요. N점만 더 얻으면 이겨요."이고 합칠 때마다 N이 준다. A의 안내는 "{B}님이 N점만 더 얻으면 이겨요." |
| 12 | B가 A의 점수를 넘긴다 | 그 순간 두 화면에 "게임 끝!" 뒤 결과 창: B 1등, 이유 줄 "마지막 한 사람의 점수가 가장 높아 바로 끝났어요" |
| 13 | (일찍 끝내기, 다른 판) B의 점수가 이미 더 높을 때 A가 탈락한다 | A가 탈락하는 순간 바로 끝난다 |
| 14 | 결과 창 | 순위·점수·"다음 게임 준비"/"대기실로", 다시 시작하면 과일 순서가 앞 판과 다르다 |
| 15 | 전적 페이지 | 과일 쌓기 탭, 승·패, "평균 점수" |

- [ ] **Step 3: 이어 하기·끊김·끝나는 다른 길**

| # | 하는 일 | 기대 |
|---|---|---|
| 16 | 게임 중에 A가 새로고침 | 과일들이 (1초 안쪽 전 모습으로) 그대로 있고 점수가 줄지 않는다. 잠깐 "따라잡는 중…"이 보일 수 있다 |
| 17 | A가 탭을 15초 가렸다 돌아온다 | 그동안의 자동 떨어뜨리기가 반영되어 있다. B의 화면에서 A의 판은 그동안에도(느리게라도) 움직였다 |
| 18 | A의 네트워크를 10초 끊었다 잇는다(개발자 도구 오프라인) | 끊긴 동안 A의 판은 계속 돈다. 이으면 A의 점수가 B의 화면에 따라온다. "점수를 반영할 수 없어요." 같은 알림이 뜨지 않는다 |
| 19 | 탈락한 A가 방을 나간다 | 게임은 이어지고 A의 점수로 승패가 가려진다 |
| 20 | 살아 있는 A가 방을 나간다(2명) | B에게 곧바로 결과 창: "상대가 나가서 게임이 끝났어요" |
| 21 | 세 계정, C가 게임 중에 관전 입장 | 살아 있는 판들을 크게 보고, 탈락한 판은 2초 안에 나타난다 |
| 22 | 서버의 경기 상한을 확인: 두 사람이 탈락하지 않고 10분 | 10분에 "게임 끝!" 뒤 결과 창, 이유 줄 "10분이 지나 지금 점수로 끝났어요" |

- [ ] **Step 4: 배치**

| # | 화면 | 기대 |
|---|---|---|
| 23 | PC 1280×860, 상대 1명과 4명(계정이 모자라면 5명 방을 3명으로 채우고 개발자 도구에서 창 크기만 맞춘다) | 스크롤 없이 한 화면: 가운데 내 판, 양옆 작은 판, 오른쪽 채팅 |
| 24 | 휴대폰 세로 360×640과 390×844(개발자 도구 기기 모드, 터치) | 가로 스크롤 없음. 작은 판 한 줄·점수 띠·내 판이 스크롤 없이 보이고 채팅 줄만 아래로 내려갈 수 있다. 손가락으로 끌어 놓기가 된다(끄는 동안 페이지가 따라 움직이지 않는다) |
| 25 | 휴대폰 가로 844×390 | 왼쪽 칸(상태 바·안내·채팅)과 오른쪽(세로 점수 띠·내 판·작은 판)이 스크롤 없이 한 화면 |
| 26 | 탈락 뒤 지켜보기 배치를 세 화면에서 | 살아 있는 판이 크게, 탈락한 판이 작게, 넘침 없음 |
| 27 | 동작 줄이기(운영체제 설정 또는 개발자 도구 렌더링 탭) | 합치기 고리·선 깜박임이 없고 상대 판이 보간 없이 바뀐다 |
| 28 | 테마 다섯 가지 | 판·글자가 읽힌다 |

- [ ] **Step 5: 과일이 많을 때의 프레임**

휴대폰(실제 기기가 있으면 실제 기기, 없으면 개발자 도구의 CPU 4배 느리게 + 기기 모드)과 PC에서, 한 판을 과일 40개 이상이 쌓일 때까지 한다(작은 과일을 벽 쪽에 번갈아 쌓으면 빨리 찬다). 개발자 도구 성능 탭이나 프레임 표시로 본다.

| # | 볼 것 | 기대 |
|---|---|---|
| 29 | PC, 과일 40개 이상, 상대 4명 | 초당 55프레임 이상 |
| 30 | 휴대폰(또는 CPU 4배 느리게), 과일 40개 이상 | 초당 30프레임 이상이고 "따라잡는 중…"이 계속 떠 있지 않다. 못 미치면 수치와 과일 수를 적는다(스펙의 받아들인 한계, 고칠지는 따로 정한다) |
| 31 | 10분 한 판 동안 메모리 | 계속 늘지 않는다 |

- [ ] **Step 6: 기존 게임 회귀와 기록**

페이퍼 사파리·우노·도둑잡기를 한 판씩(컴퓨터와) 끝까지 한다: 카드 고르기·도둑잡기 고르는 카드 들림(신호)·결과 창·컴퓨터 추가가 전과 같다. 확인 기록 파일에 1~31의 결과와 화면 크기·프레임 수치·찾은 문제를 적는다.

- [ ] **Step 7: 커밋**

```bash
git add docs/superpowers/research/2026-10-13-fruit-stack-browser-check.md
git commit -m "docs: 과일 쌓기를 실제 브라우저에서 확인한 기록을 남긴다(한 판 끝까지, 세 배치, 이어 하기, 일찍 끝내기, 과일이 많을 때의 프레임)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

## 자체 점검(작성자 기록)

- 스펙 R# 대응:

| 규칙 | 작업 |
|---|---|
| R1~R3(판·과일·물리 값), R4(과일 순서) | 7 (R4의 씨앗 정하기·싣기는 5) |
| R5~R7(들기·떨어뜨리기·자동) | 8, 입력은 14, 3초 안내는 12(글자)·15(소리) |
| R8·R9·R11·R14(합치기·착지·빠진 과일) | 7 |
| R10·R12·R13(점수·선 넘김·탈락) | 8, 탈락 안내는 14·15 |
| R15·R16(판의 시계·따라잡기) | 8(걸음 계산), 13(틱·가려진 탭·한도), 14("따라잡는 중…") |
| R17(상한 10분) | 3(`timeUp`), 5(`deadline`·`autoAct`), 6(방 타이머) |
| R18(점수 보고 묶기) | 10(계획), 13(훅) |
| R19·R20(서버 검증·탈락 보고) | 3, 형식 검사는 5, 통합은 6 |
| R21(맞추기·끊김) | 10(계획), 13(두 훅) |
| R22(판 신호 보내기) | 13, 통합은 15 |
| R23(인코딩) | 9, 서버 겉모양 검사는 4 |
| R24(서버 검증·속도 제한·중계) | 4, 5(신호 내용), 6(STOMP) |
| R25(받기·보간) | 9(계산), 13(훅), 공통 구독 경로는 11 |
| R26(끝 조건, 일찍 끝내기 포함) | 3, 5·6(결과·통합), 남은 점수 안내는 14·15 |
| R27(승패·등수) | 3, 결과 창은 14 |
| R28·R29(기권·탈락한 사람) | 3, 5, 6 |
| R30(기록) | 5, 6 |
| R31(다음 게임·새 씨앗) | 5 |
| R32~R34(저장·무효화·복원) | 10, 13 |
| R35(서버가 컴퓨터 거절) | 1(`supportsBots`·오류 코드), 2 |
| R36(화면에서 컴퓨터 감추기) | 11(모듈 칸), 15(`RoomPage`·모듈 값·테스트) |

- 스펙 장 대응: 4.1 → 1·2, 4.2 → 1, 4.4 → 3·4·5, 4.5·4.6 → 5(화면 record는 1), 4.7 → 1, 5장 → 1(타입)·7(`matter-js`)·11·15, 6.1 → 1, 6.2 → 7~15, 6.3 → 12, 6.4 → 12(`fitBoard`)·14·15, 6.5 → 14, 6.6·6.7 → 14, 6.8 → 11(소리)·12(고리)·13(효과 수명)·15(소리·끝 연출), 6.9 → 14, 6.10·6.11 → 15, 6.12 → 12·14, 7.1 → 3·4·5, 7.2 → 2·6, 7.3 → 7~15와 16.
- 이름 일관성: 화면 칸(`viewerId, status, startedAt, seed, participantIds, players, result, winnerId, deadline, serverNow`)과 신호 칸(`gameType, type, startedAt, playerId, seq, board`)은 백엔드 record(Task 1)·프론트 타입(Task 1)·테스트가 같은 이름·순서다. `FruitGame`의 칸(`seed, world, steps, dropIndex, score, aimX, heldSinceStep, lastDropStep, overSteps, out`)은 Task 8·10·13이 같다. `BoardFrame`(`held, aimX, danger, fruits`)은 Task 7·8·9·12·13·14가 같다. `data-testid`: `fruit-table`, `my-board`, `mini-board`, `fruit-hud`, `fruit-game-over`, `standing-row`, `end-reason`, `fruit-box-art`.
- 남은 판단: Task 7·8의 물리 테스트는 실제 `matter-js`로 돌아 걸음 수 여유를 두었다. 여유로도 맞지 않을 때 바꿔도 되는 값은 그 작업의 "통과 확인" 단계에 적었고, 그 밖의 단언은 바꾸지 않는다.
