# 라운지 개선 20건 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자 요청 20건을 구현한다. 백엔드에는 관전, 비공개방, 최대 인원 선택, 게임 중인 방 목록, 중복 로그인 차단을 넣고, 프론트에는 규칙 슬라이드, 방 돌아가기 바, 상대 판 확대, 모바일 배치 다듬기, 아이콘·파비콘 교체를 넣는다.

**Architecture:** 방 도메인을 확장한다. `RoomProfile`은 `RoomSettings(gameType, Capacity, RoomLock)`를 갖고, `Room`은 참가자와 관전자를 `RoomOccupants(players, spectators)`로 묶는다. 중복 로그인은 보안 계층의 `ActiveSessions`가 처리한다. 이전 HTTP 세션을 무효화하고, 그 세션의 WebSocket을 닫고, 교체된 세션에서 오는 401에는 `SESSION_REPLACED`를 돌려준다. 프론트는 기존 컴포넌트를 확장하고, 새 화면 단위(`RulesCarousel`, `PasswordModal`, `ActiveRoomBar`, `OpponentBoardModal`, `icons.tsx`)를 추가한다.

**Tech Stack:** Java 21 / Spring Boot 3.5 / Spring Security / STOMP / JUnit5 / MockMvc / TestRestTemplate · React 19 / TS 5.9 / Tailwind 4 / motion 14 / Vitest 5 + Testing Library

**Spec:** `docs/superpowers/specs/2026-10-06-lounge-improvements-design.md` (번호 `#N`은 사용자 요청 번호)

## Global Constraints

- 백엔드 Java는 `/Users/ichanhan/CLAUDE.md`의 객체지향 생활 체조를 지킨다.
  - 메서드당 들여쓰기 1단계
  - `else` 금지
  - 원시값은 VO로 감싼다
  - 한 줄에 점 하나(스트림 체이닝 줄바꿈은 기존 관례대로 허용)
  - 일급 컬렉션
  - 클래스당 필드 3개 이하
  - 오류는 `BusinessException(ErrorCode)`
  - 에러 응답은 `{status, code, message}`
- 규칙 엔진(`papersafari`)에는 `roundNumber()` 조회 하나만 추가한다. 게임 규칙은 바꾸지 않는다.
- 숨김 정보: 뒷면 카드 값은 서버가 null로 보낸다. 관전자에게도 마찬가지다. 클라이언트가 카드 값을 만들어 내지 않는다.
- 방 비밀번호는 BCrypt 해시로만 메모리에 둔다. 어떤 응답에도 해시나 원문을 넣지 않는다.
- 새 런타임 의존성은 추가하지 않는다. 외부 이미지·폰트·소리 파일도 추가하지 않는다(파비콘은 `frontend/public/favicon.svg`).
- 사용자 문구는 한국어 해요체로 쓴다. 오류 코드와 메시지는 스펙 4절 표의 값을 그대로 쓴다.
- 기존 테스트는 지우지 않는다. 단언 대상이 바뀐 경우에만 고친다. 기준 테스트 수는 백엔드 263, 프론트 149다.
- 커밋 메시지는 한국어 conventional 형식으로 쓰고, 끝에 빈 줄과 정확히 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`를 붙인다.
- 반응형 기준은 PC = `(min-width: 1024px)`(`PC_QUERY`)다. "PC가 아닌 크기"는 `TableRail` 배치를 말한다.

## Review Focus

1. **관전자에게 숨김 정보가 새면 안 된다.** 관전자의 sync와 브로드캐스트 화면에서 뒷면 카드 `card`는 항상 null이어야 한다. 테스트는 Task 3의 관전자 sync 테스트다.
2. **이전 탭이 끊긴 뒤에도 행동하면 안 된다.** 같은 계정으로 다시 로그인하면 이전 세션의 WebSocket이 닫혀야 한다. 이전 세션으로 REST를 호출하면 401 `SESSION_REPLACED`가 와야 한다. 새로고침이나 로그아웃 후 재로그인처럼 정상적인 재로그인은 막으면 안 된다. 테스트는 Task 4다.
3. **참가자가 모두 나가고 관전자만 남은 방.** 방이 사라지고 관전자 색인도 정리돼야 한다. 그래야 관전자가 다른 방을 만들 수 있다. 테스트는 Task 3이다.
4. **1초 폴링.** 응답이 느릴 때 요청이 겹쳐 쌓이면 안 된다. 테스트는 Task 6이다.
5. **방에 있는 동안 라운지로 이동.** 방이 사라졌거나 나간 경우 돌아가기 바가 사라져야 한다. 같은 게임의 결과 모달은 다시 뜨면 안 된다. 테스트는 Task 7이다.

---

### Task 1: 방 설정 — 최대 인원과 비공개방 비밀번호 (#17, #19)

**Files:**
- Create: `backend/src/main/java/com/boardgame/room/domain/Capacity.java`
- Create: `backend/src/main/java/com/boardgame/room/domain/RawRoomPassword.java`
- Create: `backend/src/main/java/com/boardgame/room/domain/RoomPasswordHash.java`
- Create: `backend/src/main/java/com/boardgame/room/domain/RoomPasswordHasher.java` (interface)
- Create: `backend/src/main/java/com/boardgame/room/infra/BCryptRoomPasswordHasher.java`
- Create: `backend/src/main/java/com/boardgame/room/domain/RoomLock.java`
- Create: `backend/src/main/java/com/boardgame/room/domain/RoomSettings.java`
- Modify: `room/domain/RoomProfile.java`, `Room.java`, `RoomMembers.java`, `room/api/CreateRoomRequest.java`, `room/api/RoomResponse.java`, `room/api/RoomController.java`, `room/application/RoomService.java`, `common/error/ErrorCode.java`
- Create: `backend/src/main/java/com/boardgame/room/api/JoinRoomRequest.java`
- Test: `backend/src/test/java/com/boardgame/room/domain/CapacityTest.java`, `RawRoomPasswordTest.java`, `RoomLockTest.java`; update `RoomTest`, `RoomRegistryTest`, `GameOccupanciesTest` and other tests that build `RoomProfile`; add cases to `backend/src/test/java/com/boardgame/room/api/RoomApiTest.java`

**Interfaces:**
- Produces:
  - `Capacity.of(GameType type, int value)`: throws `INVALID_CAPACITY` when out of `type.minPlayers()..type.maxPlayers()`. Also `Capacity.max(GameType)`, `int value()` and `boolean isFull(int size)`.
  - `RawRoomPassword(String value)`: 4–20 characters after `strip()`, otherwise `INVALID_ROOM_PASSWORD`.
  - `RoomPasswordHash(String value)`.
  - `interface RoomPasswordHasher { RoomPasswordHash hash(RawRoomPassword raw); boolean matches(RawRoomPassword raw, RoomPasswordHash hash); }`, implemented by `@Component BCryptRoomPasswordHasher`.
  - `RoomLock.open()` and `RoomLock.locked(RoomPasswordHash)`, with these methods:
    - `boolean isLocked()`
    - `void require(String rawOrNull, RoomPasswordHasher hasher)`: open always passes. Locked with null, blank or mismatching input throws `ROOM_PASSWORD_MISMATCH`. Input shorter than 4 characters is a mismatch, not `INVALID_ROOM_PASSWORD`.
  - `RoomSettings(GameType gameType, Capacity capacity, RoomLock lock)`.
  - `RoomProfile(RoomCode code, RoomName name, RoomSettings settings)`. Keep `profile.gameType()` as a delegating method so callers don't change.
  - `Room` changes:
    - `Room.join(Participant p, String password, RoomPasswordHasher hasher)` checks the lock only when `p` is not already a member.
    - `Room.capacity()` returns an int for the response.
    - `Room.isLocked()`.
  - `CreateRoomRequest(String name, GameType gameType, Integer maxPlayers, String password)`.
  - `JoinRoomRequest(String password)`.
  - `RoomResponse` gains `boolean locked`. `maxPlayers` becomes the room capacity.
  - `ErrorCode` values per spec §4: `INVALID_CAPACITY`, `INVALID_ROOM_PASSWORD`, `ROOM_PASSWORD_MISMATCH`, `ROOM_PRIVATE`, `ROOM_NOT_PLAYING`, `NOT_SPECTATOR`, `SESSION_REPLACED`. Add all seven now so later tasks only use them.

- [ ] **Step 1: 실패하는 도메인 테스트 작성**

`CapacityTest`:
```java
@Test void 게임_인원_범위_안의_정원만_만든다() {
    assertThat(Capacity.of(GameType.PAPER_SAFARI, 3).value()).isEqualTo(3);
    assertError(() -> Capacity.of(GameType.PAPER_SAFARI, 1), ErrorCode.INVALID_CAPACITY);
    assertError(() -> Capacity.of(GameType.PAPER_SAFARI, 6), ErrorCode.INVALID_CAPACITY);
    assertThat(Capacity.max(GameType.PAPER_SAFARI).value()).isEqualTo(5);
}
@Test void 정원이_찼는지_안다() {
    Capacity capacity = Capacity.of(GameType.PAPER_SAFARI, 3);
    assertThat(capacity.isFull(2)).isFalse();
    assertThat(capacity.isFull(3)).isTrue();
}
```
`RawRoomPasswordTest`: accepts "1234" and a 20-character value. Rejects "123", a 21-character value, and a blank value with `INVALID_ROOM_PASSWORD`. `"  abcd  "` is stored as "abcd".

`RoomLockTest` uses a fake hasher (`hash` = `"h:" + raw`, `matches` compares the same way):
```java
@Test void 공개방은_비밀번호_없이_통과한다() { RoomLock.open().require(null, hasher); }
@Test void 잠긴_방은_맞는_비밀번호만_통과한다() {
    RoomLock lock = RoomLock.locked(hasher.hash(new RawRoomPassword("1234")));
    lock.require("1234", hasher);
    assertError(() -> lock.require("9999", hasher), ErrorCode.ROOM_PASSWORD_MISMATCH);
    assertError(() -> lock.require(null, hasher), ErrorCode.ROOM_PASSWORD_MISMATCH);
    assertError(() -> lock.require("12", hasher), ErrorCode.ROOM_PASSWORD_MISMATCH);
}
```
`RoomTest` addition: when a 3-person room is full, the fourth `join` gives `ROOM_FULL`. When a member re-joins a locked room, the password is not checked.

- [ ] **Step 2: Confirm the tests fail**

Run: `mvn -q -f backend/pom.xml test -Dtest='CapacityTest,RawRoomPasswordTest,RoomLockTest'`
Expected: compile errors.

- [ ] **Step 3: Implement the domain**
  - `RoomMembers.add(Participant, Capacity)`: replaces the `gameType.maxPlayers()` check with `capacity.isFull(members.size())`.
  - `Room.open(RoomProfile, Participant host)` now uses the profile's capacity.
  - Update every test helper that builds `new RoomProfile(code, name, GameType.PAPER_SAFARI)` to use `new RoomSettings(GameType.PAPER_SAFARI, Capacity.max(GameType.PAPER_SAFARI), RoomLock.open())`. Find them with `grep -rn "new RoomProfile" backend/src`.
  - `GameOccupancies` and other `gameType()` callers keep working because `RoomProfile.gameType()` delegates to `settings.gameType()`.

- [ ] **Step 4: Write failing API tests (`RoomApiTest`)**
  - Creating with `{"name":"비밀방","gameType":"PAPER_SAFARI","maxPlayers":3,"password":"1234"}` returns 201. The response has `$.maxPlayers == 3` and `$.locked == true`, and the response body string contains neither `1234` nor `$2a$`.
  - `maxPlayers: 6` returns 400 `INVALID_CAPACITY`. `password: "12"` returns 400 `INVALID_ROOM_PASSWORD`.
  - Another user joins with no body: 403 `ROOM_PASSWORD_MISMATCH`. With `{"password":"0000"}`: 403. With `{"password":"1234"}`: 200.
  - The member who already joined joins again with no body: 200.
  - In a 2-person room, a third user joins: 409 `ROOM_FULL`.
  - Omitting `maxPlayers` gives `$.maxPlayers == 5`. Omitting `password` gives `$.locked == false`.

- [ ] **Step 5: Implement API/service**
  - `RoomController.join` takes `@RequestBody(required = false) JoinRoomRequest request`.
  - `RoomService.create` builds `RoomSettings` from the request: `Capacity.of(type, request.maxPlayers())` or `Capacity.max(type)`. For the lock it uses `RoomLock.locked(hasher.hash(new RawRoomPassword(pw)))` when `pw != null && !pw.isBlank()`, otherwise `RoomLock.open()`.
  - Inject `RoomPasswordHasher` into `RoomService`.

- [ ] **Step 6: Run the full backend suite**

Run: `mvn -q -f backend/pom.xml test`. Expected: all pass (263 + new).

- [ ] **Step 7: Commit**

`feat: 방장이 최대 인원과 비밀번호(비공개방)를 정해 방을 만들 수 있게`

---

### Task 2: 방 목록에 게임 중인 방과 진행 라운드 (#1 목록)

**Files:**
- Modify: `backend/src/main/java/com/boardgame/game/GameSession.java` (`int roundNumber()`)
- Modify: `backend/src/main/java/com/boardgame/papersafari/PaperSafariSession.java` (+ `PaperSafariGame` if a getter is needed)
- Modify: `room/domain/Room.java`, `RoomGame.java` (`Optional<Integer> roundNumber()` while playing), `room/api/RoomSummaryResponse.java`, `RoomController.java`, `room/application/RoomService.java`
- Modify: `backend/src/test/java/com/boardgame/room/domain/FakeGameSession.java` (implement `roundNumber()`)
- Test: `RoomApiTest` list cases; `PaperSafariSessionTest` (or the existing session test) for `roundNumber`

**Interfaces:**
- Produces:
  - `GameSession.roundNumber()`.
  - `RoomService.rooms(GameType)` replaces `waitingRooms`. Waiting rooms come first, then playing rooms, each group in code order.
  - `RoomSummaryResponse(code, name, gameType, gameTypeName, playerCount, maxPlayers, hostNickname, RoomStatus status, boolean locked, Integer roundNumber, int spectatorCount)`.
  - `spectatorCount` is 0 until Task 3 wires it. Put a `Room.spectatorCount()` returning 0 in this task, and Task 3 replaces it.

- [ ] **Step 1: Failing tests**
  - The session test: right after creation, `roundNumber()` is 1.
  - API: create waiting room A, then create room B and start it. `GET /api/rooms?gameType=PAPER_SAFARI` contains A with `status=WAITING` and `roundNumber=null`, and B with `status=PLAYING`, `roundNumber=1`, `locked=false` and `maxPlayers=5`. Use JsonPath filters by code (`$[?(@.code=='%s')].status`), because other tests share the registry.
  - Every room in the list has the `locked` key.
- [ ] **Step 2: Confirm failure** with `mvn -q -f backend/pom.xml test -Dtest=RoomApiTest`.
- [ ] **Step 3: Implement.** Replace `isWaitingFor(type)` with `isFor(type)`, which does not filter by status. Sort so waiting rooms come first: `Comparator.comparing((Room room) -> room.status() == RoomStatus.PLAYING).thenComparing(Room::codeValue)` (false sorts before true).
- [ ] **Step 4: Full backend suite passes.**
- [ ] **Step 5: Commit** `feat: 방 목록에 게임 중인 방과 진행 라운드·잠금 여부를 함께 보여줌`

---

### Task 3: 관전 (#1 변경분) + 방 토픽 구독 보호

**Files:**
- Create: `room/domain/Spectators.java`, `room/domain/RoomOccupants.java`
- Modify: `room/domain/Room.java`, `RoomRegistry.java`, `room/application/RoomService.java`, `room/api/RoomController.java`, `room/api/RoomResponse.java` (+ `RoomSpectatorResponse` record `{id, nickname}`), `room/api/RoomSummaryResponse.java` (spectatorCount), `room/api/GameMessageController.java` (if sync auth changes), `common/websocket/WebSocketConfig.java`
- Create: `common/websocket/RoomTopicGuard.java` (ChannelInterceptor)
- Test: `room/domain/RoomTest` (spectator rules), `RoomRegistryTest` (spectator index cleanup), `room/api/RoomSpectatorApiTest.java` (new), `room/api/StompGameFlowTest.java` (spectator sync gets public info only; outsider subscription to room topic is refused)

**Interfaces:**
- Produces:
  - `Room.watch(Participant)`:
    - A locked room throws `ROOM_PRIVATE`.
    - A non-playing room throws `ROOM_NOT_PLAYING`.
    - Someone already a player or spectator is a no-op.
  - `Room.seat(long memberId)`:
    - A non-spectator throws `NOT_SPECTATOR`.
    - A playing room throws `ROOM_ALREADY_PLAYING`.
    - A full room throws `ROOM_FULL`.
    - Otherwise move the person from spectators to players.
  - `Room.isOccupant(long memberId)`.
  - `Room.occupantIds()` returns players and spectators.
  - `Room.spectators()` returns `List<Participant>`.
  - `Room.leave(memberId)` removes a spectator if the person is one, with no outcomes. Otherwise it runs the existing player path.
  - `Room.isEmpty()` is true when there are no players, even if spectators remain.
  - `RoomRegistry.save` indexes `occupantIds()`. When the room is empty it removes the index entries of all occupants, spectators included.
  - `RoomService` additions: `watch(code, LoginMember)`, `seat(code, memberId)`, `isOccupant(code, memberId)` (synchronized; `false` when the room is missing).
  - `RoomService.get` requires an occupant: non-occupants get 403 `NOT_IN_ROOM`. The frontend only calls `get` for rooms the user is in.
  - `sync`: the requester must be an occupant. A spectator gets `room.viewFor(id)`.
  - `broadcast` sends views to all occupants.
  - REST endpoints:
    - `POST /api/rooms/{code}/watch` returns `RoomResponse`.
    - `POST /api/rooms/{code}/seat` returns `RoomResponse`.
  - `RoomResponse` gains `List<RoomSpectatorResponse> spectators`.
  - `RoomTopicGuard`: on SUBSCRIBE to `/topic/rooms/{code}`, it reads the member id via `LoginMember.idOf(accessor.getUser())`. It refuses with `MessageDeliveryException` unless `roomService.isOccupant(code, id)`. Register it after `InboundDestinationGuard`.
  - Watch for a bean cycle: `RoomService` → notifier → messaging template, and the guard → `RoomService`. If a cycle appears, inject `ObjectProvider<RoomService>`.
  - Forfeit, presence and `act`/`start` stay players-only. `presence.baseline` is called with `room.memberIds()` (players).

- [ ] **Step 1: Failing domain tests (`RoomTest`)**
  - Watching a playing open room works.
  - A locked room gives `ROOM_PRIVATE`. A waiting room gives `ROOM_NOT_PLAYING`.
  - A spectator's `act` gives `NOT_IN_ROOM`.
  - A spectator `leave` returns no outcomes and the game continues.
  - After the game finishes, `seat` makes the spectator a player. When full it gives `ROOM_FULL`. A non-spectator `seat` gives `NOT_SPECTATOR`.
  - When all players leave, `isEmpty()` is true.
- [ ] **Step 2: Failing registry test.** The room has player 1 and spectator 9. Player 1 leaves and the room is saved. Then `findByMember(9)` is empty and the room no longer exists.
- [ ] **Step 3: Failing API tests (`RoomSpectatorApiTest`)**, using `ApiUsers` and `@MockitoBean RoomNotifier`:
  - Watching a public playing room returns 200, and the response `spectators` lists the watcher.
  - Watching a locked playing room returns 403 `ROOM_PRIVATE`.
  - Watching a waiting room returns 409 `ROOM_NOT_PLAYING`.
  - A spectator calling `/start` returns 403 `NOT_IN_ROOM`. A spectator calling `GET /api/rooms/{code}` returns 200.
  - An outsider calling `GET /api/rooms/{code}` returns 403 `NOT_IN_ROOM`.
  - While spectating, creating a room returns 409 `ALREADY_IN_ROOM`.
  - Leaving as a spectator returns 204, and the list's `spectatorCount` drops by 1.
  - `GET /api/rooms/me` for a spectator returns that room.
- [ ] **Step 4: Failing STOMP tests (`StompGameFlowTest`)**:
  - (a) A third user watches a playing room, subscribes to `/user/queue/game`, and sends sync. In the received view, every slot with `faceUp == false` has `card == null`, and `round.held.card` is null whenever held exists and its source is `DECK`.
  - (b) An outsider (logged in, not in the room) subscribing to `/topic/rooms/{code}` gets refused: an ERROR frame, or no message arrives within 1s. Follow the existing test's helper style.
- [ ] **Step 5: Implement** (keep every class at 3 fields or fewer: `Room(profile, occupants, game)`, `RoomOccupants(players, spectators)`).
- [ ] **Step 6: Full backend suite passes.**
- [ ] **Step 7: Commit** `feat: 공개방 게임 관전과 자리 앉기, 방 채널 구독을 참가자·관전자로 제한`

---

### Task 4: 중복 로그인 차단 (#20)

**Files:**
- Create: `common/security/ActiveSessions.java`, `common/security/ReplacedSessions.java`, `common/websocket/WebSocketSessions.java`
- Modify: `common/security/SessionLogin.java`, `common/security/JsonAuthenticationEntryPoint.java`, `common/security/SecurityConfig.java` (logout handler hook), `common/websocket/WebSocketConfig.java` (handshake interceptor + decorator factory)
- Create: `common/security/SessionCleanupListener.java` (`HttpSessionListener` → `ActiveSessions.forget(session)`), registered as a `@Component`/`@Bean`
- Test: `common/security/ReplacedSessionsTest.java`, `ActiveSessionsTest.java`, `common/websocket/WebSocketSessionsTest.java`, `member/api/DuplicateLoginApiTest.java` (TestRestTemplate with real cookies, `@SpringBootTest(webEnvironment = RANDOM_PORT)`)

**Interfaces:**
- Produces:
  - `ReplacedSessions`:
    - `record(String sessionId, Instant at)` and `boolean contains(String sessionId, Instant now)`.
    - Entries older than 30 minutes are ignored and pruned.
    - It holds at most 1,000 entries, evicting the oldest. Use a `Clock` bean.
  - `ActiveSessions.replace(long memberId, HttpSession current)`:
    - If the previous session is not `current`, record the previous id in `ReplacedSessions`, invalidate it (ignore `IllegalStateException` if it is already invalid), and call `webSocketSessions.closeAll(previousId)`.
    - Store `current`.
  - `ActiveSessions.forget(HttpSession session)` removes the entry only if the map still points at that session.
  - `WebSocketSessions`:
    - `register(String httpSessionId, WebSocketSession ws)`, `unregister(WebSocketSession ws)`.
    - `closeAll(String httpSessionId)` closes with `new CloseStatus(4001, "SESSION_REPLACED")` and ignores IO errors.
    - A `WebSocketHandlerDecorator` registers in `afterConnectionEstablished` (reading the `HTTP.SESSION.ID` attribute put by `HttpSessionHandshakeInterceptor`) and unregisters in `afterConnectionClosed`.
  - `JsonAuthenticationEntryPoint`: if `request.getRequestedSessionId()` is non-null and `replacedSessions.contains(id, now)`, use `ErrorCode.SESSION_REPLACED`, otherwise `UNAUTHORIZED`.
  - Logout: the logout handler calls `activeSessions.forget(session)` before invalidation. The `HttpSessionListener` also covers it.
  - `SessionLogin.establish` calls `activeSessions.replace(member.id(), request.getSession())` after saving the context. Note: `changeSessionId()` keeps the same session object, so only a different session object counts as "previous".

- [ ] **Step 1: Failing unit tests**
  - `ReplacedSessionsTest`: contains within 30 minutes, not after. Oldest is evicted past 1,000.
  - `ActiveSessionsTest`, with `MockHttpSession` and a mocked `WebSocketSessions`:
    - A second session for the same member invalidates the first (`isInvalid()`), records it, and calls `closeAll(first.getId())`.
    - The same session twice does nothing.
    - `forget` of a stale session keeps the newer one.
  - `WebSocketSessionsTest`, with a mocked `WebSocketSession`: `closeAll` closes only the sessions registered under that id, with status code 4001.
- [ ] **Step 2: Failing API test (`DuplicateLoginApiTest`)** using `TestRestTemplate` and the `Set-Cookie` JSESSIONID, as in `StompGameFlowTest`:
  - Sign up user X, log in and get cookie A, log in again and get cookie B.
  - `GET /api/members/me` with A returns 401 and `$.code == "SESSION_REPLACED"`. With B it returns 200.
  - Log out with B, log in again to get cookie C, and `me` with C returns 200.
  - A bogus cookie gets 401 `UNAUTHORIZED`.
- [ ] **Step 3: Failing STOMP test (`StompGameFlowTest` or the new test)**: connect a STOMP session with cookie A, log in again to get B, and A's STOMP session is disconnected within 3s. Assert through the session handler's `handleTransportError` or `isConnected()` becoming false.
- [ ] **Step 4: Implement.**
- [ ] **Step 5: Full backend suite passes** (watch for other tests that log in the same account twice; `ApiUsers` uses unique users).
- [ ] **Step 6: Commit** `feat: 같은 아이디로 새로 로그인하면 이전 접속을 끊고 안내`

---

### Task 5: 아이콘·파비콘·문구, 규칙 슬라이드, 대기실 규칙 (#2, #4, #5, #8, #15, #16, #18 일부)

**Files:**
- Create: `frontend/src/components/icons.tsx`, `frontend/public/favicon.svg`
- Modify: `frontend/index.html` (favicon link → `/favicon.svg`, remove the data-URI)
- Create: `frontend/src/games/papersafari/rules.ts`, `frontend/src/games/papersafari/RulesCarousel.tsx`, `RulesCarousel.test.tsx`
- Modify: `frontend/src/components/Layout.tsx` (nav text "게임 목록", mute button icons), `frontend/src/pages/GameShelfPage.tsx` (texts, "규칙 보기" button + carousel modal), `GameShelfPage.test.tsx`, `frontend/src/room/WaitingRoom.tsx` (rules always open, uses `rules.ts`; stacked spacing)

**Interfaces:**
- Produces:
  - `icons.tsx` exports `SpeakerIcon`, `SpeakerMutedIcon`, `RefreshIcon`, `BookIcon`, `EyeIcon`, `LockIcon`. Each is `({ className }: { className?: string }) => JSX`, uses a 24×24 viewBox and `currentColor` stroke, and is `aria-hidden="true"`.
  - `rules.ts` exports:
    - `RULE_SLIDES: { title: string; body: string[]; cards: CardView[] }[]` with 7 slides, content per spec §3.1.
    - `RULE_SUMMARY: string[]`, the always-open waiting-room bullets, replacing the inline `<li>` texts with the same meaning.
  - `RulesCarousel({ open, onClose })` renders a `Modal` titled "페이퍼 사파리 규칙" (wide):
    - A slide counter `n / 7`.
    - Prev/next buttons labelled `이전`/`다음`. Prev is disabled on the first slide and next on the last.
    - Dot buttons with `aria-label="N번째 설명"` and `aria-current="step"` on the active one.
    - ←/→ keys, and touch swipe of at least 50px.
    - Slide transition: `AnimatePresence` with x offset ±40px. Reduced motion is handled by MotionConfig.
    - Cards render via `CardFace` (`faceUp`, size `md`, no onClick).
- [ ] **Step 1: Failing tests**
  - `RulesCarousel.test.tsx`:
    - Opens on slide 1 ("1 / 7").
    - 다음 → "2 / 7". 이전 → "1 / 7".
    - On the last slide (reached via dot 7), 다음 is disabled.
    - `{ArrowRight}` advances and `{ArrowLeft}` goes back.
    - Slide 5 text includes "0점".
  - `GameShelfPage.test.tsx` additions:
    - The heading text "오늘은 뭘 할까요?" stays, and the subtitle is "목록에서 게임을 골라 주세요".
    - The "규칙 보기" button opens a dialog named "페이퍼 사파리 규칙".
  - `Layout.test.tsx`:
    - The nav link text is "게임 목록".
    - The mute button still has aria-label "소리 끄기" and contains an `svg`, not the 🔊 emoji text.
  - `WaitingRoom.test.tsx`: there is no `details` element, and the rule text is visible without interaction.
- [ ] **Step 2: Confirm failure.**
- [ ] **Step 3: Implement.**
  - Favicon art: a 64×64 SVG of a green felt circle (`#2f8a57`) with a wood ring (`#8a5a32`), and a cream card tilted −12° showing a simplified lion face (mane circle `#c2611a`, face `#f2b45a`).
  - Waiting room stacked spacing: grid `gap-6` (24px) at all sizes.
- [ ] **Step 4: Full frontend tests + build.**
- [ ] **Step 5: Commit** `feat: 규칙 슬라이드·게임 목록 문구·자체 아이콘과 파비콘, 대기실 규칙 항상 펼침`

---

### Task 6: 게임 로비 — 방 만들기 옵션, 게임 중인 방, 관전·비밀번호, 1초 폴링 (#1, #3, #6, #7, #17, #18, #19)

**Files:**
- Modify: `frontend/src/api/types.ts`
  - `Room` gains `locked: boolean` and `spectators: {id:number;nickname:string}[]`.
  - `RoomSummary` gains `status`, `locked`, `roundNumber: number|null`, `spectatorCount`.
- Modify: `frontend/src/api/rooms.ts`
  - `create(name, gameType, maxPlayers, password?)`
  - `join(code, password?)`
  - `watch(code)`
  - `seat(code)`
- Create: `frontend/src/room/PasswordModal.tsx` (+ test)
- Modify: `frontend/src/pages/GameLobbyPage.tsx` (+ new `GameLobbyPage.test.tsx`), `frontend/src/records/StatSummary.tsx` (vertical list) + its usages, `frontend/src/pages/GameShelfPage.tsx` (poll 1s with no overlap)
- Possibly create: `frontend/src/lib/usePolling.ts` (+ test), shared by the shelf and the lobby

**Interfaces:**
- Produces:
  - `usePolling(fn: () => Promise<void>, intervalMs: number)`: calls immediately, then every `intervalMs`, skipping a tick while the previous call is pending. Stops on unmount.
  - `PasswordModal({ open, roomName, error, onSubmit(password), onCancel })`: a dialog named `"${roomName} 비밀번호"`.
  - Lobby layout:
    - Create form: name, a "최대 인원" radio group of 2–5 buttons (default 5, `role="radiogroup"`), a "비공개방" checkbox, and a password field (visible only when checked, 4–20 characters, required when checked).
    - "기다리는 방" section, then "게임 중인 방" section, with `mt-8` (≥24px) spacing between the form panel and the lists.
    - Each waiting room: name, 👑 host, seats `n/max`, a lock icon if locked, and 참가. A locked room's 참가 opens `PasswordModal`.
    - Each playing room: name, `N라운드 진행 중`, `👀 N`. Public rooms get a "관전하기" button (`roomsApi.watch`). Locked rooms get a disabled "비공개" button with the lock icon.
    - The join-by-code field and its submit button stay:
      - On `ROOM_PASSWORD_MISMATCH`, open `PasswordModal` and retry `join(code, pw)`. A wrong password shows the error inside the modal.
      - On `ROOM_ALREADY_PLAYING`, show a toast "게임 중인 방이에요. 목록에서 관전할 수 있어요."
  - The refresh button uses `RefreshIcon`, has `aria-label="새로고침"`, and rotates 360° on click.
  - `StatSummary` is a vertical `dl` with rows 게임, 승·무·패, 승률, 라운드, 라운드 승률, 평균 점수. Keep the existing texts used by `RecordsPage.test`, adjusting that test only if labels moved.
- [ ] **Step 1: Failing tests**
  - `usePolling.test.ts` (fake timers): calls at 0 ms, 1000 ms and 2000 ms. When `fn` returns a promise that hasn't resolved, the 1000 ms tick does not call again.
  - `PasswordModal.test.tsx`: submit passes the typed value, and the error text renders.
  - `GameLobbyPage.test.tsx`, mocking `roomsApi` and `recordsApi`:
    - Choosing "3" and checking 비공개 with "1234" calls `create('…', 'PAPER_SAFARI', 3, '1234')`.
    - The list renders two sections. A playing public room has a "관전하기" button that calls `watch` and navigates. A playing locked room has a disabled "비공개".
    - A locked waiting room's 참가 opens the dialog. Submitting a wrong password (mock rejects `ApiError(403,'ROOM_PASSWORD_MISMATCH')`) shows "비밀번호가 맞지 않아요." inside it. The right one navigates.
    - Rooms are polled every 1 s (fake timers: `list` call count grows).
- [ ] **Step 2: Confirm failure.** **Step 3: Implement.** **Step 4: Full tests + build.**
- [ ] **Step 5: Commit** `feat: 로비에서 최대 인원·비공개방 만들기, 게임 중인 방 관전, 1초 새로고침`

---

### Task 7: 방 돌아가기 바, 결과 모달 기억, 관전자 화면, 중복 로그인 안내 (#14, #20, #1 관전 화면)

**Files:**
- Create: `frontend/src/room/ActiveRoomBar.tsx` (+ test)
- Modify: `frontend/src/components/Layout.tsx` (render the bar), `frontend/src/pages/GameShelfPage.tsx` and `GameLobbyPage.tsx` (remove the auto-redirect into the room, and their tests' "이미 방에 있으면" case → it now stays on the page and the bar is shown by Layout), `frontend/src/pages/LoginPage.tsx`, `SignupPage.tsx` (after success: `roomsApi.mine()` → navigate to the room if present, else `/`), `frontend/src/pages/RoomPage.tsx` (persisted game-over dismissal; spectator handling: the "방에서 나왔어요" check must treat spectators as present), `frontend/src/room/WaitingRoom.tsx` (spectator list + "자리에 앉기"), `frontend/src/games/papersafari/PaperSafariTable.tsx` (spectator mode)
- Modify: `frontend/src/api/http.ts` (`setUnauthorizedHandler((reason?: 'SESSION_REPLACED') => void)`), `frontend/src/realtime/Realtime.ts` (`onWebSocketClose` receives a CloseEvent; code 4001 → `onSessionReplaced` listeners), `frontend/src/auth/AuthContext.tsx` (wire both to logout-locally + `navigate('/login', { state: { notice } })`), `frontend/src/pages/LoginPage.tsx` (show `location.state.notice`)
- Create: `frontend/src/lib/dismissals.ts` (+ test)

**Interfaces:**
- Produces:
  - `dismissals.ts`:
    - `gameOverKey(code: string, game: PaperSafariView): string` returns `${code}:${winnerId}:${JSON.stringify(tokens)}`.
    - `isDismissed(key)` and `markDismissed(key)` use `sessionStorage['bg.dismissedGameOver']` (a JSON array, max 20 entries). Wrap every read and write in try/catch.
  - `ActiveRoomBar` (inside `Layout`, `fixed bottom-4`, wood/mustard style):
    - Polls `roomsApi.mine()` on pathname change and every 5 s.
    - Shows when a room exists and the pathname is not `/rooms/${code}`.
    - Text: "🎲 참여 중인 방으로 돌아가기 · {방 이름}". Click navigates.
    - Hidden on `/login` and `/signup`, and while the table is shown.
  - `RoomPage`:
    - `showGameOver` also requires `!isDismissed(key)`. Closing calls `markDismissed`.
    - "Am I in this room": `room.members` or `room.spectators` contains me.
    - Spectator: `view` exists, and I'm not seated.
  - `PaperSafariTable` (spectator, when `meId` is not in `round.boards`):
    - Every board is shown as an opponent.
    - My-board area shows a `Panel` "👀 관전 중이에요".
    - All action buttons are disabled.
    - The HUD instruction is the normal "N님의 차례예요." path.
  - `WaitingRoom`:
    - A line "👀 관전 중: 닉네임, …" when spectators exist.
    - If I'm a spectator and the room is waiting with `members.length < maxPlayers`, a "자리에 앉기" button calls `roomsApi.seat(code)`.
    - Start/host controls are hidden for spectators.
  - Session replaced:
    - `http.ts` calls the handler with `'SESSION_REPLACED'` when the 401 body code is that.
    - `Realtime` exposes `onSessionReplaced(listener): () => void`, fired on close code 4001.
    - AuthContext on either: clear the member, then navigate to `/login` with `state.notice = '다른 곳에서 로그인해서 로그아웃됐어요.'`.
    - LoginPage shows the notice in a `role="alert"` paper strip.
- [ ] **Step 1: Failing tests**
  - `dismissals.test.ts`: mark then isDismissed is true. Storage that throws gives false with no throw. The list caps at 20.
  - `ActiveRoomBar.test.tsx`: mine returns a room and the path is `/` → the bar is shown, and clicking it navigates to the room. The path is that room → hidden. mine returns undefined → hidden.
  - `GameShelfPage.test` changes: the "이미 방에 있으면 그 방으로 간다" test becomes "이미 방에 있어도 목록에 머문다". Do the same for the lobby test from Task 6.
  - `RoomPage`-level or `GameOverPanel` test: after closing the game-over modal, re-rendering the RoomPage with the same view does not show it. If RoomPage is hard to render, test it through a small hook `useGameOverDismissal(code, game)`.
  - `PaperSafariTable.test`: a spectator (meId 99) sees 12 slots, all disabled; "관전 중이에요" is visible; and "덱에서 뽑기" is disabled.
  - `WaitingRoom.test`: the spectator line renders. A spectator sees "자리에 앉기", and clicking it calls `onSeat`.
  - `http.test.ts`: a 401 with code SESSION_REPLACED calls the handler with that reason. `Realtime.test.ts`: close code 4001 notifies `onSessionReplaced`.
  - `LoginPage` test (new): rendering with route state notice shows the alert text.
- [ ] **Step 2: Confirm failure. Step 3: Implement. Step 4: Full tests + build.**
- [ ] **Step 5: Commit** `feat: 방에 있어도 라운지 이동·돌아가기 바, 결과 모달 한 번만, 관전 화면, 중복 로그인 안내`

---

### Task 8: 게임 화면 다듬기 — 모바일 배치, 상대 판 확대, 안내 문구 고정, 결과 간격 (#9, #10, #11, #12, #13)

**Files:**
- Modify: `frontend/src/games/papersafari/layout/TableRail.tsx`, `layout/Seat.tsx`, `layout/TableRound.tsx`, `layout/Hud.tsx`, `PaperSafariTable.tsx` (instruction short variants, footer split), `PlayerBoard.tsx` (estimate badge for opponents)
- Create: `frontend/src/games/papersafari/OpponentBoardModal.tsx` (+ test)
- Modify: `RoundResultModal.tsx`, `GameOverPanel.tsx` (spacing)
- Modify tests: `PaperSafariTable.test.tsx`

**Interfaces:**
- Produces:
  - `instruction(phase, myTurn, needsFlip, name, canDiscard, compact: boolean)`. When compact (TableRail), use the short strings from spec §3.5 exactly.
  - `Hud` instruction element: `data-testid="instruction"`, classes `min-h-[3rem] line-clamp-2 flex items-center justify-center` (fixed two-line box).
  - `TableRail` layout of my area:
    - A row: my `Seat` (board + hand), then a side column `data-testid="my-side"` containing the 버리기 button and the estimate.
    - The column is an `@container` element. Inside, `.estimate-hidden-note` is hidden via `@container (max-width: 120px)` (or a Tailwind 4 container variant `@max-[120px]:hidden`), and the score text drops from `text-lg` to `text-base`.
    - The footer under the felt is removed in TableRail. TableRound keeps its current footer placement.
  - `TableRail` rail: `justify-[safe_center]` (or `justify-center` with `min-w-max` inner wrapper), `gap-1.5`.
  - `OpponentBoardModal({ board, nickname, tokens, presence, open, onClose })`:
    - A Modal titled `${nickname}님의 판`, showing the `PlayerBoard` at size `lg`, tokens, the connection state, and `예상 점수 N` plus `(+ 가려진 M장)` from `estimateBoard`.
    - Opponent `Seat`s become clickable: the board wrapper is a `button`, `aria-label="${nickname}님의 판 크게 보기"`, in both layouts.
    - Each opponent seat shows a small badge `예상 N점` (`data-testid="opponent-estimate"`).
    - Your own seat is not clickable.
  - Result spacing:
    - Result list `space-y-2`, board grid `gap-4`, sections `space-y-6`.
    - Modal padding `p-5 sm:p-8`. Change it in `Modal` via a prop `padding?: 'normal' | 'roomy'`, or pass `className`. Keep the other modals unchanged.
- [ ] **Step 1: Failing tests (`PaperSafariTable.test.tsx` and the new modal test)**
  - Mobile (`setMediaMatches(false)`), DRAW, my turn: the instruction text is "덱이나 버린 카드에서 가져오세요". PC keeps the long text.
  - The instruction element has the `min-h-[3rem]` class in both layouts.
  - Mobile: `getByTestId('my-side')` contains the 버리기 button and "현재 예상 점수".
  - Clicking "밥님의 판 크게 보기" opens a dialog "밥님의 판" with "예상 점수". With opponent face-up cards 3 and 4 in the same column the estimate is 7, and it shows "가려진 4장".
  - The opponent estimate badge renders with the correct value.
- [ ] **Step 2: Confirm failure. Step 3: Implement. Step 4: Full tests + build.**
- [ ] **Step 5: Commit** `feat: 모바일 게임 화면 배치 개선, 상대 판 확대와 예상 점수, 안내 문구 고정, 결과 창 간격`

---

### Task 9: 실제 플레이 확인과 문서

- [ ] **Step 1:** Run `mvn -q -f backend/pom.xml test && npm --prefix frontend test && npm --prefix frontend run build`. Everything must pass.
- [ ] **Step 2:** Start `./start.sh` in the background. With Playwright, use three accounts in three separate cookie contexts: `localhost:5177`, `127.0.0.1:5177`, and a separate browser context on `localhost`. Check each of the following:
  1. Game list wording, the 규칙 보기 slides (buttons, keys), the new favicon (no console 404), and the icon mute button.
  2. Lobby: create a 3-person private room with password 1234. Second account: the list shows 🔒, 참가 asks for the password (wrong, then right).
  3. Start the game. Third account: the room appears under 게임 중인 방 as 비공개 and cannot be watched. Repeat with a public room → 관전하기 works, the spectator sees the table with "관전 중이에요", and no hidden card values (inspect the DOM: no `data-art` inside the face-down slots of others).
  4. Mobile 390×844: centered opponent rail, the 버리기/estimate column right of my board, the instruction area doesn't shift the layout between turns (compare the y-position of the deck before/after the turn change), and tapping an opponent board opens the zoom with the estimate.
  5. Round result and game-over spacing. Close game over → click 보드게임 라운지 → land on the list with the 돌아가기 bar. Go back to the room: the game-over modal does not reappear.
  6. Same account logged in on two contexts: the first context goes to login with "다른 곳에서 로그인해서 로그아웃됐어요." when its WebSocket is closed or on its next request.
  7. Lobby list refreshes within about 1 s when another account creates a room.

  Fix problems with focused commits (`fix: …`) and add tests where testable.
- [ ] **Step 3:** `./stop.sh`, then `docker compose up -d --build --wait`. Check `/` returns 200 and the login → `/api/games` flow works. Then `docker compose down` (never `-v`). If Docker Desktop is not running, start it and quit it afterwards.
- [ ] **Step 4:** Update the README `## 기능`: add 관전, 비공개방(비밀번호)·최대 인원 선택, 규칙 보기, 같은 아이디 중복 로그인 차단. Commit `docs: 라운지 개선 기능을 README에 반영`.
