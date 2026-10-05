# 테이블탑 UI 리디자인 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 평면 UI를 원목+펠트 입체 테이블 UI로 바꾸고, 게임 선반(대기·플레이 인원 표시), SVG 카드 일러스트, 카드 이동 애니메이션, 효과음을 추가한다.

**Architecture:** 백엔드는 `GET /api/games` 하나만 추가한다(방 레지스트리에서 게임별 인원 집계). 프론트는 공통 재질 컴포넌트(종이 패널·입체 버튼·펠트·원목)를 먼저 바꾸고, 게임 화면은 PC용 둘러앉기(`TableRound`)와 모바일용 위쪽 줄(`TableRail`) 두 배치로 나눈다. 카드 움직임은 이전/다음 서버 상태를 비교하는 순수 함수 `inferMoves`가 계산하고, `useCardMotion`이 겹친 레이어의 유령 카드로 날려 보낸다.

**Tech Stack:** Java 21 / Spring Boot 3.5 / JUnit5 / MockMvc · React 19 / TypeScript 5.9 / Vite 8 / Tailwind 4 / `motion` 14 (`motion/react`) / Vitest 5 + Testing Library · Web Audio API

**Spec:** `docs/superpowers/specs/2026-10-06-tabletop-ui-redesign-design.md` (실행 전 반드시 함께 읽을 것)

## Global Constraints

- 백엔드 Java 코드는 `/Users/ichanhan/CLAUDE.md`의 객체지향 생활 체조를 지킨다: 메서드당 들여쓰기 1단계, `else` 금지, 원시값 VO 래핑, 한 줄에 점 하나(스트림 체이닝 줄바꿈은 기존 코드 관례대로 허용), 일급 컬렉션, 필드 3개 이하, 오류는 `BusinessException(ErrorCode)`.
- 게임 규칙 엔진(`papersafari` 패키지), STOMP, 전적 코드는 바꾸지 않는다.
- 외부 이미지·폰트·소리 파일을 추가하지 않는다. 그림은 코드 안 SVG/CSS, 소리는 Web Audio 합성.
- 새 런타임 의존성은 `motion` 하나뿐이다.
- 기존 접근성 계약을 유지한다: `CardFace`의 aria-label(`"7 카드"`, `"타잔 10 카드"`, `"여우 -2 카드 (엿봄)"`, `"뒷면 카드"`), `"덱에서 뽑기"` 버튼, 슬롯 `data-testid="slot"`(DOM 순서: 상대들 먼저, 내 판 마지막).
- 기존 프론트 테스트 63개는 새 구조에 맞게 고쳐서 모두 유지한다(삭제 금지, 단언 대상만 바뀐 경우 수정).
- `MotionConfig reducedMotion="user"` + CSS `@media (prefers-reduced-motion: reduce)`로 동작 줄이기를 존중한다.
- 사용자에게 보이는 문구는 한국어 해요체.
- 커밋 메시지는 한국어 conventional(`feat:`, `fix:`, `test:`, `docs:`), 끝에 빈 줄 + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 반응형 기준: PC 배치는 `(min-width: 1024px)`.

## Review Focus

1. **재연결·재동기화 직후의 상태**: 오래 끊겼다 돌아오면 이전 상태와 차이가 커서 카드가 한꺼번에 날아다니면 안 된다 → 동기화 요청 직후 받은 화면은 `animate=false`(Task 8 `useRoomChannel` 테스트), 그때는 나눠 주기 외 움직임 없음(Task 8 테이블 테스트).
2. **애니메이션 중 새 상태 도착 / 화면 이탈**: 숨겨 둔 진짜 카드가 영영 안 보이면 안 된다 → 새 전환이 오면 숨김을 모두 풀고, 언마운트 시 타이머 정리(Task 8 `useCardMotion` 테스트).
3. **타잔 교체**: 다른 사람(왼쪽) 판까지 바뀌는 교체에서 엉뚱한 칸으로 날아가면 안 된다 → `inferMoves` 타잔 시나리오(Task 7).
4. **저장소/오디오가 막힌 환경**: 사생활 보호 모드에서 `localStorage`가 예외를 던지거나 `AudioContext`가 없어도 화면이 깨지면 안 된다 → sound 테스트(Task 3).
5. **게임 중 창 크기 변경**: PC↔모바일 배치가 바뀌어도 행동 버튼과 슬롯 순서가 유지돼야 한다 → 두 배치 모두에서 같은 행동 테스트 통과(Task 6).

---

## 파일 구조

백엔드 (모두 `backend/src/main/java/com/boardgame/room/` 아래)
- Create `domain/PlayerCount.java` — 0 이상 인원 수 VO
- Create `domain/GameOccupancy.java` — 게임 하나의 대기/플레이 인원
- Create `domain/GameOccupancies.java` — 일급 컬렉션, 방 목록 → 게임별 집계
- Modify `domain/Room.java` — `occupancy()` 메시지 추가
- Modify `application/RoomService.java` — `gameOccupancies()`
- Create `api/GameLobbyController.java`, `api/GameSummaryResponse.java`
- Test: `src/test/java/com/boardgame/room/domain/PlayerCountTest.java`, `GameOccupanciesTest.java`, `src/test/java/com/boardgame/room/api/GameLobbyApiTest.java`

프론트 (`frontend/src/` 아래)
- `index.css` — 테마 토큰, 재질 유틸리티, 카드 3D CSS
- `test/setup.ts` — `matchMedia` 목
- `lib/useMediaQuery.ts`, `lib/sound.tsx`
- `components/ui.tsx`(재작성), `components/Felt.tsx`, `components/WoodRail.tsx`, `components/Modal.tsx`, `components/RollingNumber.tsx`, `components/Confetti.tsx`, `components/Layout.tsx`, `components/Toast.tsx`
- `api/games.ts`, `api/types.ts`
- `games/catalog.ts`, `games/GameBox.tsx`, `games/PaperSafariBoxArt.tsx`
- `pages/GameShelfPage.tsx`(신규), `pages/GameLobbyPage.tsx`(← `LobbyPage.tsx` 이동), `pages/RoomPage.tsx`, `pages/LoginPage.tsx`, `pages/SignupPage.tsx`, `pages/RecordsPage.tsx`
- `games/papersafari/cards/palette.ts`, `cards/art/*.tsx`(14종), `cards/CardArt.tsx`, `cards/CardBack.tsx`
- `games/papersafari/CardFace.tsx`, `PlayerBoard.tsx`, `PaperSafariTable.tsx`
- `games/papersafari/layout/seats.ts`, `layout/TableRound.tsx`, `layout/TableRail.tsx`, `layout/Seat.tsx`, `layout/CenterPiles.tsx`, `layout/Hud.tsx`
- `games/papersafari/motion/zones.ts`, `motion/inferMoves.ts`, `motion/ZoneAnchor.tsx`, `motion/useCardMotion.ts`, `motion/GhostLayer.tsx`
- `games/papersafari/RoundResultModal.tsx`, `GameOverPanel.tsx`
- `room/WaitingRoom.tsx`, `room/MemberList.tsx`(→ 의자 배치), `room/useRoomChannel.ts`
- `App.tsx`

---

### Task 1: 백엔드 — 게임별 인원 집계 API

**Files:**
- Create: `backend/src/main/java/com/boardgame/room/domain/PlayerCount.java`
- Create: `backend/src/main/java/com/boardgame/room/domain/GameOccupancy.java`
- Create: `backend/src/main/java/com/boardgame/room/domain/GameOccupancies.java`
- Modify: `backend/src/main/java/com/boardgame/room/domain/Room.java`
- Modify: `backend/src/main/java/com/boardgame/room/application/RoomService.java`
- Create: `backend/src/main/java/com/boardgame/room/api/GameLobbyController.java`
- Create: `backend/src/main/java/com/boardgame/room/api/GameSummaryResponse.java`
- Modify: `backend/src/main/java/com/boardgame/common/error/ErrorCode.java` (`INVALID_PLAYER_TOTAL` 추가)
- Test: `backend/src/test/java/com/boardgame/room/domain/PlayerCountTest.java`
- Test: `backend/src/test/java/com/boardgame/room/domain/GameOccupanciesTest.java`
- Test: `backend/src/test/java/com/boardgame/room/api/GameLobbyApiTest.java`

**Interfaces:**
- Produces (HTTP): `GET /api/games` → `200 [{gameType, name, minPlayers, maxPlayers, waitingPlayers, playingPlayers}]`, 비로그인 `401 {status, code:"UNAUTHORIZED", message}`.
- Produces (Java): `PlayerCount.of(int)`, `PlayerCount.zero()`, `plus(PlayerCount)`, `value()`; `GameOccupancy.empty(GameType)`, `add(RoomStatus, PlayerCount)`, `gameType()`, `waiting()`, `playing()`; `GameOccupancies.of(List<Room>)`, `asList()`; `Room.addTo(GameOccupancy)` → `GameOccupancy`; `RoomService.gameOccupancies()` → `List<GameSummaryResponse>`.

- [ ] **Step 1: 실패하는 도메인 테스트 작성**

`PlayerCountTest.java`:
```java
package com.boardgame.room.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import org.junit.jupiter.api.Test;

class PlayerCountTest {

    @Test
    void 인원을_더한다() {
        assertThat(PlayerCount.of(2).plus(PlayerCount.of(3))).isEqualTo(PlayerCount.of(5));
        assertThat(PlayerCount.zero().value()).isZero();
    }

    @Test
    void 음수_인원은_만들_수_없다() {
        assertError(() -> PlayerCount.of(-1), ErrorCode.INVALID_PLAYER_TOTAL);
    }
}
```

`GameOccupanciesTest.java`:
```java
package com.boardgame.room.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameType;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class GameOccupanciesTest {

    private Room room(String code, long... memberIds) {
        RoomProfile profile = new RoomProfile(new RoomCode(code), new RoomName("방"), GameType.PAPER_SAFARI);
        Room room = Room.open(profile, new Participant(memberIds[0], "회원" + memberIds[0]));
        for (int i = 1; i < memberIds.length; i++) {
            room.join(new Participant(memberIds[i], "회원" + memberIds[i]));
        }
        return room;
    }

    private Room playing(String code, long... memberIds) {
        Room room = room(code, memberIds);
        room.start(memberIds[0], FakeGameSession::new, "match-" + code, Instant.parse("2026-10-06T10:00:00Z"));
        return room;
    }

    private GameOccupancy only(GameOccupancies occupancies) {
        assertThat(occupancies.asList()).hasSize(GameType.values().length);
        return occupancies.asList().get(0);
    }

    @Test
    void 방이_없어도_모든_게임을_0명으로_보여준다() {
        GameOccupancy occupancy = only(GameOccupancies.of(List.of()));

        assertThat(occupancy.gameType()).isEqualTo(GameType.PAPER_SAFARI);
        assertThat(occupancy.waiting()).isEqualTo(PlayerCount.zero());
        assertThat(occupancy.playing()).isEqualTo(PlayerCount.zero());
    }

    @Test
    void 대기_방과_진행_방의_인원을_나눠_더한다() {
        List<Room> rooms = List.of(room("AAAAAA", 1L, 2L), room("BBBBBB", 3L), playing("CCCCCC", 4L, 5L, 6L));

        GameOccupancy occupancy = only(GameOccupancies.of(rooms));

        assertThat(occupancy.waiting()).isEqualTo(PlayerCount.of(3));
        assertThat(occupancy.playing()).isEqualTo(PlayerCount.of(3));
    }

    @Test
    void 진행_방만_있으면_대기는_0명이다() {
        GameOccupancy occupancy = only(GameOccupancies.of(List.of(playing("CCCCCC", 4L, 5L))));

        assertThat(occupancy.waiting()).isEqualTo(PlayerCount.zero());
        assertThat(occupancy.playing()).isEqualTo(PlayerCount.of(2));
    }
}
```
(`FakeGameSession`은 같은 테스트 패키지에 이미 있고 `List<Long>` 생성자를 가진다. `Room.start`의 `Function<List<Long>, GameSession>`에 `FakeGameSession::new`가 그대로 맞는다.)

- [ ] **Step 2: 실패 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest='PlayerCountTest,GameOccupanciesTest'`
Expected: 컴파일 실패 (`PlayerCount`, `GameOccupancies` 없음)

- [ ] **Step 3: 도메인 구현**

`ErrorCode.java`의 방 관련 구역(`FORFEIT_NOT_ALLOWED_YET` 다음 줄)에 추가:
```java
    INVALID_PLAYER_TOTAL(HttpStatus.BAD_REQUEST, "인원 수는 0명 이상이어야 합니다."),
```

`PlayerCount.java`:
```java
package com.boardgame.room.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;

public record PlayerCount(int value) {

    private static final PlayerCount ZERO = new PlayerCount(0);

    public PlayerCount {
        if (value < 0) {
            throw new BusinessException(ErrorCode.INVALID_PLAYER_TOTAL);
        }
    }

    public static PlayerCount of(int value) {
        return new PlayerCount(value);
    }

    public static PlayerCount zero() {
        return ZERO;
    }

    public PlayerCount plus(PlayerCount other) {
        return new PlayerCount(value + other.value);
    }
}
```

`GameOccupancy.java` (불변, 필드 3개):
```java
package com.boardgame.room.domain;

import com.boardgame.game.GameType;

public record GameOccupancy(GameType gameType, PlayerCount waiting, PlayerCount playing) {

    public static GameOccupancy empty(GameType gameType) {
        return new GameOccupancy(gameType, PlayerCount.zero(), PlayerCount.zero());
    }

    public GameOccupancy add(RoomStatus status, PlayerCount count) {
        if (status == RoomStatus.PLAYING) {
            return new GameOccupancy(gameType, waiting, playing.plus(count));
        }
        return new GameOccupancy(gameType, waiting.plus(count), playing);
    }
}
```

`GameOccupancies.java`:
```java
package com.boardgame.room.domain;

import com.boardgame.game.GameType;
import java.util.Arrays;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;

public class GameOccupancies {

    private final Map<GameType, GameOccupancy> occupancies;

    private GameOccupancies(Map<GameType, GameOccupancy> occupancies) {
        this.occupancies = occupancies;
    }

    public static GameOccupancies of(List<Room> rooms) {
        Map<GameType, GameOccupancy> occupancies = new EnumMap<>(GameType.class);
        Arrays.stream(GameType.values()).forEach(type -> occupancies.put(type, GameOccupancy.empty(type)));
        rooms.forEach(room -> occupancies.computeIfPresent(room.gameType(), (type, current) -> room.addTo(current)));
        return new GameOccupancies(occupancies);
    }

    public List<GameOccupancy> asList() {
        return List.copyOf(occupancies.values());
    }
}
```
(`EnumMap.values()`는 enum 선언 순서를 보장한다.)

`Room.java`에 메시지 추가 (상태를 꺼내 묻지 않고 방이 스스로 더한다; `members.size()`는 이미 있다):
```java
    public GameOccupancy addTo(GameOccupancy occupancy) {
        return occupancy.add(status(), PlayerCount.of(members.size()));
    }
```

- [ ] **Step 4: 도메인 테스트 통과 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest='PlayerCountTest,GameOccupanciesTest'`
Expected: PASS

- [ ] **Step 5: 실패하는 API 테스트 작성**

`GameLobbyApiTest.java` — 스프링 컨텍스트와 방 레지스트리는 다른 테스트와 공유되므로 **절대값이 아니라 증가량**을 검사한다:
```java
package com.boardgame.room.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.room.application.RoomNotifier;
import com.boardgame.support.ApiUsers;
import com.boardgame.support.ApiUsers.User;
import com.jayway.jsonpath.JsonPath;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class GameLobbyApiTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RoomNotifier notifier;

    private int count(User user, String field) throws Exception {
        String body = mockMvc.perform(get("/api/games").session(user.session()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$[0]." + field);
    }

    private String createRoom(User host) throws Exception {
        String body = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\": \"인원 방\", \"gameType\": \"PAPER_SAFARI\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(body, "$.code");
    }

    @Test
    void 로그인하지_않으면_401() throws Exception {
        mockMvc.perform(get("/api/games"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.code").value("UNAUTHORIZED"));
    }

    @Test
    void 게임_정보와_인원을_돌려준다() throws Exception {
        User viewer = ApiUsers.create(mockMvc);

        mockMvc.perform(get("/api/games").session(viewer.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].gameType").value("PAPER_SAFARI"))
                .andExpect(jsonPath("$[0].name").value("페이퍼 사파리"))
                .andExpect(jsonPath("$[0].minPlayers").value(2))
                .andExpect(jsonPath("$[0].maxPlayers").value(5))
                .andExpect(jsonPath("$[0].waitingPlayers").isNumber())
                .andExpect(jsonPath("$[0].playingPlayers").isNumber());
    }

    @Test
    void 방에_들어가면_대기_인원이_늘고_시작하면_플레이_인원으로_옮겨간다() throws Exception {
        User viewer = ApiUsers.create(mockMvc);
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        int waitingBefore = count(viewer, "waitingPlayers");
        int playingBefore = count(viewer, "playingPlayers");

        String code = createRoom(host);
        mockMvc.perform(post("/api/rooms/{code}/join", code).session(guest.session())).andExpect(status().isOk());
        assertThat(count(viewer, "waitingPlayers")).isEqualTo(waitingBefore + 2);

        mockMvc.perform(post("/api/rooms/{code}/start", code).session(host.session())).andExpect(status().isOk());
        assertThat(count(viewer, "waitingPlayers")).isEqualTo(waitingBefore);
        assertThat(count(viewer, "playingPlayers")).isEqualTo(playingBefore + 2);
    }
}
```
(`ApiUsers.create(mockMvc)`는 `com.boardgame.support.ApiUsers`에 이미 있다. 동시에 다른 테스트가 같은 컨텍스트에서 방을 만들지는 않는다 — JUnit 기본은 순차 실행.)

- [ ] **Step 6: 실패 확인**

Run: `mvn -q -f backend/pom.xml test -Dtest=GameLobbyApiTest`
Expected: FAIL (`/api/games` 404 → 공통 오류 응답 `NOT_FOUND`)

- [ ] **Step 7: 서비스·컨트롤러 구현**

`GameSummaryResponse.java`:
```java
package com.boardgame.room.api;

import com.boardgame.game.GameType;
import com.boardgame.room.domain.GameOccupancy;

public record GameSummaryResponse(GameType gameType, String name, int minPlayers, int maxPlayers,
                                  int waitingPlayers, int playingPlayers) {

    public static GameSummaryResponse from(GameOccupancy occupancy) {
        GameType type = occupancy.gameType();
        PlayerCount waiting = occupancy.waiting();
        PlayerCount playing = occupancy.playing();
        return new GameSummaryResponse(type, type.displayName(), type.minPlayers(), type.maxPlayers(),
                waiting.value(), playing.value());
    }
}
```
(import `com.boardgame.room.domain.PlayerCount`. 한 줄 점 하나 규칙 때문에 지역변수로 푼다 — 기존 `RoomSummaryResponse.from`과 같은 관례.)

`RoomService.java`에 메서드 추가 (기존 `waitingRooms` 아래):
```java
    public synchronized List<GameSummaryResponse> gameOccupancies() {
        GameOccupancies occupancies = GameOccupancies.of(registry.all());
        return occupancies.asList().stream()
                .map(GameSummaryResponse::from)
                .toList();
    }
```
(import: `com.boardgame.room.api.GameSummaryResponse`, `com.boardgame.room.domain.GameOccupancies`)

`GameLobbyController.java`:
```java
package com.boardgame.room.api;

import com.boardgame.room.application.RoomService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/games")
public class GameLobbyController {

    private final RoomService roomService;

    public GameLobbyController(RoomService roomService) {
        this.roomService = roomService;
    }

    @GetMapping
    public List<GameSummaryResponse> games() {
        return roomService.gameOccupancies();
    }
}
```
보안 설정은 바꾸지 않는다: `SecurityConfig`가 이미 `/api/**`를 `authenticated()`로 막는다.

- [ ] **Step 8: 전체 백엔드 테스트 통과 확인**

Run: `mvn -q -f backend/pom.xml test`
Expected: 기존 255개 + 새 6개 모두 PASS

- [ ] **Step 9: 커밋**

```bash
git add backend
git commit -m "feat: 게임별 대기·플레이 인원을 알려주는 GET /api/games

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 프론트 기반 — 테마 토큰, 입체 재질 컴포넌트, motion 설치

**Files:**
- Modify: `frontend/package.json` (`npm install motion@^14`)
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/test/setup.ts`
- Create: `frontend/src/lib/useMediaQuery.ts`, `frontend/src/lib/useMediaQuery.test.ts`
- Modify: `frontend/src/components/ui.tsx`
- Create: `frontend/src/components/Felt.tsx`, `WoodRail.tsx`, `Modal.tsx`, `Modal.test.tsx`, `RollingNumber.tsx`, `Confetti.tsx`
- Modify: `frontend/src/components/Toast.tsx`

**Interfaces:**
- Produces:
  - `useMediaQuery(query: string): boolean`; `PC_QUERY = '(min-width: 1024px)'` (export from `lib/useMediaQuery.ts`)
  - `Panel({children, className?, as?: 'section'|'div'})`, `Button({variant?: 'primary'|'secondary'|'danger', ...})`, `TextInput({label, hint?, id, ...})` — 이름과 props 기존과 동일
  - `Felt({children, className?, shape?: 'oval'|'rect'})`, `WoodRail({children, className?})`
  - `Modal({open: boolean, title: string, onClose?: () => void, children, wide?: boolean})` — `role="dialog"`, `aria-modal="true"`, `aria-label={title}`
  - `RollingNumber({value: number | null, className?})` — null이면 `–`
  - `Confetti({active: boolean})` — DOM 조각 36개, reduced motion이면 아무것도 그리지 않음
  - 테스트 헬퍼: `setup.ts`가 전역 `window.matchMedia` 목을 설치하고 `setMediaMatches(matches: boolean)`를 `src/test/media.ts`에서 export

- [ ] **Step 1: motion 설치와 API 확인**

Run: `npm --prefix frontend install motion@^14`
그다음 `ls frontend/node_modules/motion/dist/` 및 `grep -n "export" frontend/node_modules/motion/dist/react.d.ts | head` 로 `motion`, `AnimatePresence`, `MotionConfig`, `useReducedMotion`이 `motion/react`에서 export되는지 확인한다. 이름이 다르면 이후 모든 Task에서 실제 이름을 쓴다.

- [ ] **Step 2: matchMedia 목과 useMediaQuery 테스트 작성**

`frontend/src/test/media.ts`:
```ts
type Listener = (event: MediaQueryListEvent) => void;

let matches = true;
const listeners = new Set<Listener>();

export function setMediaMatches(next: boolean): void {
  matches = next;
  listeners.forEach((listener) => listener({ matches: next } as MediaQueryListEvent));
}

export function installMatchMedia(): void {
  window.matchMedia = (query: string) =>
    ({
      get matches() {
        return query.includes('prefers-reduced-motion') ? false : matches;
      },
      media: query,
      onchange: null,
      addEventListener: (_: string, listener: Listener) => listeners.add(listener),
      removeEventListener: (_: string, listener: Listener) => listeners.delete(listener),
      addListener: (listener: Listener) => listeners.add(listener),
      removeListener: (listener: Listener) => listeners.delete(listener),
      dispatchEvent: () => true,
    }) as unknown as MediaQueryList;
}

export function resetMedia(): void {
  matches = true;
  listeners.clear();
}
```

`frontend/src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { installMatchMedia, resetMedia } from './media';

installMatchMedia();

afterEach(() => {
  cleanup();
  resetMedia();
});
```
(기본은 PC 화면 `matches=true`. 따라서 기존 테스트는 PC 배치로 돈다.)

`frontend/src/lib/useMediaQuery.test.ts`:
```ts
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { setMediaMatches } from '../test/media';
import { PC_QUERY, useMediaQuery } from './useMediaQuery';

describe('useMediaQuery', () => {
  it('현재 일치 여부를 돌려주고 바뀌면 다시 그린다', () => {
    const { result } = renderHook(() => useMediaQuery(PC_QUERY));
    expect(result.current).toBe(true);

    act(() => setMediaMatches(false));

    expect(result.current).toBe(false);
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npm --prefix frontend test -- src/lib/useMediaQuery.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 4: useMediaQuery 구현**

```ts
import { useSyncExternalStore } from 'react';

export const PC_QUERY = '(min-width: 1024px)';

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
```

- [ ] **Step 5: 통과 확인**

Run: `npm --prefix frontend test -- src/lib/useMediaQuery.test.ts`
Expected: PASS

- [ ] **Step 6: 테마 CSS 작성 (`index.css` 전체 교체)**

```css
@import "tailwindcss";

@theme {
  --font-sans: "Pretendard", system-ui, -apple-system, sans-serif;
  --color-cream: #faf6ee;
  --color-cream-50: #fffaf0;
  --color-cream-200: #e6dcc4;
  --color-cream-300: #d8cdb4;
  --color-wood-900: #24160b;
  --color-wood-800: #2e1d10;
  --color-wood-700: #5d3b1f;
  --color-wood-500: #8a5a32;
  --color-wood-300: #a8743f;
  --color-felt-800: #164a2d;
  --color-felt-600: #1c5a37;
  --color-felt-400: #2f8a57;
  --color-mustard-300: #f7c860;
  --color-mustard-400: #f2b33d;
  --color-mustard-600: #b77b14;
  --color-brick-500: #b4461a;
  --color-brick-700: #7c2d12;
  --color-safari-50: #eef7ef;
  --color-safari-100: #d7ecd9;
  --color-safari-300: #8cc597;
  --color-safari-500: #3f8f4f;
  --color-safari-600: #347a42;
  --color-safari-700: #2b6436;
}

body {
  @apply text-stone-800 antialiased;
  min-height: 100vh;
  background-color: var(--color-wood-800);
  background-image:
    radial-gradient(ellipse at 50% 0%, rgb(255 220 160 / 0.12), transparent 60%),
    radial-gradient(ellipse at 50% 120%, rgb(0 0 0 / 0.55), transparent 60%),
    repeating-linear-gradient(92deg, rgb(255 255 255 / 0.025) 0 2px, transparent 2px 9px),
    linear-gradient(180deg, #3b2614, #24160b);
  background-attachment: fixed;
}

@utility paper {
  background: var(--color-cream-50);
  border-radius: 1.25rem;
  box-shadow: 0 4px 0 var(--color-cream-200), 0 6px 0 var(--color-cream-300), 0 18px 30px rgb(0 0 0 / 0.35);
}

@utility felt {
  background: radial-gradient(ellipse at 50% 40%, var(--color-felt-400), var(--color-felt-600) 70%, var(--color-felt-800));
  box-shadow: 0 0 0 10px var(--color-wood-500), 0 0 0 13px var(--color-wood-700), 0 30px 40px rgb(0 0 0 / 0.55),
    inset 0 0 60px rgb(0 0 0 / 0.35);
}

@utility wood-rail {
  background: repeating-linear-gradient(90deg, rgb(255 255 255 / 0.04) 0 3px, transparent 3px 11px),
    linear-gradient(180deg, var(--color-wood-300), var(--color-wood-500));
  box-shadow: inset 0 -4px 0 rgb(0 0 0 / 0.25), 0 10px 18px rgb(0 0 0 / 0.5);
}

@utility press-3d {
  transition: transform 80ms ease, box-shadow 80ms ease;
  &:active:not(:disabled) {
    transform: translateY(4px);
    box-shadow: 0 0 0 transparent, 0 2px 4px rgb(0 0 0 / 0.3);
  }
}

/* 카드 3D 뒤집기 */
.card-3d { perspective: 700px; }
.card-inner { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; transition: transform 350ms cubic-bezier(.2,.7,.3,1.2); }
.card-side { position: absolute; inset: 0; backface-visibility: hidden; -webkit-backface-visibility: hidden; border-radius: 10%/7%; overflow: hidden; }
.card-side.is-back { transform: rotateY(180deg); }
.card-thick { box-shadow: 0 2px 0 var(--color-cream-300), 0 4px 0 #b9ab8a, 0 10px 14px rgb(0 0 0 / 0.45); }

@keyframes turn-glow { 0%, 100% { box-shadow: 0 0 0 2px var(--color-cream-50), 0 0 6px var(--color-mustard-400); } 50% { box-shadow: 0 0 0 2px var(--color-cream-50), 0 0 18px var(--color-mustard-400); } }
.turn-glow { animation: turn-glow 1.4s ease-in-out infinite; }
@keyframes float-hint { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }
.float-hint { animation: float-hint 1.6s ease-in-out infinite; }
@keyframes gold-sparkle { 0% { box-shadow: 0 0 0 0 rgb(251 191 36 / .9); } 100% { box-shadow: 0 0 0 12px rgb(251 191 36 / 0); } }
.gold-sparkle { animation: gold-sparkle 900ms ease-out 1; }
@keyframes live-dot { 50% { opacity: .3; } }
.live-dot { animation: live-dot 1.2s infinite; }

@media (prefers-reduced-motion: reduce) {
  .card-inner, .press-3d { transition: none; }
  .turn-glow, .float-hint, .gold-sparkle, .live-dot { animation: none; }
}
```

- [ ] **Step 7: 재질 컴포넌트 작성**

`components/ui.tsx` 전체 교체:
```tsx
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

type PanelProps = { children: ReactNode; className?: string; as?: 'section' | 'div' };

export function Panel({ children, className = '', as: Tag = 'section' }: PanelProps) {
  return <Tag className={`paper p-5 ${className}`}>{children}</Tag>;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' };

const VARIANTS = {
  primary: 'bg-mustard-400 text-wood-800 shadow-[0_4px_0_var(--color-mustard-600),0_8px_14px_rgb(0_0_0/0.3)] hover:bg-mustard-300',
  secondary: 'bg-cream-50 text-wood-800 shadow-[0_4px_0_var(--color-cream-300),0_8px_14px_rgb(0_0_0/0.25)] hover:bg-white',
  danger: 'bg-brick-500 text-cream-50 shadow-[0_4px_0_var(--color-brick-700),0_8px_14px_rgb(0_0_0/0.3)] hover:brightness-110',
};

export function Button({ variant = 'primary', className = '', ...props }: ButtonProps) {
  return (
    <button
      type="button"
      className={`press-3d rounded-xl px-4 py-2 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none ${VARIANTS[variant]} ${className}`}
      {...props}
    />
  );
}

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string };

export function TextInput({ label, hint, id, ...props }: TextInputProps) {
  return (
    <label className="block space-y-1" htmlFor={id}>
      <span className="text-sm font-semibold text-wood-700">{label}</span>
      <input
        id={id}
        className="w-full rounded-xl border border-cream-300 bg-cream px-3 py-2 shadow-[inset_0_2px_4px_rgb(0_0_0/0.12)] outline-none focus:border-mustard-400 focus:ring-2 focus:ring-mustard-300/50"
        {...props}
      />
      {hint ? <span className="block text-xs text-stone-500">{hint}</span> : null}
    </label>
  );
}
```

`components/Felt.tsx`:
```tsx
import type { ReactNode } from 'react';

type Props = { children: ReactNode; className?: string; shape?: 'oval' | 'rect' };

export function Felt({ children, className = '', shape = 'rect' }: Props) {
  const radius = shape === 'oval' ? 'rounded-[48%/40%]' : 'rounded-[28px]';
  return <div className={`felt relative ${radius} ${className}`}>{children}</div>;
}
```

`components/WoodRail.tsx`:
```tsx
import type { ReactNode } from 'react';

export function WoodRail({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`wood-rail rounded-xl ${className}`}>{children}</div>;
}
```

`components/RollingNumber.tsx`:
```tsx
import { AnimatePresence, motion } from 'motion/react';

export function RollingNumber({ value, className = '' }: { value: number | null; className?: string }) {
  const text = value === null ? '–' : String(value);
  return (
    <span className={`relative inline-flex overflow-hidden align-bottom ${className}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={text} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '-100%' }} transition={{ duration: 0.25 }}>
          {text}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
```

`components/Confetti.tsx`:
```tsx
import { motion, useReducedMotion } from 'motion/react';
import { useMemo } from 'react';

const COLORS = ['#f2b33d', '#2f8a57', '#b4461a', '#fffaf0', '#7c3aed'];
const PIECES = 36;

export function Confetti({ active }: { active: boolean }) {
  const reduced = useReducedMotion();
  const pieces = useMemo(
    () => Array.from({ length: PIECES }, (_, index) => ({
      id: index,
      left: (index * 37) % 100,
      delay: (index % 9) * 0.06,
      rotate: (index * 53) % 360,
      color: COLORS[index % COLORS.length],
    })),
    [],
  );
  if (!active || reduced) {
    return null;
  }
  return (
    <div aria-hidden="true" data-testid="confetti" className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((piece) => (
        <motion.span
          key={piece.id}
          className="absolute top-0 h-3 w-2 rounded-sm"
          style={{ left: `${piece.left}%`, backgroundColor: piece.color }}
          initial={{ y: -20, rotate: 0, opacity: 1 }}
          animate={{ y: '105vh', rotate: piece.rotate + 360, opacity: [1, 1, 0] }}
          transition={{ duration: 2, delay: piece.delay, ease: 'easeIn' }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 8: Modal 테스트 작성**

`components/Modal.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Modal } from './Modal';

describe('Modal', () => {
  it('열리면 대화상자로 보이고 첫 버튼에 포커스가 간다', () => {
    render(<Modal open title="결과"><button type="button">확인</button></Modal>);

    expect(screen.getByRole('dialog', { name: '결과' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '확인' })).toHaveFocus();
  });

  it('닫을 수 있는 모달은 Esc로 닫힌다', async () => {
    const onClose = vi.fn();
    render(<Modal open title="결과" onClose={onClose}><button type="button">확인</button></Modal>);

    await userEvent.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledOnce();
  });

  it('Tab은 모달 안에서만 돈다', async () => {
    render(<Modal open title="결과"><button type="button">하나</button><button type="button">둘</button></Modal>);

    await userEvent.tab();
    expect(screen.getByRole('button', { name: '둘' })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: '하나' })).toHaveFocus();
  });

  it('닫혀 있으면 아무것도 그리지 않는다', () => {
    render(<Modal open={false} title="결과"><p>내용</p></Modal>);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 9: 실패 확인**

Run: `npm --prefix frontend test -- src/components/Modal.test.tsx`
Expected: FAIL (모듈 없음)

- [ ] **Step 10: Modal 구현**

```tsx
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';

type Props = { open: boolean; title: string; onClose?: () => void; children: ReactNode; wide?: boolean };

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

function focusables(root: HTMLElement | null): HTMLElement[] {
  return root ? Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
}

export function Modal({ open, title, onClose, children, wide = false }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      focusables(boxRef.current)[0]?.focus();
    }
  }, [open]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape' && onClose) {
      onClose();
      return;
    }
    if (event.key !== 'Tab') {
      return;
    }
    const items = focusables(boxRef.current);
    if (items.length === 0) {
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
      return;
    }
    if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-40 flex items-center justify-center bg-wood-900/60 p-4 backdrop-blur-[2px]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onKeyDown={handleKeyDown}
        >
          <motion.div
            ref={boxRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className={`paper max-h-[90vh] w-full overflow-y-auto p-6 ${wide ? 'max-w-4xl' : 'max-w-lg'}`}
            initial={{ y: 60, scale: 0.92, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 40, scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.3, duration: 0.45 }}
          >
            {children}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
```
주의: Tab 테스트에서 첫 포커스는 "하나"이므로 Tab 한 번 → "둘", 다시 Tab → 마지막에서 처음으로 순환해 "하나". `onKeyDown`이 바깥 div에 있으므로 이벤트 버블링으로 잡힌다.

- [ ] **Step 11: Toast 재질·애니메이션 적용**

`Toast.tsx`의 렌더 부분만 교체(로직 동일):
```tsx
const TONES: Record<Tone, string> = {
  error: 'bg-brick-500 text-cream-50 shadow-[0_4px_0_var(--color-brick-700),0_12px_20px_rgb(0_0_0/0.35)]',
  info: 'bg-cream-50 text-wood-800 shadow-[0_4px_0_var(--color-cream-300),0_12px_20px_rgb(0_0_0/0.35)]',
};
// ...
      <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div key={toast.id} role="status" layout
              initial={{ y: 40, opacity: 0, rotate: -2 }} animate={{ y: 0, opacity: 1, rotate: 0 }} exit={{ y: 30, opacity: 0 }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold ${TONES[toast.tone]}`}>
              {toast.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
```
(import `AnimatePresence, motion` from `motion/react`)

- [ ] **Step 12: 전체 테스트·빌드 확인**

Run: `npm --prefix frontend test && npm --prefix frontend run build`
Expected: 기존 63개 + 새 5개 PASS, 빌드 성공. 기존 테스트가 클래스 이름(`bg-white` 등)을 단언하다 실패하면 단언을 역할/텍스트 기반으로 고친다.

- [ ] **Step 13: 커밋**

```bash
git add frontend
git commit -m "feat: 원목·펠트 테마와 입체 재질 컴포넌트, motion 도입

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 효과음 엔진

**Files:**
- Create: `frontend/src/lib/sound.tsx`
- Test: `frontend/src/lib/sound.test.tsx`

**Interfaces:**
- Produces:
  - `type SoundName = 'draw' | 'place' | 'flip' | 'myTurn' | 'roundWin' | 'roundLose' | 'click'`
  - `SoundProvider({children})`, `useSound(): { play: (name: SoundName) => void; muted: boolean; toggleMuted: () => void }`
  - `readMuted(): boolean`, `writeMuted(muted: boolean): void` (저장 키 `bg.muted`, export해서 테스트)
  - `useSound()`는 Provider 밖에서 호출하면 **조용히 동작하는 기본값**(`play` 무시, `muted=false`)을 돌려준다 — 기존 컴포넌트 테스트에서 Provider 없이 렌더해도 깨지지 않게.

- [ ] **Step 1: 실패하는 테스트 작성**

```tsx
import { act, render, renderHook, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readMuted, SoundProvider, useSound, writeMuted } from './sound';

const wrapper = ({ children }: { children: ReactNode }) => <SoundProvider>{children}</SoundProvider>;

afterEach(() => {
  vi.restoreAllMocks();
  window.localStorage.clear();
});

describe('sound', () => {
  it('음소거 설정을 저장하고 다시 읽는다', () => {
    writeMuted(true);
    expect(readMuted()).toBe(true);
    writeMuted(false);
    expect(readMuted()).toBe(false);
  });

  it('저장소가 예외를 던져도 기본값(소리 켬)으로 동작한다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });

    expect(readMuted()).toBe(false);
    expect(() => writeMuted(true)).not.toThrow();
  });

  it('토글하면 muted가 바뀌고 저장된다', () => {
    const { result } = renderHook(() => useSound(), { wrapper });
    expect(result.current.muted).toBe(false);

    act(() => result.current.toggleMuted());

    expect(result.current.muted).toBe(true);
    expect(readMuted()).toBe(true);
  });

  it('AudioContext가 없어도 play는 아무 일 없이 끝난다', async () => {
    function Player() {
      const { play } = useSound();
      return <button type="button" onClick={() => play('draw')}>재생</button>;
    }
    render(<SoundProvider><Player /></SoundProvider>);

    await userEvent.click(screen.getByRole('button', { name: '재생' }));

    expect(screen.getByRole('button', { name: '재생' })).toBeInTheDocument();
  });

  it('Provider 밖에서도 useSound를 쓸 수 있다', () => {
    const { result } = renderHook(() => useSound());

    expect(() => result.current.play('click')).not.toThrow();
    expect(result.current.muted).toBe(false);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm --prefix frontend test -- src/lib/sound.test.tsx`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

```tsx
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type SoundName = 'draw' | 'place' | 'flip' | 'myTurn' | 'roundWin' | 'roundLose' | 'click';
type SoundApi = { play: (name: SoundName) => void; muted: boolean; toggleMuted: () => void };

const STORAGE_KEY = 'bg.muted';
const SILENT: SoundApi = { play: () => undefined, muted: false, toggleMuted: () => undefined };
const SoundContext = createContext<SoundApi | null>(null);

export function readMuted(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, muted ? '1' : '0');
  } catch {
    // 저장할 수 없는 환경이면 이번 방문 동안만 기억한다.
  }
}

type AudioCtor = typeof AudioContext;

function audioCtor(): AudioCtor | null {
  const holder = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return holder.AudioContext ?? holder.webkitAudioContext ?? null;
}

function tone(ctx: AudioContext, frequency: number, start: number, duration: number, type: OscillatorType = 'sine', gain = 0.18) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, ctx.currentTime + start);
  amp.gain.setValueAtTime(gain, ctx.currentTime + start);
  amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
  osc.connect(amp).connect(ctx.destination);
  osc.start(ctx.currentTime + start);
  osc.stop(ctx.currentTime + start + duration + 0.02);
}

function noise(ctx: AudioContext, duration: number, frequency: number, gain = 0.25) {
  const length = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / length);
  }
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const amp = ctx.createGain();
  source.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.value = frequency;
  amp.gain.value = gain;
  source.connect(filter).connect(amp).connect(ctx.destination);
  source.start();
}

const RECIPES: Record<SoundName, (ctx: AudioContext) => void> = {
  draw: (ctx) => noise(ctx, 0.12, 2500),
  place: (ctx) => tone(ctx, 180, 0, 0.08, 'triangle', 0.25),
  flip: (ctx) => { noise(ctx, 0.06, 4000, 0.2); tone(ctx, 900, 0.03, 0.04, 'square', 0.05); },
  myTurn: (ctx) => { tone(ctx, 784, 0, 0.18); tone(ctx, 1047, 0.15, 0.25); },
  roundWin: (ctx) => { tone(ctx, 523, 0, 0.15); tone(ctx, 659, 0.12, 0.15); tone(ctx, 784, 0.24, 0.3); },
  roundLose: (ctx) => { tone(ctx, 392, 0, 0.2, 'triangle'); tone(ctx, 330, 0.18, 0.3, 'triangle'); },
  click: (ctx) => tone(ctx, 1200, 0, 0.03, 'square', 0.04),
};

export function SoundProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(readMuted);
  const ctxRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    const unlock = () => {
      const Ctor = audioCtor();
      if (!Ctor || ctxRef.current) {
        return;
      }
      ctxRef.current = new Ctor();
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  const play = useCallback((name: SoundName) => {
    const ctx = ctxRef.current;
    if (muted || !ctx) {
      return;
    }
    try {
      RECIPES[name](ctx);
    } catch {
      // 오디오 오류는 게임 진행에 영향을 주지 않는다.
    }
  }, [muted]);

  const toggleMuted = useCallback(() => {
    setMuted((current) => {
      writeMuted(!current);
      return !current;
    });
  }, []);

  const api = useMemo(() => ({ play, muted, toggleMuted }), [play, muted, toggleMuted]);
  return <SoundContext.Provider value={api}>{children}</SoundContext.Provider>;
}

export function useSound(): SoundApi {
  return useContext(SoundContext) ?? SILENT;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm --prefix frontend test -- src/lib/sound.test.tsx`
Expected: PASS (5개)

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/lib/sound.tsx frontend/src/lib/sound.test.tsx
git commit -m "feat: Web Audio로 합성하는 효과음과 음소거 설정

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 게임 선반 화면과 라우팅

**Files:**
- Create: `frontend/src/api/games.ts`
- Modify: `frontend/src/api/types.ts` (`GameSummary`)
- Create: `frontend/src/games/catalog.ts`, `frontend/src/games/catalog.test.ts`
- Create: `frontend/src/games/PaperSafariBoxArt.tsx`, `frontend/src/games/GameBox.tsx`
- Create: `frontend/src/pages/GameShelfPage.tsx`, `frontend/src/pages/GameShelfPage.test.tsx`
- Move+Modify: `frontend/src/pages/LobbyPage.tsx` → `frontend/src/pages/GameLobbyPage.tsx`
- Modify: `frontend/src/App.tsx`, `frontend/src/pages/RoomPage.tsx`

**Interfaces:**
- Consumes: `GET /api/games` (Task 1), `RollingNumber`, `Panel`, `Felt`, `WoodRail`, `Button` (Task 2), `useSound` (Task 3)
- Produces:
  - `type GameSummary = { gameType: GameType; name: string; minPlayers: number; maxPlayers: number; waitingPlayers: number; playingPlayers: number }`
  - `gamesApi.list(): Promise<GameSummary[]>`
  - `type CatalogEntry = { gameType: GameType; slug: string; tagline: string }`; `CATALOG: CatalogEntry[]`; `entryBySlug(slug: string): CatalogEntry | undefined`; `lobbyPath(gameType: GameType): string` (`/games/paper-safari`)
  - `GameShelfPage`, `GameLobbyPage` (route param `slug`)
  - `GameBox({ entry?: CatalogEntry; name: string; onOpen?: () => void })` — `entry`가 없으면 "준비 중" 상자, 버튼 `aria-label`은 `"${name} 열기"` 또는 `"준비 중인 게임"`(disabled)

- [ ] **Step 1: 카탈로그 테스트 작성**

`games/catalog.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { entryBySlug, lobbyPath } from './catalog';

describe('catalog', () => {
  it('게임 종류로 로비 주소를 만든다', () => {
    expect(lobbyPath('PAPER_SAFARI')).toBe('/games/paper-safari');
  });

  it('주소 조각으로 게임을 찾고 모르는 조각은 undefined', () => {
    expect(entryBySlug('paper-safari')?.gameType).toBe('PAPER_SAFARI');
    expect(entryBySlug('chess')).toBeUndefined();
  });
});
```

- [ ] **Step 2: 실패 확인 → 구현**

Run: `npm --prefix frontend test -- src/games/catalog.test.ts` → FAIL

`api/types.ts`에 추가:
```ts
export type GameSummary = {
  gameType: GameType;
  name: string;
  minPlayers: number;
  maxPlayers: number;
  waitingPlayers: number;
  playingPlayers: number;
};
```

`api/games.ts`:
```ts
import { request } from './http';
import type { GameSummary } from './types';

export const gamesApi = {
  list: () => request<GameSummary[]>('/api/games'),
};
```

`games/catalog.ts`:
```ts
import type { GameType } from '../api/types';

export type CatalogEntry = { gameType: GameType; slug: string; tagline: string };

export const CATALOG: CatalogEntry[] = [
  { gameType: 'PAPER_SAFARI', slug: 'paper-safari', tagline: '2~5인 · 낮은 점수를 노려라!' },
];

export const COMING_SOON_SLOTS = 1;

export function entryBySlug(slug: string): CatalogEntry | undefined {
  return CATALOG.find((entry) => entry.slug === slug);
}

export function lobbyPath(gameType: GameType): string {
  const entry = CATALOG.find((item) => item.gameType === gameType);
  return entry ? `/games/${entry.slug}` : '/';
}
```

Run again → PASS

- [ ] **Step 3: 게임 선반 테스트 작성**

`pages/GameShelfPage.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ToastProvider } from '../components/Toast';
import { GameShelfPage } from './GameShelfPage';

const list = vi.fn();
const mine = vi.fn();
vi.mock('../api/games', () => ({ gamesApi: { list: () => list() } }));
vi.mock('../api/rooms', () => ({ roomsApi: { mine: () => mine() } }));

function renderShelf() {
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<GameShelfPage />} />
          <Route path="/games/:slug" element={<p>로비 화면</p>} />
          <Route path="/rooms/:code" element={<p>방 화면</p>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => {
  list.mockReset();
  mine.mockReset();
  mine.mockResolvedValue(undefined);
});

describe('GameShelfPage', () => {
  it('게임 상자와 대기·플레이 인원을 보여준다', async () => {
    list.mockResolvedValue([{ gameType: 'PAPER_SAFARI', name: '페이퍼 사파리', minPlayers: 2, maxPlayers: 5, waitingPlayers: 3, playingPlayers: 6 }]);
    renderShelf();

    expect(await screen.findByLabelText('대기 3명')).toBeInTheDocument();
    expect(screen.getByLabelText('플레이 6명')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '준비 중인 게임' })).toBeDisabled();
  });

  it('인원을 못 불러오면 –로 보여준다', async () => {
    list.mockRejectedValue(new Error('down'));
    renderShelf();

    expect(await screen.findByLabelText('대기 인원 알 수 없음')).toHaveTextContent('–');
  });

  it('게임 상자를 누르면 그 게임 로비로 간다', async () => {
    list.mockResolvedValue([]);
    renderShelf();

    await userEvent.click(screen.getByRole('button', { name: '페이퍼 사파리 열기' }));

    expect(await screen.findByText('로비 화면')).toBeInTheDocument();
  });

  it('이미 방에 있으면 그 방으로 간다', async () => {
    list.mockResolvedValue([]);
    mine.mockResolvedValue({ code: 'ABC234' });
    renderShelf();

    expect(await screen.findByText('방 화면')).toBeInTheDocument();
  });
});
```
(실패 시 토스트는 처음 한 번만. 응답이 비어도 카탈로그의 게임 상자는 항상 보인다 — 이름은 카탈로그가 아니라 응답의 `name`이 있으면 그것, 없으면 기본 이름 `'페이퍼 사파리'`를 쓴다. 기본 이름은 `GameShelfPage` 안의 `DEFAULT_NAMES: Record<GameType, string>`.)

- [ ] **Step 4: 실패 확인**

Run: `npm --prefix frontend test -- src/pages/GameShelfPage.test.tsx` → FAIL

- [ ] **Step 5: 상자 그림과 GameBox 구현**

`games/PaperSafariBoxArt.tsx` — 상자 앞면 SVG (viewBox `0 0 120 150`): 하늘 그라데이션(`#fde7b0`→`#f6c66e`) 위쪽 60%, 아래 풀밭(`#6aa04f`), 노을 해(원, `#fb923c`, 반투명), 지평선의 아카시아 나무 실루엣(갈색 줄기 + 납작한 타원 수관), 가운데 아래쪽에 Task 5의 `Lion` 아트를 재사용(`<Lion />`을 `<g transform="translate(30 62) scale(0.6)">` 안에), 위쪽에 제목 "페이퍼 / 사파리" 두 줄(`font-family: Georgia, serif`, 굵기 900, 색 `#7a2e0a`, 흰 그림자 대신 `paint-order: stroke` + `stroke="#fffaf0" stroke-width="3"`). Task 5보다 먼저 실행되므로, 이 Task에서는 사자 대신 `🦁` 텍스트(`<text font-size="44">`)를 넣고 Task 5 마지막 단계에서 `Lion`으로 바꾼다(Task 5 Step 7에 포함됨).

```tsx
export function PaperSafariBoxArt() {
  return (
    <svg viewBox="0 0 120 150" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id="box-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fde7b0" />
          <stop offset="1" stopColor="#f6c66e" />
        </linearGradient>
      </defs>
      <rect width="120" height="150" fill="url(#box-sky)" />
      <circle cx="88" cy="70" r="22" fill="#fb923c" opacity="0.55" />
      <rect y="92" width="120" height="58" fill="#6aa04f" />
      <path d="M0 92 Q30 86 60 92 T120 92 V100 H0Z" fill="#5f9a4a" />
      <rect x="14" y="70" width="3" height="22" fill="#6b4423" />
      <ellipse cx="15.5" cy="70" rx="14" ry="5" fill="#4d7c3a" />
      <text x="60" y="26" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="900" fontSize="17" fill="#7a2e0a"
        stroke="#fffaf0" strokeWidth="3" paintOrder="stroke">페이퍼</text>
      <text x="60" y="46" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="900" fontSize="17" fill="#7a2e0a"
        stroke="#fffaf0" strokeWidth="3" paintOrder="stroke">사파리</text>
      <g data-box-hero="true"><text x="60" y="128" textAnchor="middle" fontSize="44">🦁</text></g>
    </svg>
  );
}
```

`games/GameBox.tsx`:
```tsx
import { motion } from 'motion/react';
import { useState } from 'react';
import type { CatalogEntry } from './catalog';
import { PaperSafariBoxArt } from './PaperSafariBoxArt';

type Props = { entry?: CatalogEntry; name: string; onOpen?: () => void };

const OPEN_MS = 380;

export function GameBox({ entry, name, onOpen }: Props) {
  const [opening, setOpening] = useState(false);
  const available = Boolean(entry && onOpen);

  const open = () => {
    if (!onOpen || opening) {
      return;
    }
    setOpening(true);
    window.setTimeout(onOpen, OPEN_MS);
  };

  return (
    <motion.button
      type="button"
      aria-label={available ? `${name} 열기` : '준비 중인 게임'}
      disabled={!available}
      onClick={open}
      className="group relative h-[150px] w-[120px] [perspective:700px] disabled:cursor-not-allowed"
      initial={{ y: -30, opacity: 0 }}
      animate={opening ? { scale: 1.25, y: -20, opacity: 0 } : { y: 0, opacity: 1 }}
      transition={{ duration: opening ? OPEN_MS / 1000 : 0.4 }}
    >
      <span className="absolute inset-0 transition-transform duration-200 [transform-style:preserve-3d] [transform:rotateY(-14deg)] group-enabled:group-hover:[transform:rotateY(-4deg)_rotateX(6deg)_translateZ(10px)]">
        <span className="absolute inset-0 overflow-hidden rounded-[4px] shadow-[10px_8px_18px_rgb(0_0_0/0.55)]">
          {available ? <PaperSafariBoxArt /> : <ComingSoonFace />}
        </span>
        <span className={`absolute right-[-16px] top-0 h-full w-4 origin-left [transform:rotateY(90deg)] brightness-[.6] ${available ? 'bg-[#f6c66e]' : 'bg-stone-600'}`} />
        <span className="absolute left-0 top-[-12px] h-3 w-full origin-bottom [transform:rotateX(90deg)] bg-cream-200 brightness-90" />
      </span>
    </motion.button>
  );
}

function ComingSoonFace() {
  return (
    <span className="flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-b from-stone-500 to-stone-700 text-sm font-bold text-stone-200">
      <span aria-hidden="true" className="text-2xl">🔒</span>
      곧 추가돼요
    </span>
  );
}
```

- [ ] **Step 6: GameShelfPage 구현**

```tsx
import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { gamesApi } from '../api/games';
import { messageOf } from '../api/http';
import { roomsApi } from '../api/rooms';
import type { GameSummary, GameType } from '../api/types';
import { RollingNumber } from '../components/RollingNumber';
import { useToast } from '../components/Toast';
import { WoodRail } from '../components/WoodRail';
import { CATALOG, COMING_SOON_SLOTS, lobbyPath } from '../games/catalog';
import { GameBox } from '../games/GameBox';

const POLL_MS = 5000;
const DEFAULT_NAMES: Record<GameType, string> = { PAPER_SAFARI: '페이퍼 사파리' };

function Counts({ summary }: { summary: GameSummary | undefined }) {
  const waiting = summary?.waitingPlayers ?? null;
  const playing = summary?.playingPlayers ?? null;
  return (
    <div className="mt-3 flex justify-center gap-1.5 text-xs font-bold">
      <span aria-label={waiting === null ? '대기 인원 알 수 없음' : `대기 ${waiting}명`}
        className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-900 shadow-[0_2px_0_rgb(0_0_0/0.35)]">
        ⏳ 대기 <RollingNumber value={waiting} />
      </span>
      <span aria-label={playing === null ? '플레이 인원 알 수 없음' : `플레이 ${playing}명`}
        className="rounded-full bg-green-200 px-2 py-0.5 text-green-900 shadow-[0_2px_0_rgb(0_0_0/0.35)]">
        <span aria-hidden="true" className="live-dot mr-1 inline-block h-1.5 w-1.5 rounded-full bg-green-600 align-middle" />
        플레이 <RollingNumber value={playing} />
      </span>
    </div>
  );
}

export function GameShelfPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [summaries, setSummaries] = useState<GameSummary[] | null>(null);
  const failedRef = useRef(false);

  useEffect(() => {
    roomsApi
      .mine()
      .then((room) => {
        if (room) {
          navigate(`/rooms/${room.code}`, { replace: true });
        }
      })
      .catch(() => undefined);
  }, [navigate]);

  const load = useCallback(() => {
    gamesApi
      .list()
      .then((next) => {
        failedRef.current = false;
        setSummaries(next);
      })
      .catch((error) => {
        if (!failedRef.current) {
          toast.show(messageOf(error));
        }
        failedRef.current = true;
        setSummaries(null);
      });
  }, [toast]);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const summaryOf = (gameType: GameType) => summaries?.find((item) => item.gameType === gameType);

  return (
    <div className="mx-auto max-w-4xl pt-6">
      <h1 className="mb-1 text-center text-2xl font-black text-cream-50 drop-shadow">오늘은 뭘 할까요?</h1>
      <p className="mb-8 text-center text-sm text-cream-200/80">선반에서 게임 상자를 골라 주세요</p>
      <div className="flex flex-wrap items-end justify-center gap-10 px-6">
        {CATALOG.map((entry) => {
          const summary = summaryOf(entry.gameType);
          const name = summary?.name ?? DEFAULT_NAMES[entry.gameType];
          return (
            <div key={entry.slug} className="flex flex-col items-center">
              <GameBox entry={entry} name={name} onOpen={() => navigate(lobbyPath(entry.gameType))} />
              <p className="mt-3 text-sm font-bold text-cream-50">{name}</p>
              <p className="text-xs text-cream-200/70">{entry.tagline}</p>
              <Counts summary={summaries ? summary ?? { ...emptySummary(entry.gameType, name) } : undefined} />
            </div>
          );
        })}
        {Array.from({ length: COMING_SOON_SLOTS }, (_, index) => (
          <div key={`soon-${index}`} className="flex flex-col items-center opacity-75">
            <GameBox name="준비 중" />
            <p className="mt-3 text-sm font-bold text-cream-200">준비 중</p>
          </div>
        ))}
      </div>
      <WoodRail className="mx-2 mt-4 h-4" />
    </div>
  );
}

function emptySummary(gameType: GameType, name: string): GameSummary {
  return { gameType, name, minPlayers: 0, maxPlayers: 0, waitingPlayers: 0, playingPlayers: 0 };
}
```
(응답에는 있지만 카탈로그에 없는 게임은 표시하지 않는다. 응답에 없는 카탈로그 게임은 0명으로 표시. 실패 상태(`summaries === null` 이고 이미 실패)면 `undefined`를 넘겨 `–`.)

주의: 처음 로딩 중에도 `summaries === null`이라 `–`가 보인다. 이는 의도된 동작이다(곧 숫자로 굴러 바뀜).

- [ ] **Step 7: 라우팅과 로비 이동**

`git mv frontend/src/pages/LobbyPage.tsx frontend/src/pages/GameLobbyPage.tsx` 후:
- 컴포넌트 이름 `GameLobbyPage`, `const { slug = '' } = useParams(); const entry = entryBySlug(slug);` — `entry`가 없으면 `<Navigate to="/" replace />`. 모든 `GAME` 상수 사용처를 `entry.gameType`으로 바꾼다(훅 규칙 때문에 `const gameType = entry?.gameType ?? 'PAPER_SAFARI'`를 위에서 구하고, early return은 훅 호출 이후 렌더 직전에 둔다).
- 맨 위 제목 줄을 바꾼다: `<Link to="/" className="text-sm font-semibold text-cream-200 hover:text-cream-50">← 게임 선반</Link>`와 작은 상자 그림(`<div className="h-16 w-12 overflow-hidden rounded shadow-lg"><PaperSafariBoxArt /></div>`) + 제목.
- 방 목록 패널은 `<Felt className="p-4">` 안에 종이 카드(`paper p-3`) 목록으로. 각 방 카드: 이름, `👑 방장`, 인원 의자 아이콘(`'●'.repeat(playerCount) + '○'.repeat(maxPlayers - playerCount)`, aria-label `"${playerCount}/${maxPlayers}명"`), 참가 버튼. 목록 등장은 `motion.li`의 `initial={{ y: -16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: index * 0.05 }}`.
- 나머지(방 만들기, 코드 입장, 내 전적, 순위표, 5초 폴링, 이미 방에 있으면 이동)는 그대로.

`App.tsx`:
```tsx
import { MotionConfig } from 'motion/react';
// ...
import { GameLobbyPage } from './pages/GameLobbyPage';
import { GameShelfPage } from './pages/GameShelfPage';
import { SoundProvider } from './lib/sound';

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <SoundProvider>
        <ToastProvider>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route element={<RequireAuth />}>
                <Route element={<Layout />}>
                  <Route path="/" element={<GameShelfPage />} />
                  <Route path="/games/:slug" element={<GameLobbyPage />} />
                  <Route path="/rooms/:code" element={<RoomPage />} />
                  <Route path="/records" element={<RecordsPage />} />
                  <Route path="/records/:memberId" element={<RecordsPage />} />
                </Route>
              </Route>
            </Routes>
          </AuthProvider>
        </ToastProvider>
      </SoundProvider>
    </MotionConfig>
  );
}
```

`RoomPage.tsx`: 나가기 성공과 "방에서 나왔어요" 이동을 `navigate(lobbyPath(room.gameType), { replace: true })`로 바꾼다(`missing`일 때는 여전히 `/`). 두 번째 `useEffect`에서 `room`은 non-null이므로 `room.gameType`을 쓴다.

- [ ] **Step 8: 테스트·빌드 확인**

Run: `npm --prefix frontend test && npm --prefix frontend run build`
Expected: 전부 PASS, 빌드 성공

- [ ] **Step 9: 커밋**

```bash
git add frontend
git commit -m "feat: 로그인 후 게임 선반과 게임별 로비, 대기·플레이 인원 표시

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 카드 일러스트 14종과 3D 카드

**Files:**
- Create: `frontend/src/games/papersafari/cards/palette.ts`
- Create: `frontend/src/games/papersafari/cards/art/{Mouse,Rabbit,Monkey,Zebra,Giraffe,Cheetah,Hippo,Crocodile,Rhino,Lion,Elephant,Tarzan,Fox,Wild}.tsx`
- Create: `frontend/src/games/papersafari/cards/art/index.ts`
- Create: `frontend/src/games/papersafari/cards/CardArt.tsx`, `cards/CardBack.tsx`
- Create: `frontend/src/games/papersafari/cards/CardArt.test.tsx`
- Modify: `frontend/src/games/papersafari/cards.ts` (`cardEmoji` 삭제, `cardName`에 숫자 동물 이름 추가)
- Modify: `frontend/src/games/papersafari/CardFace.tsx`, `CardFace.test.tsx`
- Modify: `frontend/src/games/PaperSafariBoxArt.tsx` (🦁 → `Lion`)
- Modify: `frontend/src/room/WaitingRoom.tsx` 규칙 설명의 이모지(🐘🧔❓)는 그대로 둔다(문장 속 설명용).

**Interfaces:**
- Produces:
  - `ART_BY_KEY: Record<ArtKey, ComponentType>` 와 `type ArtKey = 'mouse'|'rabbit'|'monkey'|'zebra'|'giraffe'|'cheetah'|'hippo'|'crocodile'|'rhino'|'lion'|'elephant'|'tarzan'|'fox'|'wild'`; `artKeyOf(card: CardView): ArtKey`
  - 각 아트 컴포넌트는 인자 없이 `<g>`를 반환하며 **100×100 좌표계**에 그린다(바깥 SVG가 위치시킴).
  - `CardArt({ card }: { card: CardView })` — `viewBox="0 0 100 140"` SVG, 루트에 `data-art={artKey}`
  - `CardBack()` — 같은 viewBox 뒷면 SVG
  - `animalName(card: CardView): string` (cards.ts) — 숫자 0~9: 쥐, 토끼, 원숭이, 얼룩말, 기린, 치타, 하마, 악어, 코뿔소, 사자 / 특수: 코끼리, 타잔, 여우, 와일드
  - `cardLabel(card)` 기존 그대로(aria용: `"7"`, `"타잔 10"`, `"여우 -2"`, `"와일드"`)
  - `CardFace` props 기존 + `size?: 'sm' | 'md' | 'lg'`(기본 `md`), `pulse?: boolean`(클릭 가능 맥박), `sparkle?: boolean`(0점 짝 완성 1회 반짝임)

- [ ] **Step 1: 실패하는 테스트 작성**

`cards/CardArt.test.tsx`:
```tsx
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { CardView } from '../../../api/types';
import { CardArt } from './CardArt';

const NUMBER_KEYS = ['mouse', 'rabbit', 'monkey', 'zebra', 'giraffe', 'cheetah', 'hippo', 'crocodile', 'rhino', 'lion'];

describe('CardArt', () => {
  it.each(NUMBER_KEYS.map((key, value) => [value, key] as const))('숫자 %i은 %s 그림이다', (value, key) => {
    const { container } = render(<CardArt card={{ kind: 'NUMBER', value }} />);

    expect(container.querySelector(`[data-art="${key}"]`)).not.toBeNull();
    expect(container).toHaveTextContent(String(value));
  });

  it.each([
    [{ kind: 'ELEPHANT', value: 10 }, 'elephant', '코끼리'],
    [{ kind: 'TARZAN', value: 10 }, 'tarzan', '타잔'],
    [{ kind: 'FOX', value: -2 }, 'fox', '여우'],
    [{ kind: 'WILD', value: 0 }, 'wild', '와일드'],
  ] as [CardView, string, string][])('특수 카드 %o는 %s 그림과 이름을 그린다', (card, key, name) => {
    const { container } = render(<CardArt card={card} />);

    expect(container.querySelector(`[data-art="${key}"]`)).not.toBeNull();
    expect(container).toHaveTextContent(name);
  });

  it('와일드는 숫자 대신 ?를 그린다', () => {
    const { container } = render(<CardArt card={{ kind: 'WILD', value: 0 }} />);

    expect(container).toHaveTextContent('?');
  });
});
```

`CardFace.test.tsx` 교체(기존 4개 유지 + 강화):
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CardFace } from './CardFace';

describe('CardFace', () => {
  it('값이 없으면 뒷면으로 그린다', () => {
    render(<CardFace card={null} faceUp={false} known={false} />);

    expect(screen.getByLabelText('뒷면 카드')).toHaveAttribute('data-side', 'back');
  });

  it('숫자 카드는 동물 그림과 숫자를 보여준다', () => {
    render(<CardFace card={{ kind: 'NUMBER', value: 7 }} faceUp known={false} />);

    const card = screen.getByLabelText('7 카드');
    expect(card).toHaveAttribute('data-side', 'front');
    expect(card.querySelector('[data-art="crocodile"]')).not.toBeNull();
    expect(card).toHaveTextContent('7');
  });

  it('특수 카드는 이름을 보여준다', () => {
    render(<CardFace card={{ kind: 'TARZAN', value: 10 }} faceUp known={false} />);

    expect(screen.getByLabelText('타잔 10 카드')).toHaveTextContent('타잔');
  });

  it('엿본 카드는 엿봄 표시를 한다', () => {
    render(<CardFace card={{ kind: 'FOX', value: -2 }} faceUp={false} known />);

    const card = screen.getByLabelText('여우 -2 카드 (엿봄)');
    expect(card).toHaveTextContent('👁');
    expect(card).toHaveAttribute('data-side', 'back');
  });

  it('누를 수 없는 카드는 비활성이다', () => {
    render(<CardFace card={{ kind: 'NUMBER', value: 1 }} faceUp known={false} />);

    expect(screen.getByLabelText('1 카드')).toBeDisabled();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm --prefix frontend test -- src/games/papersafari/cards src/games/papersafari/CardFace.test.tsx`
Expected: FAIL

- [ ] **Step 3: 팔레트와 카드 틀 구현**

`cards/palette.ts`:
```ts
export const INK = '#3b2410';
export const PALETTE = {
  skyTop: '#fde7b0', skyBottom: '#f6c66e', grass: '#8fbf6a', grassDark: '#5f9a4a',
  foxSkyTop: '#ffd9bd', foxSkyBottom: '#f7a26a', foxGrass: '#6d8f4a',
  cream: '#fffaf0', gold: '#e0a526', badgeText: '#8a2c0e', foxBadge: '#c2410c',
  tan: '#f2b45a', mane: '#c2611a', muzzle: '#fbe3b5', gray: '#9ca3af', grayDark: '#6b7280',
  brown: '#a16207', brownDark: '#6b3410', green: '#4d7c3a', pink: '#f9a8b8', white: '#ffffff',
} as const;
```

`cards.ts`에서 `NUMBER_EMOJI`, `cardEmoji` 삭제 후 이름 표 추가:
```ts
const NUMBER_NAMES = ['쥐', '토끼', '원숭이', '얼룩말', '기린', '치타', '하마', '악어', '코뿔소', '사자'];

export function animalName(card: CardView): string {
  if (card.kind === 'NUMBER') {
    return NUMBER_NAMES[card.value] ?? '카드';
  }
  return SPECIAL[card.kind].name;
}
```
(`SPECIAL`에서 `emoji` 필드는 제거하고 `name`만 남긴다. `cardName`, `cardLabel`은 그대로.) `cardEmoji`를 쓰는 곳을 `grep -rn cardEmoji frontend/src`로 찾아 모두 없앤다.

`cards/CardArt.tsx`:
```tsx
import type { CardView } from '../../../api/types';
import { animalName } from '../cards';
import { ART_BY_KEY, artKeyOf } from './art';
import { PALETTE } from './palette';

export function CardArt({ card }: { card: CardView }) {
  const key = artKeyOf(card);
  const Art = ART_BY_KEY[key];
  const fox = card.kind === 'FOX';
  const special = card.kind !== 'NUMBER';
  const gid = `sky-${key}`;
  return (
    <svg viewBox="0 0 100 140" className="block h-full w-full" data-art={key} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={fox ? PALETTE.foxSkyTop : PALETTE.skyTop} />
          <stop offset="1" stopColor={fox ? PALETTE.foxSkyBottom : PALETTE.skyBottom} />
        </linearGradient>
      </defs>
      <rect width="100" height="140" rx="9" fill={special ? PALETTE.gold : PALETTE.cream} />
      <rect x="4" y="4" width="92" height="132" rx="6" fill={`url(#${gid})`} />
      <path d="M4 82 Q30 76 50 82 T96 80 V130 Q96 136 90 136 H10 Q4 136 4 130Z" fill={fox ? PALETTE.foxGrass : PALETTE.grass} />
      <path d="M4 96 Q35 90 60 96 T96 94 V130 Q96 136 90 136 H10 Q4 136 4 130Z" fill={PALETTE.grassDark} opacity="0.45" />
      <g transform="translate(6 28) scale(0.88)"><Art /></g>
      <circle cx="19" cy="19" r="13" fill={fox ? PALETTE.foxBadge : PALETTE.cream} stroke={special ? PALETTE.gold : '#e6dcc4'} strokeWidth="2" />
      <text x="19" y="24.5" textAnchor="middle" fontFamily="Georgia, serif" fontWeight="900" fontSize={card.value <= -10 || card.value >= 10 ? 12 : 15}
        fill={fox ? PALETTE.cream : PALETTE.badgeText}>{card.kind === 'WILD' ? '?' : card.value}</text>
      <rect x="22" y="119" width="56" height="13" rx="3" fill={PALETTE.cream} opacity="0.92" />
      <text x="50" y="129" textAnchor="middle" fontSize="9" fontWeight="700" fill={PALETTE.badgeText}>{animalName(card)}</text>
    </svg>
  );
}
```
주의: 같은 페이지에 같은 카드가 여러 장이어도 `id`가 같은 그라데이션은 내용이 같아 시각적으로 문제없다.

`cards/CardBack.tsx`:
```tsx
import { Lion } from './art/Lion';

export function CardBack() {
  return (
    <svg viewBox="0 0 100 140" className="block h-full w-full" aria-hidden="true">
      <defs>
        <pattern id="back-stripes" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="12" height="12" fill="#1f6f45" />
          <rect width="6" height="12" fill="#25804f" />
        </pattern>
      </defs>
      <rect width="100" height="140" rx="9" fill="#fffaf0" />
      <rect x="6" y="6" width="88" height="128" rx="6" fill="url(#back-stripes)" />
      <circle cx="50" cy="70" r="24" fill="#fffaf0" stroke="#f2b33d" strokeWidth="4" />
      <g transform="translate(31 51) scale(0.38)"><Lion /></g>
    </svg>
  );
}
```

- [ ] **Step 4: 동물 아트 14종 그리기**

공통 화풍: 100×100 좌표, 동물은 가운데(대략 x 10~90, y 5~95), 둥근 도형 위주, 외곽선 없음, 각 동물 2~3단 음영(기본색 + 어두운 색 + 밝은 주둥이/배), 눈은 `INK` 원(r≈3.4) + 흰 하이라이트(r≈1), 정면 또는 3/4 측면 상반신. 색은 `PALETTE` 사용. 각 파일은 `export function X() { return <g>…</g>; }`.

예시 — `art/Lion.tsx` (기준 화풍, 그대로 사용):
```tsx
import { INK, PALETTE } from '../palette';

export function Lion() {
  const mane = [[20, 35], [80, 35], [18, 62], [82, 62], [35, 16], [65, 16], [35, 84], [65, 84], [50, 12], [50, 88]];
  return (
    <g>
      <g fill={PALETTE.mane}>
        <circle cx="50" cy="50" r="38" />
        {mane.map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="12" />)}
      </g>
      <circle cx="33" cy="30" r="8" fill={PALETTE.tan} />
      <circle cx="67" cy="30" r="8" fill={PALETTE.tan} />
      <circle cx="50" cy="52" r="27" fill={PALETTE.tan} />
      <ellipse cx="50" cy="65" rx="14" ry="11" fill={PALETTE.muzzle} />
      <circle cx="40" cy="47" r="3.6" fill={INK} /><circle cx="41" cy="46" r="1" fill="#fff" />
      <circle cx="60" cy="47" r="3.6" fill={INK} /><circle cx="61" cy="46" r="1" fill="#fff" />
      <path d="M44.5 58 h11 l-5.5 6z" fill={PALETTE.brownDark} />
      <path d="M50 64 q-5 6 -9 3 M50 64 q5 6 9 3" stroke={PALETTE.brownDark} strokeWidth="2" fill="none" strokeLinecap="round" />
    </g>
  );
}
```

나머지 13종 구성(같은 화풍으로 구현):

| 파일 | 형태 |
|---|---|
| `Mouse` | 회색(`gray`) 둥근 머리 r≈24, 아주 큰 둥근 귀 2개 r≈16(안쪽 `pink` r≈10), 뾰족한 주둥이 쪽 분홍 코, 수염 3쌍(`grayDark` 선), 아래에 작은 몸통 타원 |
| `Rabbit` | 흰(`white`) 머리 r≈22, 위로 긴 귀 2개(타원 rx 8 ry 26, 안쪽 `pink`), 분홍 코, 앞니 2개(흰 사각), 볼 분홍 홍조 |
| `Monkey` | 갈색(`brown`) 머리 r≈26, 양옆 귀 r≈10, 얼굴 안쪽 `muzzle` 하트 모양(두 원 + 아래 타원), 웃는 입, 위쪽 머리털 3가닥 |
| `Zebra` | 흰 말 머리(세로 긴 타원) + 검은 줄무늬 5~6개(`INK` 곡선 path, strokeWidth 5), 위쪽 짧은 갈기(검정 톱니), 어두운 주둥이, 귀 2개 |
| `Giraffe` | 긴 목(아래에서 위로 사다리꼴, `tan`) + 머리 타원, 뿔 2개(막대 + 둥근 끝 `brownDark`), 목과 얼굴에 갈색 무늬 원 6~8개, 3/4 측면 |
| `Cheetah` | `tan`보다 밝은 노랑(`#f5c45a`) 머리 r≈26, 작은 귀, 검은 점 무늬 다수(r 2~3), 눈 아래 검은 눈물 줄 2개(곡선), 흰 주둥이 |
| `Hippo` | 넓은 회보라(`#a79bb5`) 머리(가로 큰 타원 rx 34 ry 26), 위에 작은 귀와 눈, 아래쪽 큰 주둥이 타원(밝은 `#c4b8d1`), 콧구멍 2개, 아래 이빨 2개 |
| `Crocodile` | 초록(`green`) 길게 누운 머리(가로 긴 둥근 사각형), 위쪽 볼록한 눈 2개, 지그재그 흰 이빨 줄, 등 비늘 삼각형 3~4개, 물결(파란 반투명 곡선) 아래 |
| `Rhino` | 회색 큰 머리(둥근 사다리꼴), 앞 큰 뿔 + 뒤 작은 뿔(밝은 `#e5e1d8`), 양옆 작은 귀, 주름 선 2개 |
| `Elephant` | 회색(`gray`) 머리 r≈24, 양옆 매우 큰 귀(타원 rx 22, 안쪽 `pink` 살짝), 아래로 내려와 끝이 말린 코(굵은 path strokeWidth 10 strokeLinecap round), 상아 2개(흰 곡선) |
| `Tarzan` | 사람 얼굴(살구색 `#f1c27d` r≈22), 덥수룩한 갈색 머리(위쪽 큰 톱니 모양 `brownDark`), 표범무늬 어깨끈(노랑 + 검은 점), 뒤에 비스듬한 덩굴(초록 굵은 곡선 + 잎 타원 3개), 씩 웃는 입 |
| `Fox` | 주황(`#e8742a`) 뾰족한 머리(위가 넓은 역삼각 path), 뾰족 귀 2개(안쪽 `INK` 반투명), 흰 볼(아래쪽 `cream`), 검은 코, 가는 눈 |
| `Wild` | 동물 대신 "?"를 든 무지개 원: 가운데 원 r≈30에 5색 원호(빨/주/노/초/파 strokeWidth 6), 안에 큰 `?`(Georgia 900, 크기 44, `badgeText`), 주변 반짝임 별 4개(작은 4꼭지 path, `gold`) |

`art/index.ts`:
```ts
import type { ComponentType } from 'react';
import type { CardView } from '../../../../api/types';
import { Cheetah } from './Cheetah';
import { Crocodile } from './Crocodile';
import { Elephant } from './Elephant';
import { Fox } from './Fox';
import { Giraffe } from './Giraffe';
import { Hippo } from './Hippo';
import { Lion } from './Lion';
import { Monkey } from './Monkey';
import { Mouse } from './Mouse';
import { Rabbit } from './Rabbit';
import { Rhino } from './Rhino';
import { Tarzan } from './Tarzan';
import { Wild } from './Wild';
import { Zebra } from './Zebra';

export type ArtKey = 'mouse' | 'rabbit' | 'monkey' | 'zebra' | 'giraffe' | 'cheetah' | 'hippo' | 'crocodile' | 'rhino'
  | 'lion' | 'elephant' | 'tarzan' | 'fox' | 'wild';

const NUMBER_KEYS: ArtKey[] = ['mouse', 'rabbit', 'monkey', 'zebra', 'giraffe', 'cheetah', 'hippo', 'crocodile', 'rhino', 'lion'];
const SPECIAL_KEYS = { ELEPHANT: 'elephant', TARZAN: 'tarzan', FOX: 'fox', WILD: 'wild' } as const;

export const ART_BY_KEY: Record<ArtKey, ComponentType> = {
  mouse: Mouse, rabbit: Rabbit, monkey: Monkey, zebra: Zebra, giraffe: Giraffe, cheetah: Cheetah, hippo: Hippo,
  crocodile: Crocodile, rhino: Rhino, lion: Lion, elephant: Elephant, tarzan: Tarzan, fox: Fox, wild: Wild,
};

export function artKeyOf(card: CardView): ArtKey {
  if (card.kind === 'NUMBER') {
    return NUMBER_KEYS[card.value] ?? 'wild';
  }
  return SPECIAL_KEYS[card.kind];
}
```

그린 뒤 눈으로 확인한다: scratchpad(커밋하지 않는 임시 폴더)에서 `react-dom/server`의 `renderToStaticMarkup`으로 14장을 한 HTML에 뽑아 브라우저 스크린샷으로 보고, 형태가 알아보기 어렵거나 화풍이 어긋난 동물은 고친다. 시트 파일은 커밋하지 않는다. 최종 모습은 Task 10의 실제 플레이에서 다시 본다.

- [ ] **Step 5: CardFace 재작성**

```tsx
import type { CardView } from '../../api/types';
import { cardLabel } from './cards';
import { CardArt } from './cards/CardArt';
import { CardBack } from './cards/CardBack';

type Props = {
  card: CardView | null;
  faceUp: boolean;
  known: boolean;
  size?: 'sm' | 'md' | 'lg';
  highlight?: boolean;
  pulse?: boolean;
  sparkle?: boolean;
  onClick?: () => void;
};

const SIZES = { sm: 'h-[67px] w-12', md: 'h-[90px] w-16', lg: 'h-28 w-20' };

function labelOf(card: CardView | null, faceUp: boolean, known: boolean): string {
  if (!card) {
    return '뒷면 카드';
  }
  return `${cardLabel(card)} 카드${known && !faceUp ? ' (엿봄)' : ''}`;
}

export function CardFace({ card, faceUp, known, size = 'md', highlight = false, pulse = false, sparkle = false, onClick }: Props) {
  const showFront = card !== null && faceUp;
  const peeked = card !== null && known && !faceUp;
  const ring = highlight ? 'ring-[3px] ring-mustard-400 shadow-[0_0_14px_rgb(242_179_61/0.8)]' : '';
  const clickable = onClick ? 'cursor-pointer hover:-translate-y-1.5 hover:rotate-[-1.5deg] focus-visible:-translate-y-1.5' : 'cursor-default';
  return (
    <button
      type="button"
      aria-label={labelOf(card, faceUp, known)}
      data-side={showFront ? 'front' : 'back'}
      disabled={!onClick}
      onClick={onClick}
      className={`card-3d relative block select-none rounded-[10%/7%] transition-transform duration-150 outline-none focus-visible:ring-4 focus-visible:ring-mustard-300 ${SIZES[size]} ${clickable} ${pulse ? 'float-hint' : ''}`}
    >
      <span className={`card-inner card-thick block rounded-[10%/7%] ${ring} ${sparkle ? 'gold-sparkle' : ''}`}
        style={{ transform: showFront ? 'rotateY(0deg)' : 'rotateY(180deg)' }}>
        <span className="card-side">{card ? <CardArt card={card} /> : null}</span>
        <span className="card-side is-back"><CardBack /></span>
      </span>
      {peeked ? (
        <span className="pointer-events-none absolute inset-0 opacity-45"><CardArt card={card} /></span>
      ) : null}
      {peeked ? (
        <span className="absolute -right-1.5 -top-1.5 rounded-full bg-cream-50 px-1 text-xs shadow">👁</span>
      ) : null}
    </button>
  );
}
```
주의: 뒷면이 보일 때도 `card`가 있으면(엿봄) 앞면 SVG가 DOM에 있으므로 `toHaveTextContent('타잔')` 류가 통과한다. `card === null`이면 앞면을 그리지 않아 숨김 정보가 DOM에 없다.

`PaperSafariBoxArt.tsx`의 `<g data-box-hero="true">…🦁…</g>`를 `<g transform="translate(32 92) scale(0.56)"><Lion /></g>`로 교체.

- [ ] **Step 6: 테스트 통과 확인**

Run: `npm --prefix frontend test`
Expected: 전부 PASS (`PlayerBoard.test`, `PaperSafariTable.test`가 이모지를 단언했다면 aria-label/`data-art` 기준으로 고친다)

- [ ] **Step 7: 커밋**

```bash
git add frontend
git commit -m "feat: 동물 14종 SVG 카드 일러스트와 3D로 뒤집히는 카드

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 게임 테이블 배치 (PC 둘러앉기 / 모바일 위쪽 줄) + HUD

**Files:**
- Create: `frontend/src/games/papersafari/motion/zones.ts`
- Create: `frontend/src/games/papersafari/motion/ZoneAnchor.tsx`
- Create: `frontend/src/games/papersafari/layout/seats.ts`, `layout/seats.test.ts`
- Create: `frontend/src/games/papersafari/layout/Seat.tsx`, `layout/CenterPiles.tsx`, `layout/Hud.tsx`, `layout/TableRound.tsx`, `layout/TableRail.tsx`
- Modify: `frontend/src/games/papersafari/PlayerBoard.tsx`, `PlayerBoard.test.tsx`
- Modify: `frontend/src/games/papersafari/PaperSafariTable.tsx`, `PaperSafariTable.test.tsx`

**Interfaces:**
- Consumes: `CardFace`(Task 5), `Felt`, `WoodRail`, `Button`, `PC_QUERY`, `useMediaQuery`(Task 2)
- Produces:
  - `zones.ts`: `type Zone = { kind: 'deck' } | { kind: 'discard' } | { kind: 'hand'; playerId: number } | { kind: 'slot'; playerId: number; column: number; row: number }`; `type SlotZone = Extract<Zone, { kind: 'slot' }>`; `zoneKey(zone: Zone): string` → `'deck'`, `'discard'`, `'hand:7'`, `'slot:7:2:1'`
  - `ZoneAnchor({ zone: Zone; children; className? })` — `<div data-zone={zoneKey(zone)} className=… style={{ visibility: hidden ? 'hidden' : undefined }}>`; 숨김 여부는 `HiddenZonesContext`(같은 파일 export: `HiddenZonesContext = createContext<ReadonlySet<string>>(new Set())`)에서 읽는다
  - `seats.ts`: `type SeatPosition = 'left' | 'top-left' | 'top' | 'top-right' | 'right'`; `seatOrder(playerIds: number[], meId: number): number[]`(나 다음 사람부터 시계방향, 나 제외); `seatPositions(count: number): SeatPosition[]` (1→`['top']`, 2→`['top-left','top-right']`, 3→`['left','top','right']`, 4→`['left','top-left','top-right','right']`)
  - `TableProps`(TableRound/TableRail 공통): `{ view, meId, nicknameOf, presenceOf, tokensOf, canClickSlot, clickSlot, drawable, onDrawDeck, onDrawDiscard, canDiscard, onDiscard, instructionText, log, myTurn }` — 정확한 타입은 아래 Step 5 코드
  - `PlayerBoard` props 기존 + `size?: 'sm'|'md'|'lg'`, `pulseSlots?: boolean`, 각 슬롯을 `ZoneAnchor(slot zone)`으로 감싼다(`data-testid="slot"`은 ZoneAnchor 안쪽 div에 유지)

- [ ] **Step 1: seats 테스트 작성**

```ts
import { describe, expect, it } from 'vitest';
import { seatOrder, seatPositions } from './seats';

describe('seats', () => {
  it('나 다음 사람부터 시계방향으로 상대를 나열한다', () => {
    expect(seatOrder([5, 1, 9, 3], 9)).toEqual([3, 5, 1]);
    expect(seatOrder([1, 2], 1)).toEqual([2]);
  });

  it('관전자(내가 없는 판)는 처음부터 모두 나열한다', () => {
    expect(seatOrder([4, 6], 99)).toEqual([4, 6]);
  });

  it.each([
    [1, ['top']],
    [2, ['top-left', 'top-right']],
    [3, ['left', 'top', 'right']],
    [4, ['left', 'top-left', 'top-right', 'right']],
  ])('상대 %i명의 자리', (count, expected) => {
    expect(seatPositions(count)).toEqual(expected);
  });
});
```

- [ ] **Step 2: 실패 확인 → 구현**

Run: `npm --prefix frontend test -- src/games/papersafari/layout/seats.test.ts` → FAIL

`layout/seats.ts`:
```ts
export type SeatPosition = 'left' | 'top-left' | 'top' | 'top-right' | 'right';

const POSITIONS: Record<number, SeatPosition[]> = {
  0: [],
  1: ['top'],
  2: ['top-left', 'top-right'],
  3: ['left', 'top', 'right'],
  4: ['left', 'top-left', 'top-right', 'right'],
};

export function seatOrder(playerIds: number[], meId: number): number[] {
  const index = playerIds.indexOf(meId);
  if (index < 0) {
    return [...playerIds];
  }
  return [...playerIds.slice(index + 1), ...playerIds.slice(0, index)];
}

export function seatPositions(count: number): SeatPosition[] {
  return POSITIONS[count] ?? POSITIONS[4];
}
```
(서버의 `boards` 순서가 좌석 순서이고, 엔진의 "왼쪽 사람"은 다음 좌석이다. 화면에서 나는 아래에 앉으므로 다음 좌석(=내 왼쪽)이 화면 왼쪽부터 시계방향으로 놓인다.)

Run → PASS

- [ ] **Step 3: zones와 ZoneAnchor 구현**

`motion/zones.ts`:
```ts
export type Zone =
  | { kind: 'deck' }
  | { kind: 'discard' }
  | { kind: 'hand'; playerId: number }
  | { kind: 'slot'; playerId: number; column: number; row: number };
export type SlotZone = Extract<Zone, { kind: 'slot' }>;

export const DECK: Zone = { kind: 'deck' };
export const DISCARD: Zone = { kind: 'discard' };

export function handZone(playerId: number): Zone {
  return { kind: 'hand', playerId };
}

export function slotZone(playerId: number, column: number, row: number): SlotZone {
  return { kind: 'slot', playerId, column, row };
}

export function zoneKey(zone: Zone): string {
  if (zone.kind === 'hand') {
    return `hand:${zone.playerId}`;
  }
  if (zone.kind === 'slot') {
    return `slot:${zone.playerId}:${zone.column}:${zone.row}`;
  }
  return zone.kind;
}
```

`motion/ZoneAnchor.tsx`:
```tsx
import { createContext, useContext, type ReactNode } from 'react';
import { zoneKey, type Zone } from './zones';

export const HiddenZonesContext = createContext<ReadonlySet<string>>(new Set());

type Props = { zone: Zone; children: ReactNode; className?: string };

export function ZoneAnchor({ zone, children, className = '' }: Props) {
  const hidden = useContext(HiddenZonesContext);
  const key = zoneKey(zone);
  return (
    <div data-zone={key} className={className} style={{ visibility: hidden.has(key) ? 'hidden' : undefined }}>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: PlayerBoard 재질 변경**

`PlayerBoard.tsx` 변경점(로직·props 유지):
- 바깥 상자: `active ? 'turn-glow' : ''` 를 이름표에 적용. 판 자체는 펠트 위에 놓이므로 배경 없이 `rounded-2xl bg-black/15 p-2 backdrop-blur-[1px]`.
- 이름표: `<span className="rounded-full bg-cream-50 px-2.5 py-0.5 text-xs font-bold text-wood-800 shadow-[0_2px_0_rgb(0_0_0/0.3)]">` — 차례면 `bg-mustard-400 turn-glow`.
- 토큰: 작은 금화 3개 — `<span aria-label={`토큰 ${tokens}개`}>`안에 `●`/`○` 대신 `<i>` 원 3개(획득 `bg-mustard-400 shadow-[inset_0_-2px_0_var(--color-mustard-600)]`, 미획득 `bg-black/25`), 각 `h-3 w-3 rounded-full inline-block`. aria-label은 그대로.
- 슬롯: 
```tsx
<ZoneAnchor key={`${slot.column}-${slot.row}`} zone={slotZone(board.playerId, slot.column, slot.row)}>
  <div data-testid="slot" data-zero-pair={zeroColumns.has(slot.column)}>
    <CardFace card={slot.card} faceUp={slot.faceUp} known={slot.known} size={size}
      highlight={zeroColumns.has(slot.column)} pulse={clickable && pulseSlots}
      onClick={clickable ? () => onSlotClick?.(slot) : undefined} />
  </div>
</ZoneAnchor>
```
- 그리드 간격: `gap-1.5`(sm), `gap-2.5`(md/lg).
- 0점 짝 반짝임: `PlayerBoard` 안에서 `useRef<Set<number>>`로 이전 `zeroColumns`를 기억하고, 새로 생긴 열만 `sparkle` true로 1회(다음 렌더에서 ref 갱신). 구현:
```tsx
const previousZero = useRef<Set<number>>(zeroColumns);
const fresh = new Set([...zeroColumns].filter((column) => !previousZero.current.has(column)));
useEffect(() => {
  previousZero.current = zeroColumns;
});
// CardFace에 sparkle={fresh.has(slot.column)}
```
`PlayerBoard.test.tsx`의 기존 단언(`data-zero-pair`, 상대 뒷면 값 없음)은 유지된다. 토큰 aria-label 단언이 있다면 그대로 통과.

- [ ] **Step 5: 공통 조각과 두 배치 구현**

`layout/CenterPiles.tsx` — 덱과 버린 카드 더미:
```tsx
import type { CardView } from '../../../api/types';
import { CardFace } from '../CardFace';
import { CardBack } from '../cards/CardBack';
import { ZoneAnchor } from '../motion/ZoneAnchor';
import { DECK, DISCARD } from '../motion/zones';

const SIZE_CLASS = { md: 'h-[90px] w-16', lg: 'h-28 w-20' };

type Props = { deckSize: number; discardTop: CardView | null; drawable: boolean; onDrawDeck: () => void; onDrawDiscard: () => void; size: 'md' | 'lg' };

function deckLayers(deckSize: number): number {
  return Math.max(1, Math.min(4, Math.ceil(deckSize / 12)));
}

export function CenterPiles({ deckSize, discardTop, drawable, onDrawDeck, onDrawDiscard, size }: Props) {
  const layers = deckLayers(deckSize);
  return (
    <div className="flex items-end gap-6">
      <div className="flex flex-col items-center gap-1">
        <ZoneAnchor zone={DECK} className="relative">
          {Array.from({ length: layers - 1 }, (_, index) => (
            <span key={index} aria-hidden="true" className={`card-thick absolute block overflow-hidden rounded-[10%/7%] ${SIZE_CLASS[size]}`}
              style={{ transform: `translate(${(index + 1) * 2}px, ${(index + 1) * 2}px)` }}>
              <CardBack />
            </span>
          ))}
          <button type="button" aria-label="덱에서 뽑기" disabled={!drawable} onClick={onDrawDeck}
            className={`press-3d card-thick relative block overflow-hidden rounded-[10%/7%] disabled:cursor-default ${SIZE_CLASS[size]} ${drawable ? 'float-hint' : ''}`}>
            <CardBack />
          </button>
        </ZoneAnchor>
        <span className="rounded-full bg-black/35 px-2 text-xs font-bold text-cream-50">덱 {deckSize}장</span>
      </div>
      <div className="flex flex-col items-center gap-1">
        <ZoneAnchor zone={DISCARD}>
          {discardTop ? (
            <CardFace card={discardTop} faceUp known={false} size={size} pulse={drawable}
              onClick={drawable ? onDrawDiscard : undefined} />
          ) : (
            <div className={`${SIZE_CLASS[size]} rounded-[10%/7%] border-2 border-dashed border-cream-50/40`} />
          )}
        </ZoneAnchor>
        <span className="rounded-full bg-black/35 px-2 text-xs font-bold text-cream-50">버린 카드</span>
      </div>
    </div>
  );
}
```
주의: 덱은 `CardFace`(버튼)를 쓰지 않고 `CardBack`을 직접 그린다 — 버튼 안에 버튼이 들어가지 않게 하기 위해서다. 기존 테스트 `getByRole('button', { name: '덱에서 뽑기' })`가 그대로 동작한다.

`layout/Seat.tsx` — 한 사람의 자리(판 + 손에 든 카드 + 이름표):
```tsx
import type { BoardView, HeldView, SlotView } from '../../../api/types';
import { CardFace } from '../CardFace';
import { PlayerBoard } from '../PlayerBoard';
import { ZoneAnchor } from '../motion/ZoneAnchor';
import { handZone } from '../motion/zones';

export type Presence = { connected?: boolean; offlineSeconds?: number; onForfeit?: () => void };

type Props = {
  board: BoardView;
  nickname: string;
  tokens: number;
  active: boolean;
  held: HeldView | null;
  size: 'sm' | 'md' | 'lg';
  presence: Presence;
  handLabel: string;
  onSlotClick?: (slot: SlotView) => void;
  canClick?: (slot: SlotView) => boolean;
  pulseSlots?: boolean;
};

export function Seat({ board, nickname, tokens, active, held, size, presence, handLabel, onSlotClick, canClick, pulseSlots }: Props) {
  const holding = held !== null && held.playerId === board.playerId;
  return (
    <div className="relative flex items-start gap-2">
      <PlayerBoard board={board} nickname={nickname} tokens={tokens} active={active} size={size}
        onSlotClick={onSlotClick} canClick={canClick} pulseSlots={pulseSlots} {...presence} />
      <ZoneAnchor zone={handZone(board.playerId)} className="mt-6 w-12 shrink-0">
        {holding ? (
          <div className="-rotate-6 -translate-y-2 drop-shadow-xl" aria-label={handLabel}>
            <CardFace card={held.card} faceUp={held.card !== null} known={false} size={size === 'lg' ? 'md' : 'sm'} />
          </div>
        ) : null}
      </ZoneAnchor>
    </div>
  );
}
```

`layout/Hud.tsx` — 라운드/안내/기록:
```tsx
import { useState } from 'react';

type Props = { roundNumber: number; instruction: string; myTurn: boolean; log: string[] };

export function Hud({ roundNumber, instruction, myTurn, log }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="rounded-lg bg-black/35 px-3 py-1 text-sm font-bold text-cream-50">🦁 {roundNumber}라운드</span>
      <p role="status" className={`rounded-full px-4 py-1.5 text-sm font-bold shadow-[0_3px_0_rgb(0_0_0/0.3)] ${myTurn ? 'turn-glow bg-mustard-400 text-wood-800' : 'bg-cream-50 text-wood-800'}`}>
        {instruction}
      </p>
      <div className="relative">
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}
          className="press-3d rounded-lg bg-cream-50 px-3 py-1 text-xs font-bold text-wood-800 shadow-[0_3px_0_var(--color-cream-300)]">
          📜 진행 기록
        </button>
        {open ? (
          <div className="paper absolute right-0 top-9 z-30 w-72 p-3">
            <h3 className="mb-1 text-sm font-bold">진행 기록</h3>
            <ul className="space-y-0.5 text-sm text-stone-600">
              {log.length === 0 ? <li className="text-stone-400">아직 기록이 없어요.</li> : null}
              {log.map((line, index) => <li key={`${index}-${line}`}>{line}</li>)}
            </ul>
          </div>
        ) : null}
      </div>
      {log[0] ? <p className="w-full text-center text-xs text-cream-200/80">{log[0]}</p> : null}
    </div>
  );
}
```

`PaperSafariTable.tsx` 재구성 — 판정 로직(`instruction`, `canClickSlot`, `clickSlot`, `send` 잠금, `presenceOf`, `tokensOf`, `estimate`, `canDiscard`)은 그대로 두고, 렌더 부분만 교체:
```tsx
export type TableProps = {
  view: PaperSafariSessionView;
  meId: number;
  opponents: BoardView[];      // seatOrder 순서
  myBoard: BoardView | undefined;
  nicknameOf: (memberId: number) => string;
  presenceOf: (memberId: number) => Presence;
  tokensOf: (memberId: number) => number;
  canClickSlot: (slot: SlotView) => boolean;
  clickSlot: (slot: SlotView) => void;
  drawable: boolean;
  send: (action: GameAction) => void;
  canDiscard: boolean;
  myTurn: boolean;
  estimate: { score: number; hidden: number } | null;
  instructionText: string;
  log: string[];
  footer: ReactNode;            // 버리기·예상 점수 줄
};
```
- `opponents`는 `seatOrder(round.boards.map(b => b.playerId), meId)`로 정렬한 보드.
- `footer`는 기존 "버리기 버튼 + 현재 예상 점수" JSX(문구 그대로: `버리기`, `현재 예상 점수`, `(+ 가려진 N장)`). 관전자면 `"이번 게임을 지켜보는 중이에요."`.
- `const wide = useMediaQuery(PC_QUERY); const Layout = wide ? TableRound : TableRail;` 그리고 `<Layout {...tableProps} />`, 그 뒤에 기존처럼 `ROUND_OVER`면 `RoundResultModal`.

`layout/TableRound.tsx` (PC):
```tsx
import { Felt } from '../../../components/Felt';
import { CenterPiles } from './CenterPiles';
import { Hud } from './Hud';
import { Seat } from './Seat';
import { seatPositions, type SeatPosition } from './seats';
import type { TableProps } from '../PaperSafariTable';

const POSITION_CLASS: Record<SeatPosition, string> = {
  left: 'absolute left-6 top-[38%] -translate-y-1/2',
  'top-left': 'absolute left-[22%] top-6 -translate-x-1/2',
  top: 'absolute left-1/2 top-6 -translate-x-1/2',
  'top-right': 'absolute left-[78%] top-6 -translate-x-1/2',
  right: 'absolute right-6 top-[38%] -translate-y-1/2',
};

export function TableRound(props: TableProps) {
  const { view, meId, opponents, myBoard, nicknameOf, presenceOf, tokensOf, canClickSlot, clickSlot, drawable, send, myTurn, instructionText, log, footer } = props;
  const round = view.game.round;
  const positions = seatPositions(opponents.length);
  return (
    <div className="space-y-3">
      <Hud roundNumber={view.game.roundNumber} instruction={instructionText} myTurn={myTurn} log={log} />
      <Felt shape="oval" className="mx-auto h-[min(78vh,760px)] w-full max-w-6xl">
        {opponents.map((board, index) => (
          <div key={board.playerId} className={POSITION_CLASS[positions[index]]}>
            <Seat board={board} nickname={nicknameOf(board.playerId)} tokens={tokensOf(board.playerId)}
              active={round.currentPlayerId === board.playerId} held={round.held} size="sm" presence={presenceOf(board.playerId)}
              handLabel={`${nicknameOf(board.playerId)}님이 들고 있는 카드`} />
          </div>
        ))}
        <div className="absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2">
          <CenterPiles deckSize={round.deckSize} discardTop={round.discardTop} drawable={drawable} size="md"
            onDrawDeck={() => send({ type: 'DRAW_DECK' })} onDrawDiscard={() => send({ type: 'DRAW_DISCARD' })} />
        </div>
        {myBoard ? (
          <div className={`absolute bottom-5 left-1/2 -translate-x-1/2 transition-transform duration-300 ${myTurn ? '-translate-y-2' : ''}`}>
            <Seat board={myBoard} nickname={`${nicknameOf(meId)} (나)`} tokens={tokensOf(meId)} active={myTurn}
              held={round.held} size="lg" presence={{}} handLabel="들고 있는 카드" onSlotClick={clickSlot} canClick={canClickSlot} pulseSlots={myTurn} />
          </div>
        ) : null}
      </Felt>
      <div className="mx-auto max-w-md">{footer}</div>
    </div>
  );
}
```

`layout/TableRail.tsx` (모바일·태블릿):
```tsx
import { Felt } from '../../../components/Felt';
import { WoodRail } from '../../../components/WoodRail';
import { CenterPiles } from './CenterPiles';
import { Hud } from './Hud';
import { Seat } from './Seat';
import type { TableProps } from '../PaperSafariTable';

export function TableRail(props: TableProps) {
  const { view, meId, opponents, myBoard, nicknameOf, presenceOf, tokensOf, canClickSlot, clickSlot, drawable, send, myTurn, instructionText, log, footer } = props;
  const round = view.game.round;
  return (
    <div className="space-y-3">
      <Hud roundNumber={view.game.roundNumber} instruction={instructionText} myTurn={myTurn} log={log} />
      <WoodRail className="flex gap-3 overflow-x-auto px-3 py-2">
        {opponents.map((board) => (
          <div key={board.playerId} className="shrink-0">
            <Seat board={board} nickname={nicknameOf(board.playerId)} tokens={tokensOf(board.playerId)}
              active={round.currentPlayerId === board.playerId} held={round.held} size="sm" presence={presenceOf(board.playerId)}
              handLabel={`${nicknameOf(board.playerId)}님이 들고 있는 카드`} />
          </div>
        ))}
      </WoodRail>
      <Felt className="flex flex-col items-center gap-5 px-3 py-6">
        <CenterPiles deckSize={round.deckSize} discardTop={round.discardTop} drawable={drawable} size="md"
          onDrawDeck={() => send({ type: 'DRAW_DECK' })} onDrawDiscard={() => send({ type: 'DRAW_DISCARD' })} />
        {myBoard ? (
          <Seat board={myBoard} nickname={`${nicknameOf(meId)} (나)`} tokens={tokensOf(meId)} active={myTurn}
            held={round.held} size="md" presence={{}} handLabel="들고 있는 카드" onSlotClick={clickSlot} canClick={canClickSlot} pulseSlots={myTurn} />
        ) : null}
      </Felt>
      <div className="mx-auto max-w-md">{footer}</div>
    </div>
  );
}
```
두 배치 모두 DOM 순서가 "상대들 → 더미 → 내 판"이라 `getAllByTestId('slot').slice(-6)`이 내 판이다.

`Seat`의 `handLabel`: 내 자리는 `'들고 있는 카드'`, 상대는 `` `${nicknameOf(board.playerId)}님이 들고 있는 카드` ``. (TableRound/TableRail 코드의 모든 `<Seat …>`에 이 prop을 넣는다.) 기존 테스트가 옛 문구(`…님이 덱에서 가져온 카드`)를 단언하면 `getByLabelText('들고 있는 카드')` / `getByLabelText('밥님이 들고 있는 카드')`로 바꾼다.

- [ ] **Step 6: 배치 분기 테스트 추가**

`PaperSafariTable.test.tsx` 맨 아래에 추가하고, 기존 행동 테스트 전체를 **두 배치에서 모두** 돌린다:
```tsx
import { setMediaMatches } from '../../test/media';

describe.each([
  ['PC', true],
  ['모바일', false],
])('%s 배치에서도 행동 규칙이 같다', (_, wide) => {
  it('DRAW: 내 차례에 덱에서 뽑으면 DRAW_DECK을 보낸다', async () => {
    setMediaMatches(wide);
    const send = renderTable({ phase: 'DRAW', current: ME });

    await userEvent.click(screen.getByRole('button', { name: '덱에서 뽑기' }));

    expect(send).toHaveBeenCalledWith({ type: 'DRAW_DECK' });
  });

  it('PLACE: 내 카드를 누르면 SWAP을 보낸다', async () => {
    setMediaMatches(wide);
    const send = renderTable({ phase: 'PLACE', current: ME, held: { playerId: ME, source: 'DECK', card: { kind: 'NUMBER', value: 3 } } });

    await userEvent.click(mySlotButtons()[0]);

    expect(send).toHaveBeenCalledWith({ type: 'SWAP', column: 0, row: 0 });
  });
});

it('게임 중 화면 폭이 바뀌어도 내 판이 마지막 슬롯 6개다', () => {
  renderTable({ phase: 'DRAW', current: ME });
  expect(screen.getAllByTestId('slot')).toHaveLength(12);

  act(() => setMediaMatches(false));

  expect(screen.getAllByTestId('slot')).toHaveLength(12);
  expect(mySlotButtons()).toHaveLength(6);
});
```
(`act`는 `@testing-library/react`에서 import)

- [ ] **Step 7: 테스트 통과 확인**

Run: `npm --prefix frontend test && npm --prefix frontend run build`
Expected: 전부 PASS

- [ ] **Step 8: 커밋**

```bash
git add frontend
git commit -m "feat: PC는 둘러앉는 펠트 테이블, 모바일은 상대 선반 배치

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 상태 비교로 카드 움직임 추론 (`inferMoves`)

**Files:**
- Create: `frontend/src/games/papersafari/motion/inferMoves.ts`
- Test: `frontend/src/games/papersafari/motion/inferMoves.test.ts`

**Interfaces:**
- Consumes: `Zone`, `SlotZone`, `DECK`, `DISCARD`, `handZone`, `slotZone` (Task 6 `zones.ts`)
- Produces:
```ts
export type Move =
  | { kind: 'travel'; from: Zone; to: Zone; card: CardView | null }
  | { kind: 'flip'; at: SlotZone }
  | { kind: 'peek'; at: SlotZone }
  | { kind: 'deal'; playerIds: number[] };
export function inferMoves(prev: PaperSafariView | null, next: PaperSafariView): Move[];
```

규칙(스펙 6.2 + 이 계획의 확정):
1. `next.round.phase === 'ROUND_OVER'` 또는 `next.status === 'GAME_OVER'` → `[]` (결과 모달이 연출 담당).
2. **나눠 주기**: `next.round.phase === 'SETUP_FLIP'`이고 모든 칸이 뒷면(`faceUp` false)이며 (`prev === null` 또는 `next.roundNumber > prev.roundNumber` 또는 `prev.status === 'GAME_OVER'`) → `[{ kind: 'deal', playerIds: next.round.boards.map(b => b.playerId) }]`.
3. 그 밖에 `prev === null` 또는 라운드 번호가 다르면 `[]`.
4. 같은 라운드에서:
   - `held` 없음 → 있음(source DECK): `travel deck → hand(p)`, card = `next.round.held.card`.
   - `held` 없음 → 있음(source DISCARD): `travel discard → hand(p)`, card = `prev.round.discardTop`.
   - `held` 있음 → 없음: 바뀐 칸 찾기 — 각 보드의 각 칸에 대해 `faceUp`, `known`, `card`(kind·value) 중 하나라도 다르면 "바뀐 칸".
     - 쥔 사람 p의 보드에 바뀐 칸 X가 있으면: `travel hand(p) → slot(p,X)` (card = next 칸 X의 card), 그리고
       - 다른 보드 q에 같은 위치 X가 바뀌었으면(타잔): `travel slot(p,X) → slot(q,X)` (card = next q의 X 칸 card), `travel slot(q,X) → discard` (card = next discardTop)
       - 아니면 `travel slot(p,X) → discard` (card = next discardTop)
     - p의 보드에 바뀐 칸이 없으면: `travel hand(p) → discard` (card = next discardTop)
   - 바뀐 칸 중 위에서 이미 설명된 칸(p의 X, q의 X)을 제외하고:
     - `faceUp` false → true: `flip`
     - `faceUp` false 유지, `known` false → true: `peek`
5. 결과 배열 순서: 손 관련 travel들 → flip → peek.

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { describe, expect, it } from 'vitest';
import type { BoardView, CardView, HeldView, PaperSafariView, SlotView, TurnPhase } from '../../../api/types';
import { inferMoves } from './inferMoves';
import { DECK, DISCARD, handZone, slotZone } from './zones';

const A = 1;
const B = 2;
const C = 3;
const n = (value: number): CardView => ({ kind: 'NUMBER', value });

function board(playerId: number, overrides: Partial<Record<string, Partial<SlotView>>> = {}): BoardView {
  const slots = [0, 1, 2].flatMap((column) => [0, 1].map((row) => ({
    column, row, faceUp: false, known: false, card: null,
    ...overrides[`${column}:${row}`],
  } as SlotView)));
  return { playerId, slots };
}

type Opts = { phase?: TurnPhase; round?: number; held?: HeldView | null; discardTop?: CardView | null; boards?: BoardView[]; status?: PaperSafariView['status'] };

function view({ phase = 'DRAW', round = 1, held = null, discardTop = n(4), boards = [board(A), board(B)], status = 'IN_ROUND' }: Opts = {}): PaperSafariView {
  return {
    viewerId: A, status, roundNumber: round, tokens: {}, lastRoundResult: null, winnerId: null,
    round: { phase, currentPlayerId: A, deckSize: 30, discardTop, held, boards },
  };
}

const up = (card: CardView): Partial<SlotView> => ({ faceUp: true, card });

describe('inferMoves', () => {
  it('이전 상태 없이 새 라운드 준비 화면이면 나눠 준다', () => {
    expect(inferMoves(null, view({ phase: 'SETUP_FLIP' }))).toEqual([{ kind: 'deal', playerIds: [A, B] }]);
  });

  it('라운드가 바뀌어 준비 화면이 되면 나눠 준다', () => {
    const prev = view({ round: 1 });
    expect(inferMoves(prev, view({ phase: 'SETUP_FLIP', round: 2 }))).toEqual([{ kind: 'deal', playerIds: [A, B] }]);
  });

  it('이미 뒤집힌 카드가 있는 준비 화면이나 이전 상태 없는 진행 화면은 움직임이 없다', () => {
    expect(inferMoves(null, view({ phase: 'SETUP_FLIP', boards: [board(A, { '0:0': up(n(1)) }), board(B)] }))).toEqual([]);
    expect(inferMoves(null, view())).toEqual([]);
  });

  it('덱에서 뽑으면 덱에서 손으로 날아간다 (남이 뽑은 카드는 뒷면)', () => {
    const next = view({ phase: 'PLACE', held: { playerId: B, source: 'DECK', card: null } });
    expect(inferMoves(view(), next)).toEqual([{ kind: 'travel', from: DECK, to: handZone(B), card: null }]);
  });

  it('버린 카드 더미에서 가져오면 이전 맨 위 카드가 손으로 간다', () => {
    const next = view({ phase: 'PLACE', discardTop: n(9), held: { playerId: A, source: 'DISCARD', card: n(4) } });
    expect(inferMoves(view({ discardTop: n(4) }), next)).toEqual([{ kind: 'travel', from: DISCARD, to: handZone(A), card: n(4) }]);
  });

  it('교체하면 손에서 칸으로, 원래 칸 카드는 더미로 간다', () => {
    const prev = view({ phase: 'PLACE', held: { playerId: A, source: 'DECK', card: n(2) } });
    const next = view({ discardTop: n(8), boards: [board(A, { '1:0': up(n(2)) }), board(B)] });

    expect(inferMoves(prev, next)).toEqual([
      { kind: 'travel', from: handZone(A), to: slotZone(A, 1, 0), card: n(2) },
      { kind: 'travel', from: slotZone(A, 1, 0), to: DISCARD, card: n(8) },
    ]);
  });

  it('버리면 손에서 더미로 간다', () => {
    const prev = view({ phase: 'PLACE', held: { playerId: A, source: 'DECK', card: n(9) } });
    expect(inferMoves(prev, view({ discardTop: n(9) }))).toEqual([{ kind: 'travel', from: handZone(A), to: DISCARD, card: n(9) }]);
  });

  it('타잔 교체는 빠진 카드가 왼쪽 사람 같은 칸으로, 그 사람 카드는 더미로 간다', () => {
    const tarzan: CardView = { kind: 'TARZAN', value: 10 };
    const prev = view({ phase: 'PLACE', held: { playerId: A, source: 'DECK', card: tarzan }, boards: [board(A), board(B), board(C)] });
    const next = view({
      discardTop: n(6),
      boards: [board(A, { '2:1': up(tarzan) }), board(B, { '2:1': up(n(3)) }), board(C)],
    });

    expect(inferMoves(prev, next)).toEqual([
      { kind: 'travel', from: handZone(A), to: slotZone(A, 2, 1), card: tarzan },
      { kind: 'travel', from: slotZone(A, 2, 1), to: slotZone(B, 2, 1), card: n(3) },
      { kind: 'travel', from: slotZone(B, 2, 1), to: DISCARD, card: n(6) },
    ]);
  });

  it('준비 단계에서 상대가 카드를 뒤집으면 제자리 뒤집기', () => {
    const prev = view({ phase: 'SETUP_FLIP', boards: [board(A, { '0:0': up(n(1)) }), board(B)] });
    const next = view({ phase: 'SETUP_FLIP', boards: [board(A, { '0:0': up(n(1)) }), board(B, { '2:0': up(n(5)) })] });

    expect(inferMoves(prev, next)).toEqual([{ kind: 'flip', at: slotZone(B, 2, 0) }]);
  });

  it('코끼리로 엿보면 엿보기', () => {
    const prev = view({ phase: 'PEEK' });
    const next = view({ boards: [board(A, { '1:1': { known: true, card: n(7) } }), board(B)] });

    expect(inferMoves(prev, next)).toEqual([{ kind: 'peek', at: slotZone(A, 1, 1) }]);
  });

  it('라운드가 끝나는 화면은 움직임을 만들지 않는다', () => {
    const prev = view({ phase: 'PLACE', held: { playerId: A, source: 'DECK', card: n(2) } });
    const next = view({ phase: 'ROUND_OVER', boards: [board(A, { '0:0': up(n(2)), '0:1': up(n(3)) }), board(B, { '1:1': up(n(4)) })] });

    expect(inferMoves(prev, next)).toEqual([]);
  });

  it('같은 카드로 앞면 칸을 교체해 칸 변화가 안 보이면 손에서 더미로 대신한다', () => {
    const prev = view({ phase: 'PLACE', held: { playerId: A, source: 'DISCARD', card: n(5) }, boards: [board(A, { '0:0': up(n(5)) }), board(B)] });
    const next = view({ discardTop: n(5), boards: [board(A, { '0:0': up(n(5)) }), board(B)] });

    expect(inferMoves(prev, next)).toEqual([{ kind: 'travel', from: handZone(A), to: DISCARD, card: n(5) }]);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm --prefix frontend test -- src/games/papersafari/motion/inferMoves.test.ts`
Expected: FAIL (모듈 없음)

- [ ] **Step 3: 구현**

```ts
import type { BoardView, CardView, PaperSafariView, SlotView } from '../../../api/types';
import { DECK, DISCARD, handZone, slotZone, type SlotZone, type Zone } from './zones';

export type Move =
  | { kind: 'travel'; from: Zone; to: Zone; card: CardView | null }
  | { kind: 'flip'; at: SlotZone }
  | { kind: 'peek'; at: SlotZone }
  | { kind: 'deal'; playerIds: number[] };

type Change = { playerId: number; before: SlotView; after: SlotView };

function sameCard(a: CardView | null, b: CardView | null): boolean {
  return a?.kind === b?.kind && a?.value === b?.value;
}

function slotChanged(a: SlotView, b: SlotView): boolean {
  return a.faceUp !== b.faceUp || a.known !== b.known || !sameCard(a.card, b.card);
}

function findSlot(board: BoardView | undefined, column: number, row: number): SlotView | undefined {
  return board?.slots.find((slot) => slot.column === column && slot.row === row);
}

function changes(prev: PaperSafariView, next: PaperSafariView): Change[] {
  return next.round.boards.flatMap((board) => {
    const before = prev.round.boards.find((item) => item.playerId === board.playerId);
    return board.slots.flatMap((after) => {
      const old = findSlot(before, after.column, after.row);
      return old && slotChanged(old, after) ? [{ playerId: board.playerId, before: old, after }] : [];
    });
  });
}

function zoneOf(change: Change): SlotZone {
  return slotZone(change.playerId, change.after.column, change.after.row);
}

function allFaceDown(view: PaperSafariView): boolean {
  return view.round.boards.every((board) => board.slots.every((slot) => !slot.faceUp));
}

function isFreshDeal(prev: PaperSafariView | null, next: PaperSafariView): boolean {
  if (next.round.phase !== 'SETUP_FLIP' || !allFaceDown(next)) {
    return false;
  }
  return prev === null || next.roundNumber > prev.roundNumber || prev.status === 'GAME_OVER';
}

function drawMoves(prev: PaperSafariView, next: PaperSafariView): Move[] {
  const held = next.round.held;
  if (prev.round.held || !held) {
    return [];
  }
  if (held.source === 'DECK') {
    return [{ kind: 'travel', from: DECK, to: handZone(held.playerId), card: held.card }];
  }
  return [{ kind: 'travel', from: DISCARD, to: handZone(held.playerId), card: prev.round.discardTop }];
}

function placeMoves(prev: PaperSafariView, next: PaperSafariView, changed: Change[]): { moves: Move[]; used: Change[] } {
  const held = prev.round.held;
  if (!held || next.round.held) {
    return { moves: [], used: [] };
  }
  const own = changed.find((change) => change.playerId === held.playerId);
  const top = next.round.discardTop;
  if (!own) {
    return { moves: [{ kind: 'travel', from: handZone(held.playerId), to: DISCARD, card: top }], used: [] };
  }
  const target = zoneOf(own);
  const pushed = changed.find((change) => change.playerId !== held.playerId
    && change.after.column === own.after.column && change.after.row === own.after.row);
  const first: Move = { kind: 'travel', from: handZone(held.playerId), to: target, card: own.after.card };
  if (!pushed) {
    return { moves: [first, { kind: 'travel', from: target, to: DISCARD, card: top }], used: [own] };
  }
  const pushedZone = zoneOf(pushed);
  return {
    moves: [
      first,
      { kind: 'travel', from: target, to: pushedZone, card: pushed.after.card },
      { kind: 'travel', from: pushedZone, to: DISCARD, card: top },
    ],
    used: [own, pushed],
  };
}

function revealMoves(changed: Change[]): Move[] {
  const flips: Move[] = changed
    .filter((change) => !change.before.faceUp && change.after.faceUp)
    .map((change) => ({ kind: 'flip', at: zoneOf(change) }));
  const peeks: Move[] = changed
    .filter((change) => !change.after.faceUp && !change.before.known && change.after.known)
    .map((change) => ({ kind: 'peek', at: zoneOf(change) }));
  return [...flips, ...peeks];
}

export function inferMoves(prev: PaperSafariView | null, next: PaperSafariView): Move[] {
  if (next.round.phase === 'ROUND_OVER' || next.status === 'GAME_OVER') {
    return [];
  }
  if (isFreshDeal(prev, next)) {
    return [{ kind: 'deal', playerIds: next.round.boards.map((board) => board.playerId) }];
  }
  if (!prev || prev.roundNumber !== next.roundNumber) {
    return [];
  }
  const changed = changes(prev, next);
  const placed = placeMoves(prev, next, changed);
  const rest = changed.filter((change) => !placed.used.includes(change));
  return [...drawMoves(prev, next), ...placed.moves, ...revealMoves(rest)];
}
```

- [ ] **Step 4: 통과 확인**

Run: `npm --prefix frontend test -- src/games/papersafari/motion/inferMoves.test.ts`
Expected: 12개 PASS

- [ ] **Step 5: 커밋**

```bash
git add frontend/src/games/papersafari/motion/inferMoves.ts frontend/src/games/papersafari/motion/inferMoves.test.ts
git commit -m "feat: 이전·다음 게임 상태를 비교해 카드 움직임을 추론

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 카드 움직임 실행 (유령 카드 레이어) + 재동기화 처리 + 효과음 연결

**Files:**
- Modify: `frontend/src/room/useRoomChannel.ts`, `frontend/src/room/useRoomChannel.test.tsx`
- Create: `frontend/src/games/papersafari/motion/useCardMotion.ts`, `motion/useCardMotion.test.tsx`
- Create: `frontend/src/games/papersafari/motion/GhostLayer.tsx`
- Modify: `frontend/src/games/papersafari/PaperSafariTable.tsx`, `PaperSafariTable.test.tsx`
- Modify: `frontend/src/pages/RoomPage.tsx` (`transition` 전달)

**Interfaces:**
- Consumes: `inferMoves`, `Move`(Task 7), `zoneKey`, `HiddenZonesContext`(Task 6), `useSound`(Task 3), `CardFace`(Task 5)
- Produces:
  - `useRoomChannel` 반환값에 `transition: ViewTransition | null` 추가 — `type ViewTransition = { seq: number; from: PaperSafariView | null; to: PaperSafariView; animate: boolean }` (export from `useRoomChannel.ts`)
  - `useCardMotion(containerRef: RefObject<HTMLElement | null>, transition: ViewTransition | null): { ghosts: Ghost[]; hidden: ReadonlySet<string> }`
  - `type Ghost = { id: number; card: CardView | null; from: Rect; to: Rect; delay: number }`, `type Rect = { x: number; y: number; width: number; height: number }`
  - 상수: `TRAVEL_MS = 420`, `DEAL_STEP_MS = 50`, `MAX_DEAL_MS = 1500`
  - `GhostLayer({ ghosts }: { ghosts: Ghost[] })`
  - `PaperSafariTable` props에 `transition?: ViewTransition | null` 추가(없으면 움직임 없음 — 기존 테스트 호환)

- [ ] **Step 1: useRoomChannel 재동기화 테스트 작성**

`useRoomChannel.test.tsx`에 추가(파일의 기존 목 구성 — 가짜 realtime, `roomsApi` 목 — 을 그대로 재사용; 기존 테스트에서 메시지를 흘려보내는 헬퍼 이름을 확인해 맞춘다):
```tsx
  it('동기화 요청 직후 받은 화면은 animate=false, 이후 푸시는 animate=true', async () => {
    vi.spyOn(roomsApi, 'get').mockResolvedValue(room('방', 'PLAYING'));
    state.connected = true;
    const { result } = renderHook(() => useRoomChannel('ABCDEF'));
    await act(async () => {});
    expect(state.publish).toHaveBeenCalledWith('/app/rooms/ABCDEF/sync', {});

    act(() => state.handlers.get('/user/queue/game')?.(sessionView(1)));
    expect(result.current.transition?.animate).toBe(false);

    act(() => state.handlers.get('/user/queue/game')?.(sessionView(2)));
    expect(result.current.transition?.animate).toBe(true);
    expect(result.current.transition?.from?.roundNumber).toBe(1);
    expect(result.current.transition?.to.roundNumber).toBe(2);
  });
```
같은 파일 위쪽(`room` 헬퍼 아래)에 헬퍼 추가(`PaperSafariSessionView` import):
```tsx
const sessionView = (roundNumber: number): PaperSafariSessionView => ({
  readyPlayerIds: [],
  game: {
    viewerId: 1, status: 'IN_ROUND', roundNumber, tokens: {}, lastRoundResult: null, winnerId: null,
    round: { phase: 'DRAW', currentPlayerId: 1, deckSize: 30, discardTop: null, held: null, boards: [] },
  },
});
```

- [ ] **Step 2: 실패 확인 → 구현**

Run: `npm --prefix frontend test -- src/room/useRoomChannel.test.tsx` → FAIL

`useRoomChannel.ts` 변경:
```ts
export type ViewTransition = { seq: number; from: PaperSafariView | null; to: PaperSafariView; animate: boolean };
// ...
  const [transition, setTransition] = useState<ViewTransition | null>(null);
  const syncPendingRef = useRef(false);
  const seqRef = useRef(0);
```
- `acceptView` 안에서 `viewRef.current`를 바꾸기 전에:
```ts
      const animate = !syncPendingRef.current;
      syncPendingRef.current = false;
      seqRef.current += 1;
      setTransition({ seq: seqRef.current, from: viewRef.current?.game ?? null, to: next.game, animate });
```
- 동기화를 publish하는 두 곳(`sync()` 함수와 `status === 'PLAYING'` 효과)에서 publish 직전에 `syncPendingRef.current = true;`
- 방 코드가 바뀌는 초기화 효과에서 `setTransition(null); syncPendingRef.current = false;`
- 반환에 `transition` 추가.

Run → PASS (기존 테스트 포함)

- [ ] **Step 3: useCardMotion 테스트 작성**

```tsx
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PaperSafariView } from '../../../api/types';
import type { ViewTransition } from '../../../room/useRoomChannel';
import { TRAVEL_MS, useCardMotion } from './useCardMotion';

function game(round: number, held: PaperSafariView['round']['held'], phase: PaperSafariView['round']['phase'] = 'DRAW'): PaperSafariView {
  const slots = [0, 1, 2].flatMap((column) => [0, 1].map((row) => ({ column, row, faceUp: false, known: false, card: null })));
  return {
    viewerId: 1, status: 'IN_ROUND', roundNumber: round, tokens: {}, lastRoundResult: null, winnerId: null,
    round: { phase, currentPlayerId: 1, deckSize: 30, discardTop: { kind: 'NUMBER', value: 4 }, held,
      boards: [{ playerId: 1, slots }, { playerId: 2, slots }] },
  };
}

const drawn = (seq: number, animate = true): ViewTransition => ({
  seq, animate, from: game(1, null), to: game(1, { playerId: 2, source: 'DECK', card: null }, 'PLACE'),
});

function container(): HTMLElement {
  const root = document.createElement('div');
  ['deck', 'discard', 'hand:2', 'hand:1'].forEach((key) => {
    const el = document.createElement('div');
    el.dataset.zone = key;
    root.appendChild(el);
  });
  document.body.appendChild(root);
  return root;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('useCardMotion', () => {
  it('덱에서 뽑으면 유령 카드를 띄우고 도착 칸을 잠시 숨긴다', () => {
    const ref = { current: container() };
    const { result } = renderHook(({ t }) => useCardMotion(ref, t), { initialProps: { t: drawn(1) } });

    expect(result.current.ghosts).toHaveLength(1);
    expect(result.current.hidden.has('hand:2')).toBe(true);

    act(() => vi.advanceTimersByTime(TRAVEL_MS + 50));

    expect(result.current.ghosts).toHaveLength(0);
    expect(result.current.hidden.size).toBe(0);
  });

  it('움직이는 중에 새 상태가 오면 이전 숨김을 모두 풀고 새로 시작한다', () => {
    const ref = { current: container() };
    const { result, rerender } = renderHook(({ t }) => useCardMotion(ref, t), { initialProps: { t: drawn(1) } });

    rerender({ t: { seq: 2, animate: true, from: drawn(1).to, to: drawn(1).to } });

    expect(result.current.ghosts).toHaveLength(0);
    expect(result.current.hidden.size).toBe(0);
  });

  it('animate=false면 나눠 주기 말고는 움직이지 않는다', () => {
    const ref = { current: container() };
    const transition = drawn(1, false);
    const { result } = renderHook(() => useCardMotion(ref, transition));

    expect(result.current.ghosts).toHaveLength(0);
    expect(result.current.hidden.size).toBe(0);
  });

  it('언마운트되면 남은 타이머를 정리한다', () => {
    const ref = { current: container() };
    const transition = drawn(1);
    const { unmount } = renderHook(() => useCardMotion(ref, transition));

    unmount();

    expect(() => vi.runAllTimers()).not.toThrow();
  });

  it('위치를 모르는 영역이면 유령 없이 넘어간다', () => {
    const ref = { current: document.createElement('div') };
    const transition = drawn(1);
    const { result } = renderHook(() => useCardMotion(ref, transition));

    expect(result.current.ghosts).toHaveLength(0);
    expect(result.current.hidden.size).toBe(0);
  });
});
```

- [ ] **Step 4: 실패 확인**

Run: `npm --prefix frontend test -- src/games/papersafari/motion/useCardMotion.test.tsx` → FAIL

- [ ] **Step 5: useCardMotion 구현**

```ts
import { useEffect, useRef, useState, type RefObject } from 'react';
import type { CardView } from '../../../api/types';
import { useSound, type SoundName } from '../../../lib/sound';
import type { ViewTransition } from '../../../room/useRoomChannel';
import { inferMoves, type Move } from './inferMoves';
import { slotZone, zoneKey, DECK, type Zone } from './zones';

export const TRAVEL_MS = 420;
export const DEAL_STEP_MS = 50;
export const MAX_DEAL_MS = 1500;

export type Rect = { x: number; y: number; width: number; height: number };
export type Ghost = { id: number; card: CardView | null; from: Rect; to: Rect; delay: number };

type Flight = { card: CardView | null; from: Zone; to: Zone; delay: number };
type Plan = { flights: Flight[]; sounds: { name: SoundName; delay: number }[] };

const EMPTY: ReadonlySet<string> = new Set();

function rectOf(root: HTMLElement | null, zone: Zone): Rect | null {
  const el = root?.querySelector<HTMLElement>(`[data-zone="${zoneKey(zone)}"]`);
  if (!el) {
    return null;
  }
  const box = el.getBoundingClientRect();
  return { x: box.left, y: box.top, width: box.width, height: box.height };
}

function soundOfTravel(move: Extract<Move, { kind: 'travel' }>): SoundName {
  return move.from.kind === 'deck' || move.from.kind === 'discard' ? 'draw' : 'place';
}

function planOf(moves: Move[]): Plan {
  const plan: Plan = { flights: [], sounds: [] };
  let clock = 0;
  moves.forEach((move) => {
    if (move.kind === 'travel') {
      plan.flights.push({ card: move.card, from: move.from, to: move.to, delay: clock });
      plan.sounds.push({ name: soundOfTravel(move), delay: clock });
      clock += TRAVEL_MS;
      return;
    }
    if (move.kind === 'deal') {
      const targets = move.playerIds.flatMap((id) => [0, 1, 2].flatMap((column) => [0, 1].map((row) => slotZone(id, column, row))));
      const step = Math.min(DEAL_STEP_MS, MAX_DEAL_MS / Math.max(targets.length, 1));
      targets.forEach((to, index) => {
        plan.flights.push({ card: null, from: DECK, to, delay: clock + index * step });
        if (index % 2 === 0 && index < 12) {
          plan.sounds.push({ name: 'draw', delay: clock + index * step });
        }
      });
      clock += targets.length * step + TRAVEL_MS;
      return;
    }
    plan.sounds.push({ name: 'flip', delay: clock });
  });
  return plan;
}

function movesFor(transition: ViewTransition): Move[] {
  const moves = inferMoves(transition.from, transition.to);
  return transition.animate ? moves : moves.filter((move) => move.kind === 'deal');
}

export function useCardMotion(containerRef: RefObject<HTMLElement | null>, transition: ViewTransition | null) {
  const { play } = useSound();
  const [ghosts, setGhosts] = useState<Ghost[]>([]);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(EMPTY);
  const timers = useRef<number[]>([]);
  const nextId = useRef(1);
  const playRef = useRef(play);
  playRef.current = play;

  const clearAll = () => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  };

  useEffect(() => {
    clearAll();
    setGhosts([]);
    setHidden(EMPTY);
    if (!transition) {
      return undefined;
    }
    const plan = planOf(movesFor(transition));
    const root = containerRef.current;
    const flights = plan.flights.flatMap((flight) => {
      const from = rectOf(root, flight.from);
      const to = rectOf(root, flight.to);
      return from && to ? [{ ...flight, fromRect: from, toRect: to, id: nextId.current++ }] : [];
    });
    if (flights.length > 0) {
      setGhosts(flights.map((flight) => ({ id: flight.id, card: flight.card, from: flight.fromRect, to: flight.toRect, delay: flight.delay })));
      setHidden(new Set(flights.map((flight) => zoneKey(flight.to))));
    }
    flights.forEach((flight) => {
      timers.current.push(window.setTimeout(() => {
        setGhosts((current) => current.filter((ghost) => ghost.id !== flight.id));
        setHidden((current) => {
          const stillFlying = flights.some((other) => other.id !== flight.id && other.delay > flight.delay && zoneKey(other.to) === zoneKey(flight.to));
          if (stillFlying) {
            return current;
          }
          const next = new Set(current);
          next.delete(zoneKey(flight.to));
          return next;
        });
      }, flight.delay + TRAVEL_MS));
    });
    plan.sounds.forEach((sound) => {
      timers.current.push(window.setTimeout(() => playRef.current(sound.name), sound.delay));
    });
    return clearAll;
  }, [transition, containerRef]);

  return { ghosts, hidden };
}
```
주의(테스트 "위치를 모르는 영역"): `rectOf`가 null이면 비행을 만들지 않으므로 숨김도 없다. jsdom의 `getBoundingClientRect`는 0을 돌려주지만 요소가 있으면 비행을 만든다(첫 테스트 통과).
주의(참조 안정성): effect는 `transition` 객체가 바뀔 때만 다시 돈다. `useRoomChannel`은 새 화면마다 새 객체를 한 번만 만들므로 안전하다. 테스트에서도 transition을 렌더 함수 밖에서 한 번 만들어 넘긴다(렌더마다 새 객체를 만들면 무한 반복된다).
주의(effect 정리): `useEffect`의 정리 함수가 `clearAll`이므로 새 `transition`이 오거나 언마운트되면 타이머가 모두 사라진다. 새 transition 시작 시 `setGhosts([])`, `setHidden(EMPTY)`로 즉시 원상 복귀.

- [ ] **Step 6: GhostLayer 구현**

```tsx
import { motion } from 'motion/react';
import { createPortal } from 'react-dom';
import { CardFace } from '../CardFace';
import { TRAVEL_MS, type Ghost } from './useCardMotion';

export function GhostLayer({ ghosts }: { ghosts: Ghost[] }) {
  if (ghosts.length === 0) {
    return null;
  }
  return createPortal(
    <div aria-hidden="true" data-testid="ghost-layer" className="pointer-events-none fixed inset-0 z-30">
      {ghosts.map((ghost) => {
        const dx = ghost.to.x - ghost.from.x;
        const dy = ghost.to.y - ghost.from.y;
        const scale = ghost.from.width > 0 ? ghost.to.width / ghost.from.width : 1;
        return (
          <motion.div
            key={ghost.id}
            className="absolute"
            style={{ left: ghost.from.x, top: ghost.from.y, width: ghost.from.width, height: ghost.from.height }}
            initial={{ x: 0, y: 0, rotate: 0, scale: 1, opacity: 0 }}
            animate={{ x: [0, dx / 2, dx], y: [0, dy / 2 - 40, dy], rotate: [0, dx >= 0 ? 8 : -8, 0], scale: [1, 1.08, scale], opacity: [1, 1, 1] }}
            transition={{ duration: TRAVEL_MS / 1000, delay: ghost.delay / 1000, ease: 'easeInOut' }}
          >
            <div className="h-full w-full [&>button]:h-full [&>button]:w-full">
              <CardFace card={ghost.card} faceUp={ghost.card !== null} known={false} />
            </div>
          </motion.div>
        );
      })}
    </div>,
    document.body,
  );
}
```
(유령 안의 `CardFace`는 `aria-hidden` 레이어 안이라 접근성 트리에 나오지 않는다. 테스트에서 `getAllByTestId('slot')`에도 잡히지 않는다 — `data-testid`가 없다.)

- [ ] **Step 7: 테이블에 연결 + 내 차례·라운드 효과음**

`PaperSafariTable.tsx`:
```tsx
  const containerRef = useRef<HTMLDivElement>(null);
  const { ghosts, hidden } = useCardMotion(containerRef, transition ?? null);
  const { play } = useSound();
  const wasMyTurn = useRef(false);

  useEffect(() => {
    const now = myTurn && round.phase === 'DRAW';
    if (now && !wasMyTurn.current) {
      play('myTurn');
    }
    wasMyTurn.current = now;
  }, [myTurn, round.phase, play]);

  const phase = round.phase;
  const myOutcome = game.lastRoundResult?.players.find((player) => player.playerId === meId)?.outcome;
  useEffect(() => {
    if (phase !== 'ROUND_OVER' || !myOutcome) {
      return;
    }
    play(myOutcome === 'WIN' ? 'roundWin' : 'roundLose');
  }, [phase, myOutcome, play]);
```
(훅은 `GAME_OVER` early return보다 **위**에 둔다. `myTurn`, `round`, `game`은 early return 전에 계산되므로 순서를 조정한다.)

렌더:
```tsx
  return (
    <HiddenZonesContext.Provider value={hidden}>
      <div ref={containerRef}>
        <Layout {...tableProps} />
      </div>
      <GhostLayer ghosts={ghosts} />
      {round.phase === 'ROUND_OVER' ? <RoundResultModal … /> : null}
    </HiddenZonesContext.Provider>
  );
```

`RoomPage.tsx`: `useRoomChannel`에서 `transition`을 받아 `<PaperSafariTable … transition={transition} />`로 넘긴다.

`PaperSafariTable.test.tsx`에 추가:
```tsx
it('재동기화로 받은 화면(animate=false)은 날아다니는 카드를 만들지 않는다', () => {
  const from = build({ phase: 'DRAW', current: OPPONENT });
  const to = build({ phase: 'PLACE', current: OPPONENT, held: { playerId: OPPONENT, source: 'DECK', card: null } });
  render(<PaperSafariTable {...baseProps(to)} transition={{ seq: 1, from: from.game, to: to.game, animate: false }} />);

  expect(screen.queryByTestId('ghost-layer')).not.toBeInTheDocument();
});

it('상대가 덱에서 뽑으면 유령 카드가 날아간다', () => {
  const from = build({ phase: 'DRAW', current: OPPONENT });
  const to = build({ phase: 'PLACE', current: OPPONENT, held: { playerId: OPPONENT, source: 'DECK', card: null } });
  render(<PaperSafariTable {...baseProps(to)} transition={{ seq: 1, from: from.game, to: to.game, animate: true }} />);

  expect(screen.getByTestId('ghost-layer')).toBeInTheDocument();
});
```
(`baseProps(view)`는 기존 `tableFor`의 props를 객체로 돌려주는 헬퍼로 리팩터링해서 만든다. )

- [ ] **Step 8: 전체 테스트·빌드 확인**

Run: `npm --prefix frontend test && npm --prefix frontend run build`
Expected: 전부 PASS

- [ ] **Step 9: 커밋**

```bash
git add frontend
git commit -m "feat: 카드가 덱·손·칸·더미 사이를 날아가는 애니메이션과 효과음

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 대기실·결과·게임 종료·로그인·전적·상단바 연출

**Files:**
- Modify: `frontend/src/room/WaitingRoom.tsx`, `frontend/src/room/MemberList.tsx`
- Modify: `frontend/src/games/papersafari/RoundResultModal.tsx`
- Modify: `frontend/src/games/papersafari/GameOverPanel.tsx`, `GameOverPanel.test.tsx`
- Modify: `frontend/src/components/Layout.tsx`, `Layout.test.tsx`
- Modify: `frontend/src/pages/LoginPage.tsx`, `SignupPage.tsx`, `RecordsPage.tsx`, `frontend/src/records/*.tsx`
- Modify: `frontend/src/pages/RoomPage.tsx` (방 머리글 재질)
- Create: `frontend/src/room/WaitingRoom.test.tsx`, `frontend/src/games/papersafari/RoundResultModal.test.tsx`

**Interfaces:**
- Consumes: `Felt`, `Panel`, `Button`, `Modal`, `Confetti`, `RollingNumber`(Task 2), `useSound`(Task 3), `PlayerBoard`, `CardFace`(Task 5/6)
- Produces: 화면 변경만. 공개 API 변화 없음. `MemberList`는 같은 props로 의자 배치를 그린다.

- [ ] **Step 1: 대기실·결과 모달 테스트 작성**

`room/WaitingRoom.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { Room } from '../api/types';
import { ToastProvider } from '../components/Toast';
import { WaitingRoom } from './WaitingRoom';

const room: Room = {
  code: 'ABC234', name: '방', gameType: 'PAPER_SAFARI', gameTypeName: '페이퍼 사파리', status: 'WAITING', hostId: 1, maxPlayers: 4,
  members: [
    { id: 1, nickname: '앨리스', host: true, connected: true, offlineSeconds: 0 },
    { id: 2, nickname: '밥', host: false, connected: false, offlineSeconds: 70 },
  ],
};

function renderRoom() {
  render(<ToastProvider><WaitingRoom room={room} meId={1} receivedAt={0} now={0} onStart={vi.fn()} onForfeit={vi.fn()} /></ToastProvider>);
}

describe('WaitingRoom', () => {
  it('최대 인원만큼 의자를 놓고 빈자리를 보여준다', () => {
    renderRoom();

    expect(screen.getAllByTestId('chair')).toHaveLength(4);
    expect(screen.getAllByLabelText('빈자리')).toHaveLength(2);
    expect(screen.getByText('앨리스')).toBeInTheDocument();
  });

  it('60초 넘게 끊긴 사람은 내보내기 버튼이 있다', () => {
    renderRoom();

    expect(screen.getByRole('button', { name: '내보내기' })).toBeInTheDocument();
  });

  it('방장은 시작 버튼을 누를 수 있다', () => {
    renderRoom();

    expect(screen.getByRole('button', { name: '게임 시작' })).toBeEnabled();
  });
});
```

`games/papersafari/RoundResultModal.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { PaperSafariSessionView } from '../../api/types';
import { RoundResultModal } from './RoundResultModal';

const slots = [0, 1, 2].flatMap((column) => [0, 1].map((row) => ({ column, row, faceUp: true, known: false, card: { kind: 'NUMBER' as const, value: column + 1 } })));
const view: PaperSafariSessionView = {
  readyPlayerIds: [],
  game: {
    viewerId: 1, status: 'ROUND_OVER', roundNumber: 2, tokens: { '1': 1, '2': 0 }, winnerId: null,
    lastRoundResult: { players: [{ playerId: 1, score: 0, outcome: 'WIN' }, { playerId: 2, score: 9, outcome: 'LOSE' }] },
    round: { phase: 'ROUND_OVER', currentPlayerId: 1, deckSize: 10, discardTop: null, held: null,
      boards: [{ playerId: 1, slots }, { playerId: 2, slots }] },
  },
};
const nicknameOf = (id: number) => (id === 1 ? '앨리스' : '밥');

describe('RoundResultModal', () => {
  it('라운드 결과 대화상자에 점수와 승패를 보여준다', () => {
    render(<RoundResultModal view={view} meId={1} nicknameOf={nicknameOf} onReady={vi.fn()} />);

    const dialog = screen.getByRole('dialog', { name: '2라운드 결과' });
    expect(dialog).toHaveTextContent('앨리스');
    expect(dialog).toHaveTextContent('승');
    expect(dialog).toHaveTextContent('밥');
  });

  it('준비 버튼을 누르면 onReady', async () => {
    const onReady = vi.fn();
    render(<RoundResultModal view={view} meId={1} nicknameOf={nicknameOf} onReady={onReady} />);

    await userEvent.click(screen.getByRole('button', { name: '다음 라운드 준비' }));

    expect(onReady).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npm --prefix frontend test -- src/room/WaitingRoom.test.tsx src/games/papersafari/RoundResultModal.test.tsx`
Expected: FAIL (`chair` 없음, dialog 없음)

- [ ] **Step 3: 대기실 의자 배치**

`MemberList.tsx` → 같은 props에 `maxPlayers: number` 추가. 펠트 위 원형 배치:
```tsx
import { AnimatePresence, motion } from 'motion/react';
// ...
export function MemberList({ members, maxPlayers, meId, receivedAt, now, onForfeit }: Props) {
  const seats = Array.from({ length: maxPlayers }, (_, index) => members[index] ?? null);
  return (
    <ul className="flex flex-wrap justify-center gap-5 py-4">
      {seats.map((member, index) => (
        <li key={member ? member.id : `empty-${index}`} data-testid="chair" className="flex w-24 flex-col items-center gap-1.5">
          <AnimatePresence mode="wait">
            {member ? (
              <motion.div key="taken" initial={{ scale: 0, y: -20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="relative flex h-16 w-16 items-center justify-center rounded-full bg-cream-50 text-2xl font-black text-wood-800 shadow-[0_4px_0_var(--color-cream-300),0_10px_16px_rgb(0_0_0/0.4)]">
                {member.nickname.slice(0, 1)}
                <span aria-hidden="true" className={`absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-cream-50 ${member.connected ? 'bg-green-500' : 'bg-stone-400'}`} />
                {member.host ? <span title="방장" className="absolute -top-3 text-lg">👑</span> : null}
              </motion.div>
            ) : (
              <motion.div key="empty" aria-label="빈자리" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="h-16 w-16 rounded-full border-2 border-dashed border-cream-50/40" />
            )}
          </AnimatePresence>
          {member ? (
            <>
              <span className="rounded-full bg-black/35 px-2 text-sm font-bold text-cream-50">{member.nickname}{member.id === meId ? ' (나)' : ''}</span>
              {!member.connected ? <span className="text-xs text-cream-200/80">연결 끊김 {offlineSecondsNow(member, receivedAt, now)}초</span> : null}
              {canForfeit(member, meId, receivedAt, now) ? (
                <Button variant="danger" className="px-2 py-0.5 text-xs" onClick={() => onForfeit(member.id)}>내보내기</Button>
              ) : null}
            </>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
```
주의: `getByText('앨리스')`가 통과하려면 내 이름표는 `앨리스 (나)` 대신 `앨리스`와 별도 `(나)` span으로 나눈다: `<span>{member.nickname}</span>{member.id === meId ? <span className="text-xs"> (나)</span> : null}`를 이름표 안에 넣는다.

`WaitingRoom.tsx`: 왼쪽 큰 영역을 `<Felt className="p-5 lg:col-span-2">`로 바꾸고 제목(`참가자 n/max`)과 코드 복사 버튼을 펠트 위 크림 이름표 스타일로, `MemberList`에 `maxPlayers={room.maxPlayers}`. 시작 버튼 문구는 그대로(`게임 시작` / `2명 이상 모이면 시작할 수 있어요` / 대기 문구). 규칙 패널은 `Panel` 그대로(이미 종이 재질).

- [ ] **Step 4: 라운드 결과 모달**

`RoundResultModal.tsx`를 `Modal`로 감싼다:
```tsx
<Modal open title={`${game.roundNumber}라운드 결과`} wide>
  <h2 className="mb-4 text-xl font-black">{game.roundNumber}라운드 결과</h2>
  ...
</Modal>
```
연출:
- 결과 목록 각 줄: `motion.li` `initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 * index }}`; 점수는 `<RollingNumber value={result.score} />`점; 승자 줄은 `bg-mustard-300/60` + 🎀 리본.
- 판 미리보기는 펠트 조각 위에(`<Felt className="p-3">`) `PlayerBoard size="sm"`. 공개 연출: 마운트 시 `revealed` 상태를 0에서 시작해 120ms마다 1씩 늘려 슬롯 수(보드 수×6)까지 증가시키고, `PlayerBoard`에 넘기는 보드 사본에서 `index >= revealed`인 슬롯은 `{ ...slot, faceUp: false }`로 바꿔 넘긴다(`card` 값은 유지 → 뒷면→앞면으로 3D 뒤집힘). `useReducedMotion()`이면 처음부터 전부 공개.
```tsx
const reduced = useReducedMotion();
const total = game.round.boards.length * 6;
const [revealed, setRevealed] = useState(reduced ? total : 0);
useEffect(() => {
  if (revealed >= total) {
    return undefined;
  }
  const timer = window.setTimeout(() => setRevealed((value) => value + 1), 120);
  return () => window.clearTimeout(timer);
}, [revealed, total]);
const staged = (board: BoardView, boardIndex: number): BoardView => ({
  ...board,
  slots: board.slots.map((slot, slotIndex) => (boardIndex * 6 + slotIndex < revealed ? slot : { ...slot, faceUp: false })),
});
```
- 문구·버튼(`다음 라운드 준비` / `다른 사람을 기다리는 중…` / `준비: …`)과 열 점수 줄은 그대로.

- [ ] **Step 5: 게임 종료 화면**

`GameOverPanel.tsx`: 바깥을 `Modal open title="게임 종료" onClose={onClose} wide`로 바꾸고, 맨 위에 `won`이면 `<Confetti active />` + 트로피 카드(큰 `🏆`을 담은 크림 카드가 `initial={{ rotateY: 180, scale: 0.6 }} animate={{ rotateY: 0, scale: 1 }}`로 뒤집히며 등장). 순위 목록은 금화 토큰 아이콘으로. 기존 문구(`○○님 승리!`, `토큰 N개`, `마지막 라운드 결과`, `대기실로 돌아가기`)는 유지. 승자가 아닌 사람에게도 승자 이름표 주변 반짝임만(`gold-sparkle`), 꽃가루는 모두에게 보여준다(`<Confetti active={game.winnerId !== null} />`). `GameOverPanel.test.tsx`는 `getByRole('dialog', { name: '게임 종료' })` 안에서 기존 단언을 하도록 고친다.

- [ ] **Step 6: 상단바·페이지 전환·연결 배너**

`Layout.tsx`:
```tsx
import { AnimatePresence, motion } from 'motion/react';
import { useLocation } from 'react-router-dom';
import { useSound } from '../lib/sound';
// ...
  const location = useLocation();
  const { muted, toggleMuted } = useSound();
  return (
    <div className="min-h-screen">
      <AnimatePresence>
        {disconnected ? (
          <motion.div role="status" initial={{ y: -40 }} animate={{ y: 0 }} exit={{ y: -40 }}
            className="sticky top-0 z-40 bg-mustard-400 px-4 py-1.5 text-center text-sm font-bold text-wood-800 shadow">
            서버와 연결이 끊겼어요. 다시 연결하는 중…
          </motion.div>
        ) : null}
      </AnimatePresence>
      <header className="wood-rail">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
          <div className="flex items-center gap-4">
            <NavLink to="/" className="text-lg font-black text-cream-50 drop-shadow">🌿 보드게임 라운지</NavLink>
            <nav className="flex gap-1">
              <NavLink to="/" end className={linkClass}>게임 선반</NavLink>
              <NavLink to="/records" className={linkClass}>내 전적</NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <button type="button" onClick={toggleMuted} aria-label={muted ? '소리 켜기' : '소리 끄기'}
              className="press-3d rounded-lg bg-black/25 px-2 py-1 text-cream-50">{muted ? '🔇' : '🔊'}</button>
            <span className="font-bold text-cream-50">{member?.nickname}</span>
            <button type="button" onClick={handleLogout} className="text-cream-200 hover:text-cream-50">로그아웃</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div key={location.pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
```
`linkClass`: `isActive ? 'bg-black/30 font-bold text-cream-50' : 'text-cream-200 hover:bg-black/15'` + `rounded-lg px-3 py-1.5 text-sm`.
`Layout.test.tsx`의 배너 테스트(텍스트 기준)는 그대로 통과해야 한다. `AnimatePresence`의 퇴장 애니메이션 때문에 "배너 숨김" 단언이 즉시 실패하면 `waitFor`로 감싼다. 테스트가 `MemoryRouter`를 쓰지 않아 `useLocation`이 실패하면 테스트 렌더를 `MemoryRouter`로 감싼다.

방 머리글(`RoomPage.tsx`): 제목과 상태를 `text-cream-50`으로, `나가기` 버튼은 그대로 `danger`.

- [ ] **Step 7: 로그인·회원가입·전적 재질**

- `LoginPage`/`SignupPage`: 바깥 `<div className="flex min-h-screen items-center justify-center p-4">` 안에 `<Felt className="relative w-full max-w-md px-6 py-10">`, 그 안에 `Panel`(종이) 폼, 펠트 왼쪽 위에 장식 카드 2장(`CardFace` `size="md"` `card={{kind:'NUMBER', value: 9}}`와 `{kind:'FOX', value:-2}`, `faceUp`, `-rotate-12`/`rotate-6`, `absolute -left-6 -top-8`, `aria-hidden` 래퍼, `onClick` 없음). 폼 `motion.div`로 `initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}`. 폼 필드·문구·동작은 그대로.
- `RecordsPage`와 `records/*`: 패널은 이미 `Panel`(종이). `StatSummary`의 승·무·패를 입체 알약 막대(가로 flex, 각 칸 너비 = 비율, `shadow-[inset_0_-3px_0_rgb(0_0_0/0.2)]`, 승 `bg-safari-500`, 무 `bg-mustard-400`, 패 `bg-brick-500`)로, `RankingList` 1~3위 앞에 🥇🥈🥉, 페이지 제목은 `text-cream-50`. 기존 `RecordsPage.test` 문구 단언이 통과하도록 텍스트는 유지.

- [ ] **Step 8: 전체 테스트·빌드**

Run: `npm --prefix frontend test && npm --prefix frontend run build`
Expected: 전부 PASS

- [ ] **Step 9: 커밋**

```bash
git add frontend
git commit -m "feat: 대기실 의자·결과 공개·승리 꽃가루·원목 상단바 등 화면 연출

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: 실제 플레이 확인, 문서, 배포 이미지

**Files:**
- Modify: `README.md` (기능 목록: 게임 선반, 효과음, 애니메이션)
- 스크린샷은 커밋하지 않는다(`.playwright-mcp/`는 이미 무시됨).

- [ ] **Step 1: 전체 자동 테스트**

Run: `mvn -q -f backend/pom.xml test && npm --prefix frontend test && npm --prefix frontend run build`
Expected: 백엔드 261개 내외, 프론트 전부 PASS, 빌드 성공

- [ ] **Step 2: 개발 서버로 두 사람 플레이 확인**

Run: `./start.sh` (백그라운드) → 준비 메시지 확인.
Playwright로 1280×800 크기에서:
1. `http://localhost:5177` 회원가입 A → 게임 선반이 보이고 대기 0 / 플레이 0.
2. `http://127.0.0.1:5177` 회원가입 B.
3. A가 상자 클릭 → 로비 → 방 만들기. B의 선반에서 5초 안에 대기 1로 바뀌는지 확인.
4. B가 코드로 입장 → 대기실 의자 2개 채워짐. A가 시작 → 나눠 주기 연출 → 각자 1장 뒤집기.
5. 덱 뽑기 → 유령 카드가 손으로, 교체 → 칸과 더미로, 상대 화면에서도 날아가는지 스크린샷.
6. 선반(다른 탭)에서 플레이 2 확인.
7. 라운드 종료까지 진행(또는 기권으로 게임 종료) → 결과 모달 순차 공개, 게임 종료 꽃가루.
8. 390×844(모바일)로 바꿔 게임 화면이 위쪽 선반 배치로 바뀌는지 스크린샷.
9. 콘솔 오류 없음 확인(`browser_console_messages`).
발견한 문제는 고치고 해당 Task의 테스트를 추가한 뒤 다시 확인한다.

- [ ] **Step 3: 서버 종료와 Docker 확인**

Run: `./stop.sh` → `docker compose up -d --build --wait` → `curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/` 가 200 → 로그인 후 `/api/games` 응답 확인 → `docker compose down`.

- [ ] **Step 4: README 갱신**

`## 기능` 목록을 아래로 바꾼다:
```markdown
## 기능
- 아이디/비밀번호 회원가입·로그인 (세션 쿠키)
- 게임 선반: 게임별 대기 인원·플레이 인원 실시간 표시(5초마다 갱신)
- 게임 로비: 방 만들기, 방 목록, 6자리 방 코드로 입장, 내 전적 요약, 순위표 TOP 5
- 대기실: 테이블 의자 배치, 접속 상태, 방장 시작, 60초 이상 끊긴 사람 내보내기
- 실시간 게임(STOMP WebSocket): 서버가 규칙을 판정하고 각자에게 자기 시점 화면만 전송
- 원목·펠트 입체 테이블, 직접 그린 동물 카드 14종, 카드가 날아가고 뒤집히는 애니메이션
- 효과음(🔊/🔇 상단바에서 끄기), 시스템 '동작 줄이기' 설정 존중
- 전적: 게임/라운드 승·무·패, 승률, 평균 점수, 최근 경기 10개, 순위표(5판 이상)
```

- [ ] **Step 5: 커밋**

```bash
git add README.md
git commit -m "docs: 테이블탑 UI 기능을 README에 반영

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
