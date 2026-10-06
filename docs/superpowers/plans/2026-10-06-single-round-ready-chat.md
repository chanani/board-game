# 단판 규칙·준비 시작·채팅·화면 다듬기 17건 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 사용자 요청 17건을 반영한다. 게임은 토큰 없이 한 라운드로 끝나는 단판으로 바꾸고, 방장 시작 전에 참가자가 준비하도록 하고, 게임이 끝나면 관전자를 자동으로 참가시킨다. 버린 카드 되돌리기와 방 채팅을 넣고, 대기실·로비·게임 화면·결과 화면·모달을 다듬는다.

**Architecture:**
- **백엔드:**
  - 엔진: `Tokens`와 라운드 사이 준비를 없애고, 라운드가 끝나면 곧 게임 종료로 처리한다. 버린 카드 더미에서 가져온 카드를 되돌리는 `CANCEL_DRAW` 액션을 추가한다.
  - 방: `RoomMembers`에 `ReadyMembers`를 더하고, 게임이 끝나면 관전자를 자동으로 참가시킨다.
  - 채팅: `chat` 패키지를 새로 둔다. `ChatRegistry`는 메모리에만 두고, 대화는 STOMP 토픽과 REST 기록 조회로 주고받는다.
- **프론트:**
  - 단판 결과 화면 하나로 정리하고, 준비 흐름이 들어간 대기실 A안을 만든다.
  - 채팅은 `useRoomChat`과 `ChatPanel`로 만들고, 게임 중에는 서랍(PC)과 하단 시트(모바일)로 연다.
  - 공통 `Modal`에 닫기 아이콘과 배경 클릭 닫힘을 넣는다.
  - 로비의 방 만들기는 모달로 바꾼다.
  - 모바일 게임 화면을 다듬는다.

**Tech Stack:** Java 21 / Spring Boot 3.5 / STOMP / JPA · React 19 / TS 5.9 / Tailwind 4 / motion 14 / Vitest 5

**Spec:** `docs/superpowers/specs/2026-10-06-single-round-ready-chat-design.md`

## Global Constraints

- 백엔드 Java는 `/Users/ichanhan/CLAUDE.md`의 객체지향 생활 체조를 따른다.
  - 메서드마다 들여쓰기는 1단계까지만 쓴다.
  - `else`를 쓰지 않는다.
  - 원시값은 VO로 감싼다.
  - 한 줄에 점은 하나만 쓴다. 스트림 체이닝은 예외로 한다.
  - 컬렉션은 일급 컬렉션으로 감싼다.
  - 필드는 3개 이하로 둔다.
  - 오류는 `BusinessException(ErrorCode)`로 던지고, 응답은 통일된 `{status, code, message}` 형식을 쓴다.
- 오류 코드와 메시지는 스펙 2.6의 표 그대로 쓴다.
- 숨김 정보 규칙은 그대로 지킨다. 뒷면 카드는 서버가 null로 보낸다. 되돌린 카드는 원래 공개 정보였던 버린 카드다.
- 새 런타임 의존성은 추가하지 않는다. 외부 이미지와 폰트도 쓰지 않는다.
- 사용자 문구는 한국어 해요체로 쓴다.
- 기존 테스트는 지우지 않는다. 다만 토큰, 라운드 사이 준비, ROUND_OVER처럼 **규칙 변경으로 의미가 사라진 테스트**는 새 규칙에 맞게 고치거나, 같은 동작을 검증하는 새 테스트로 바꾼다. 바꾼 테스트는 보고서에 목록으로 남긴다.
- 기준 테스트 수: 백엔드 335개, 프론트 240개.
- 커밋 메시지는 한국어 conventional 형식으로 쓰고, 끝에 빈 줄과 정확히 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`를 붙인다.
- PC 화면은 `(min-width: 1024px)`(`PC_QUERY`), 모바일 화면은 `TableRail`이다.
- 프론트가 STOMP 구독(방 토픽, 채팅 토픽)을 하는 시점은 REST로 참가나 관전을 마친 뒤로 제한한다.

## Review Focus

1. **동점 무승부:** 최저점이 동점이면 `winnerId`는 null이어야 하고, 전원이 DRAW로 기록돼야 한다. 결과 화면은 "무승부예요"를 보여줘야 한다. 테스트: Task 1, Task 4.
2. **되돌리기 악용:** 덱에서 뽑은 카드는 절대 되돌릴 수 없어야 하고, 되돌린 뒤에도 차례는 바뀌지 않아야 한다. 테스트: Task 1.
3. **준비 상태 꼬임:** 게임이 시작되거나 끝날 때, 그리고 사람이 나가거나 방장이 바뀔 때 준비 상태가 올바르게 초기화돼야 한다. 그렇지 않으면 준비 안 된 사람이 있는데도 시작되거나, 영원히 시작할 수 없게 된다. 테스트: Task 2.
4. **채팅 권한과 정리:** 외부인은 채팅을 구독할 수도, 기록을 조회할 수도 없어야 한다. 방이 사라지면 기록도 사라져야 하고, 너무 빠른 전송은 막혀야 한다. 테스트: Task 3.
5. **모바일 손 카드 위치 변경:** 손 카드 위치를 옮긴 뒤에도 카드가 날아가는 애니메이션의 기준 영역(`hand:<id>`)이 정확히 하나만 존재해야 한다. 테스트: Task 7.

---

### Task 1: 엔진 단판 규칙과 되돌리기 (#1, #14 백엔드)

**Files:**
- Modify: `backend/src/main/java/com/boardgame/papersafari/PaperSafariGame.java`, `PaperSafariSession.java`, `PaperSafariRound.java` (cancel), `GameStatus.java` (remove ROUND_OVER), `PaperSafariCommand.java` (if it maps action names), `view/PaperSafariView.java`, `view/PaperSafariSessionView.java`
- Delete: `Tokens.java`, `TokenCount.java` (and their tests) once unused
- Modify: `common/error/ErrorCode.java`: add `PLAYERS_NOT_READY`, `CANNOT_CANCEL_DRAW`, `INVALID_CHAT_MESSAGE`, `CHAT_TOO_FAST` with spec §2.6 values. `CHAT_TOO_FAST` uses `HttpStatus.TOO_MANY_REQUESTS`. Remove `ROUND_NOT_OVER` if it becomes unused.
- Tests: the `papersafari` engine/session tests (update), `StompGameFlowTest` (if it uses READY or tokens), and the record tests that depend on multi-round flows

**Interfaces:**
- Produces:
  - `GameStatus { IN_ROUND, GAME_OVER }`.
  - `PaperSafariGame.status()`: returns `GAME_OVER` when the round is over or only one seated player remains, otherwise `IN_ROUND`.
  - `PaperSafariGame.winner()` returns `Optional<PlayerId>`. On a round end it is the round result's sole winner, empty for a draw. On a forfeit it is the sole survivor.
  - `PaperSafariGame.cancelDraw(PlayerId)` delegates to the round.
  - `PaperSafariRound.cancelDraw(player)`:
    - `requireTurn(player)`
    - phase must be `PLACE`, otherwise `INVALID_PHASE`
    - the held card's source must be `DISCARD`, otherwise `CANNOT_CANCEL_DRAW`
    - pushes the held card back onto the discard pile and clears the held card
    - sets the phase to `DRAW`
  - `PaperSafariView(viewerId, status, roundNumber /* always 1 */, round, lastRoundResult, winnerId)`: the `tokens` field is removed.
  - `PaperSafariSessionView(game)`: `readyPlayerIds` is removed.
  - Actions accepted by the session: `FLIP, DRAW_DECK, DRAW_DISCARD, SWAP, DISCARD, PEEK, CANCEL_DRAW`. `READY` is no longer accepted and gives `INVALID_INPUT`, the same as any unknown action today. Check how unknown actions are handled and keep that behavior.
  - Session outcomes on a normal end: `RoundCompleted` (scores) **and** `GameCompleted` (WIN/LOSE, or all DRAW) in the same action. On a forfeit end: `GameCompleted` only.

- [ ] **Step 1: Write failing tests**
  - Engine:
    - After the final action that reveals all six cards, `status()` is `GAME_OVER`.
    - With a sole lowest score, `winner()` is that player.
    - With a tie for lowest, `winner()` is empty and the result lists every player as DRAW.
    - When everyone else forfeits, the last player left wins.
    - Any further action throws `GAME_ALREADY_OVER`.
  - `cancelDraw`:
    - After `drawFromDiscard`, `cancelDraw` restores the discard top to that card, sets the phase to `DRAW`, keeps the current player, and leaves no held card.
    - After `drawFromDeck` it throws `CANNOT_CANCEL_DRAW`.
    - It throws `NOT_YOUR_TURN` when it isn't the caller's turn.
    - It throws `INVALID_PHASE` in the `DRAW` phase.
  - Session:
    - A `CANCEL_DRAW` action is applied.
    - `READY` is rejected.
    - A normal end yields `RoundCompleted` + `GameCompleted`.
    - A tie end yields `GameCompleted` with every player DRAW.
    - `viewFor` JSON has no `tokens` or `readyPlayerIds`. Assert with Jackson serialization in the session or view test.
- [ ] **Step 2: Confirm the tests fail (RED). Step 3: Implement.** Remove `startNextRound` and the round-sequence "next" usage if they become unused. `RoundSequence` may collapse to a single round, so keep or simplify it as long as the CLAUDE.md rules hold.
- [ ] **Step 4:** Run the full backend suite and get it green. Fix the record and STOMP tests that assumed multi-round/READY flows, and list them in the report.
- [ ] **Step 5: Commit** `feat: 토큰을 없애고 한 라운드로 끝나는 단판 규칙, 버린 카드 되돌리기`

---

### Task 2: 준비 후 시작, 관전자 자동 참가 (#11, #5 백엔드)

**Files:**
- Create: `room/domain/ReadyMembers.java`
- Modify:
  - `room/domain/RoomMembers.java` (fields `members`, `ready`)
  - `room/domain/Room.java`
  - `room/domain/RoomOccupants.java`
  - `room/domain/Spectators.java` (ordered)
  - `room/application/RoomService.java` (`setReady`, start condition, auto-seat after game end in `act`/`forfeit`/`leave` paths)
  - `room/api/RoomController.java` (`POST /{code}/ready`)
  - `room/api/RoomResponse.java`
  - `room/api/RoomMemberResponse.java` (`ready`)
- Create: `room/api/ReadyRequest.java` (`Boolean ready`)
- Tests: `RoomTest`, `RoomApiTest` (or a new `RoomReadyApiTest`), and `RoomSpectatorApiTest` (auto-seat)

**Interfaces:**
- Produces:
  - `Room.setReady(long memberId, boolean ready)`:
    - The caller must be a player, otherwise `NOT_IN_ROOM`.
    - The room must be waiting, otherwise `ROOM_ALREADY_PLAYING`.
    - The host gets `INVALID_INPUT`.
  - `Room.start(...)`:
    - In addition to the existing checks, throw `PLAYERS_NOT_READY` unless every non-host player is ready.
    - On success, clear the ready set.
  - `Room.finishIfOver()`, or equivalent logic run after each `act`/`forfeit`/`leave` when the game has just finished:
    - Clear the ready set.
    - Move spectators into players, in join order, up to capacity. Each moved person starts not ready.
    - Return whether the room changed.
  - `RoomService` must save the registry and broadcast after the auto-seat.
  - The ready entry is removed when a member leaves. The ready set is cleared whenever the host changes (host leaves).
  - `RoomMemberResponse(id, nickname, host, connected, offlineSeconds, ready)`.
  - `POST /api/rooms/{code}/ready` body `{"ready": true}` returns `RoomResponse`. A null `ready` gives `INVALID_INPUT`.
- [ ] **Step 1: Failing tests**
  - Domain:
    - Starting with an unready guest gives `PLAYERS_NOT_READY`. Once the guest is ready, start succeeds and the ready set is cleared.
    - A host `setReady` gives `INVALID_INPUT`.
    - A spectator `setReady` gives `NOT_IN_ROOM`.
    - `setReady` while playing gives `ROOM_ALREADY_PLAYING`.
    - A player who leaves is removed from the ready set.
    - When the host leaves, the ready set is cleared.
    - After the game finishes (use `FakeGameSession`, finishing it via forfeit), spectators s1 and s2 join in order up to capacity, and the rest stay spectators.
  - API:
    - Ready toggles, and the room response shows `members[].ready`.
    - Start before ready gives 409 `PLAYERS_NOT_READY`.
    - A full real game ending (use the STOMP or service path, or force the end by forfeit through REST leave) auto-seats a spectator: after the end, `members` contains the spectator and `spectators` is empty.
- [ ] **Step 2: RED. Step 3: Implement. Step 4:** Run the full backend suite and get it green. Existing tests that start games must now set ready first; update their helpers.
- [ ] **Step 5: Commit** `feat: 참가자 준비 후 방장이 시작하고, 게임이 끝나면 관전자가 자동으로 참가`

---

### Task 3: 방 채팅 백엔드 (#2)

**Files:**
- Create package `backend/src/main/java/com/boardgame/chat/`:
  - `domain/ChatText.java`, `ChatAuthor.java`, `ChatMessage.java`, `ChatLog.java`, `ChatRateLimiter.java`
  - `application/ChatService.java`
  - `api/ChatController.java` (REST), `ChatMessageController.java` (STOMP), `ChatMessageResponse.java`, `ChatSendRequest.java`
  - `infra/ChatRegistry.java` (or `domain`)
- Modify: `common/websocket/RoomTopicGuard.java` (allow `/topic/rooms/{CODE}/chat`), `room/application/RoomService.java` or `RoomRegistry` (publish/notify room removal so chat logs are dropped: e.g. a `RoomClosedEvent` published when a room is removed, handled by `ChatService`)
- Tests: unit tests for `ChatText`, `ChatLog`, `ChatRateLimiter`; `ChatApiTest` (REST permissions/history); STOMP chat test (send/receive, outsider refused); test that a room removal clears its log

**Interfaces:**
- Produces:
  - `ChatText(String)`: stripped length 1–200, otherwise `INVALID_CHAT_MESSAGE`.
  - `ChatAuthor(long memberId, String nickname)`.
  - `ChatMessage(long id, ChatAuthor author, ChatText text, Instant sentAt)`: 4 components. Bundle them as `ChatMessage(long id, ChatAuthor author, ChatBody body)` with `ChatBody(ChatText text, Instant sentAt)` to keep 3 or fewer.
  - `ChatLog`: append, keeps the last 100, `List<ChatMessage> asList()` oldest first.
  - `ChatRateLimiter(Clock)`: `require(long memberId)` throws `CHAT_TOO_FAST` when the member has already sent 3 messages within the last 1 second.
  - `ChatService`:
    - `send(String code, long memberId, String text)` checks `roomService.isOccupant` (otherwise `NOT_IN_ROOM`) and the rate limit, appends to the log, and broadcasts to `/topic/rooms/{code}/chat`. The nickname comes from the room's occupant list, via a new `RoomService.nicknameOf(code, memberId)` that returns an `Optional`.
    - `history(code, memberId)` requires an occupant and returns the log.
    - `clear(code)`.
  - REST: `GET /api/rooms/{code}/chat` returns `[{id, memberId, nickname, text, sentAt}]`.
  - STOMP: `@MessageMapping("/rooms/{code}/chat")` takes `{text}`. Errors go to `/user/queue/errors` like other message handlers (check `GameMessageController`'s `@MessageExceptionHandler`).
  - `RoomTopicGuard` accepts exactly `^/topic/rooms/([A-Z0-9]{6})(/chat)?$` and drops anything else, as it does now.
- [ ] **Step 1: Failing tests**
  - `ChatText`: empty, 201 characters and whitespace-only are rejected; 200 characters is accepted.
  - `ChatLog`: after 101 appends it keeps the last 100.
  - `ChatRateLimiter`: the 4th message within 1 second throws, and it is OK after 1 second (fake clock).
  - API:
    - An occupant sends via STOMP and the other occupant receives it on the chat topic.
    - `GET /chat` returns the message.
    - An outsider's `GET` gives 403 `NOT_IN_ROOM`.
    - An outsider's subscription to `/topic/rooms/{code}/chat` gets no messages, and the session stays connected.
    - After all players leave and the room is gone, a new room with a new code has an empty history. The old code's log is removed; test this at the service level with `ChatService.history` after the close event.
- [ ] **Step 2: RED. Step 3: Implement. Step 4:** Full backend suite.
- [ ] **Step 5: Commit** `feat: 방 참가자·관전자 채팅(메모리 보관, 방이 사라지면 삭제)`

---

### Task 4: 프론트 단판 결과·규칙·전적, 되돌리기 버튼 (#1, #14, #15)

**Files:**
- Modify:
  - `frontend/src/api/types.ts`: drop `tokens` and `readyPlayerIds`; `GameStatus = 'IN_ROUND' | 'GAME_OVER'`; `TurnPhase` drops `ROUND_OVER` if the backend no longer sends it (verify in `TurnPhase.java`); add the `CANCEL_DRAW` action; `RoomMember.ready`
  - `games/papersafari/rules.ts`, `RulesCarousel.test.tsx`
  - `PaperSafariTable.tsx` (remove token props and the round chip; add the 되돌리기 button)
  - `PlayerBoard.tsx` (remove the token coins)
  - `layout/Hud.tsx`, `layout/Seat.tsx`, `layout/TableRound.tsx`, `layout/TableRail.tsx`, `layout/MySide.tsx`
  - `GameOverPanel.tsx`: single unified result with staged reveal → scores → winner or draw, plus a 다음 게임 준비 button and ready chips
  - `RoundResultModal.tsx`: delete it and fold its staged-reveal logic into the result panel, or keep the file as the result panel and delete `GameOverPanel`. Pick one and record the choice in the report. Keep the dismissal behavior.
  - `pages/RoomPage.tsx` (wire the result and ready)
  - `lib/eventLog.ts` (remove round/token lines)
  - `motion/inferMoves.ts` (`ROUND_OVER` → `GAME_OVER` guard)
  - `records/StatSummary.tsx` (remove the round rows), `records/RecentMatches.tsx` (remove tokens), `pages/RecordsPage.tsx`
  - `README.md` rule lines
  - `api/rooms.ts`: `ready(code, ready)`
- Create: `components/icons.tsx` additions: `UndoIcon`, `CloseIcon`, `DoorIcon`, `ChatIcon`
- Tests: update every test that builds views with `tokens`, `readyPlayerIds` or `ROUND_OVER`. New tests are listed below.

**Interfaces:**
- Produces:
  - The result panel (`GameResult` component; keep the export name used by `RoomPage`):
    - It is a `Modal` titled "게임 결과" with the staged reveal from the existing `RoundResultModal`.
    - After the reveal it shows `🏆 {name}님 승리!`, or `무승부예요` when `winnerId === null`.
    - Score rows are sorted ascending.
    - Footer, by viewer:
      - Seated non-host: a rounded primary button `다음 게임 준비`. It calls `onReady()`; RoomPage calls `roomsApi.ready(code, true)` and then dismisses.
      - Host and spectators: a `대기실로` button.
    - Ready chips list `room.members` minus the host: `rounded-full border-2 px-3 py-1`, with a green border and ✔ when `ready`, otherwise `border-cream-300`.
  - 되돌리기: when `myTurn && phase === 'PLACE' && held?.source === 'DISCARD'`, show the `UndoIcon` button, `aria-label="되돌리기"`, which sends `{type:'CANCEL_DRAW'}`. On mobile it sits in `MySide` above 버리기; on PC it sits next to 버리기 in the footer.
- [ ] **Step 1: Failing tests**
  - Rules: no slide or summary contains "토큰". The last slide contains "1승" and "무승부".
  - The result shows the winner's name and 승리; a tie shows "무승부예요".
  - A seated guest clicking 다음 게임 준비 calls `onReady`. The host sees 대기실로.
  - Ready chips render with the ✔ state.
  - The 되돌리기 button shows only for a DISCARD-sourced held card on my turn, and sends `CANCEL_DRAW`.
  - StatSummary has no 라운드 rows; RecordsPage still passes.
  - No token UI: no element with aria-label matching `/토큰/`.
- [ ] **Step 2: RED. Step 3: Implement. Step 4:** Run the full frontend tests and the build.
- [ ] **Step 5: Commit** `feat: 단판 결과 화면·규칙·전적 정리, 버린 카드 되돌리기 버튼, 결과의 다음 게임 준비`

---

### Task 5: 모달 공통 닫기와 로비 방 만들기 모달 (#6, #7, #8, #9, #13)

**Files:**
- Modify: `components/Modal.tsx` (+ test), `games/papersafari/RulesCarousel.tsx`, `OpponentBoardModal.tsx`, `room/PasswordModal.tsx`, `pages/GameLobbyPage.tsx` (+ test)
- Create: `room/CreateRoomModal.tsx` (+ test), `components/ToggleSwitch.tsx` (+ test)

**Interfaces:**
- Produces:
  - `Modal`: when `onClose` is given, render a top-right `CloseIcon` button (`aria-label="닫기"`). A click on the backdrop itself calls `onClose`; clicks inside the dialog box don't. Modals without `onClose` render no ✕ and ignore backdrop clicks.
  - `RulesCarousel`: remove its text 닫기 button and rely on the Modal ✕.
  - `OpponentBoardModal`: `mt-6` or more between the board and the 예상 점수 block.
  - `ToggleSwitch({ checked, onChange, label, icon? })`: a `button` with `role="switch"` and `aria-checked`; a pill track with a sliding knob (motion, or a CSS transform).
  - `CreateRoomModal({ open, defaultName, onClose, onCreate(name, maxPlayers, password?) })` contains the room name, the max players radiogroup, `ToggleSwitch` "비공개방" with `LockIcon`, a password field shown when on, and a 만들기 submit.
  - Lobby:
    - The always-visible create form is removed.
    - A "＋ 방 만들기" button sits in the 기다리는 방 header and opens `CreateRoomModal`.
    - A compact panel at the top holds the code input plus the 입장 button on one row (`flex` with the input `flex-1` and the button right next to it).
- [ ] **Step 1: Failing tests**
  - Modal: the ✕ calls `onClose`; a backdrop click calls `onClose`; an inner click doesn't; with no `onClose` there is no ✕ and a backdrop click does nothing.
  - ToggleSwitch: clicking toggles `aria-checked`.
  - CreateRoomModal: switching 비공개방 on shows the password field; submitting calls `onCreate('…', 3, '1234')`.
  - Lobby: clicking 방 만들기 opens the dialog; the code input and 입장 button share one row container (assert the same parent).
  - The existing lobby tests (create with options, private) are adapted to go through the modal.
- [ ] **Step 2: RED. Step 3: Implement. Step 4:** Full tests + build.
- [ ] **Step 5: Commit** `feat: 모달 닫기 아이콘·배경 클릭 닫기, 방 만들기 모달·비공개 토글·코드 입장 한 줄`

---

### Task 6: 대기실 A안과 준비 흐름, 채팅 UI (#10, #11, #2 프론트)

**Files:**
- Modify: `room/WaitingRoom.tsx` (+ test), `room/MemberList.tsx` (→ circular seats around the felt), `pages/RoomPage.tsx`, `api/rooms.ts` (ready)
- Create: `api/chat.ts`, `room/useRoomChat.ts` (+ test), `room/ChatPanel.tsx` (+ test), `room/ChatLauncher.tsx` (+ test)

**Interfaces:**
- Produces:
  - `chatApi.history(code): Promise<ChatMessage[]>`, with `type ChatMessage = {id:number; memberId:number; nickname:string; text:string; sentAt:string}`.
  - `useRoomChat(code, enabled): { messages, send(text): boolean, unread, markRead() }`:
    - Loads the history once when enabled, then subscribes to `/topic/rooms/${code}/chat` via `useRealtime().realtime.subscribe`.
    - `send` publishes to `/app/rooms/${code}/chat` with `{text}`; it returns false and toasts when disconnected.
    - Messages are deduped by id.
  - `ChatPanel({ messages, meId, onSend, className? })`:
    - A scrolling list; my messages are right-aligned with a mustard bubble; others show the nickname and a cream bubble.
    - Auto-scrolls to the bottom on a new message only when the user is already near the bottom.
    - The input has `maxLength=200`, sends on Enter, and blocks empty or whitespace-only text; there is a 보내기 button.
  - `ChatLauncher({ messages, meId, onSend, unread, onOpen })`, shown in the game view:
    - A floating `ChatIcon` button with an unread badge.
    - On PC it opens a right drawer (`fixed right-4 bottom-20 w-80 h-[60vh]`); on mobile it opens a bottom sheet (`fixed inset-x-0 bottom-0 h-[60vh]`).
    - It sits above the ActiveRoomBar and toasts (check z-index and offsets).
  - `WaitingRoom`, A design per spec §3.2:
    - Chairs are placed on the circle by seat index using a positions table for capacities 2–5.
    - Each chair shows a status chip: 👑 방장 / ✔ 준비 완료 / 준비 전.
    - The center button depends on the viewer:
      - Host: `게임 시작`, disabled with a reason line when the room is short of players or not everyone is ready.
      - Guest: `준비하기`/`준비 취소`, calling `onReady(!ready)`.
      - Spectator: the text "게임이 끝나면 자동으로 참가해요", plus `자리에 앉기` when the room is waiting and has space.
    - The code chip sits under the center button.
    - Side column: `ChatPanel` with a fixed height and internal scroll, then the rules summary.
    - Gaps: 24px between panels.
- [ ] **Step 1: Failing tests**
  - `useRoomChat`: loads the history, then appends a pushed message, dedupes the same id, and publishes on `send`.
  - `ChatPanel`: renders my and others' messages differently (data attribute); Enter sends; empty text is not sent; 200-character maxLength.
  - `ChatLauncher`: shows the unread badge; clicking opens a region with role="dialog" or `aria-label="채팅"`.
  - `WaitingRoom`:
    - Host with an unready guest: the start button is disabled and "모두 준비하면 시작할 수 있어요" is visible.
    - Guest clicking 준비하기 calls `onReady(true)`.
    - Chip texts render.
    - Spectator text renders.
    - The chat panel is present.
- [ ] **Step 2: RED. Step 3: Implement. Step 4:** Full tests + build.
- [ ] **Step 5: Commit** `feat: 대기실을 둘러앉는 테이블로 바꾸고 준비 흐름·방 채팅 추가`

---

### Task 7: 모바일 게임 화면과 나가기 확인 (#3, #4, #12, #16, #17)

**Files:**
- Modify: `games/papersafari/layout/TableRail.tsx`, `layout/Seat.tsx`, `layout/OpponentSeat.tsx`, `layout/MySide.tsx`, `PlayerBoard.tsx`, `pages/RoomPage.tsx` (leave confirm), tests
- Create: `room/LeaveConfirmModal.tsx` (+ test)

**Interfaces:**
- Produces:
  - Opponent `Seat` on mobile (`TableRail`): the hand `ZoneAnchor` is absolutely positioned (top-right of the board, overlapping, same size) instead of a flex sibling, so the seat's layout width equals the board width and centers. There is still exactly one `[data-zone="hand:<id>"]` per player.
  - Rail: `gap-[3px]` and reduced board padding on mobile.
  - My turn: `PlayerBoard` for me with `active` gets `ring-4 ring-mustard-400` plus a glow animation class (static ring under reduced motion). Test the class presence.
  - Mobile my hand: `TableRail` renders my `hand:<me>` `ZoneAnchor` inside `MySide`, between the 버리기 (and 되돌리기) buttons and the estimate. My `Seat` on mobile renders no hand anchor (prop `hideHand`). PC is unchanged.
  - `LeaveConfirmModal({ open, onCancel, onConfirm })`: a Modal with the title "정말 나갈까요?", a `DoorIcon`, and the buttons `취소` and `나가기`. It contains no "기권" text.
  - RoomPage: a seated player who clicks 나가기 during a game gets the modal. In the waiting room, and for spectators, leaving is immediate. Remove the old inline confirm-text button behavior.
- [ ] **Step 1: Failing tests**
  - Mobile 1:1: the opponent seat container has no flex sibling for the hand, and the hand anchor has the `absolute` class.
  - The rail has `gap-[3px]`.
  - On my turn my board has `ring-mustard-400`.
  - Mobile: `hand:<me>` is inside `my-side`, and `document.querySelectorAll('[data-zone="hand:1"]').length === 1`.
  - LeaveConfirmModal: 취소 calls `onCancel` and 나가기 calls `onConfirm`; the text has no "기권".
  - RoomPage: during a game, 나가기 opens the dialog and 취소 closes it without calling leave.
- [ ] **Step 2: RED. Step 3: Implement. Step 4:** Full tests + build.
- [ ] **Step 5: Commit** `feat: 모바일 상대 판 가운데·간격 3px, 내 차례 테두리, 모바일 손 카드 위치, 나가기 확인 창`

---

### Task 8: 실제 플레이 확인과 문서

- [ ] **Step 1:** Run all suites and the build; everything must pass.
- [ ] **Step 2:** Start `./start.sh` and use Playwright with two accounts (`localhost:5177` and `127.0.0.1:5177`), plus a spectator. The spectator can be a third context, or driven via curl for REST plus a browser where possible. Check each of the 17 requests:
  - In the lobby: the create modal, the private toggle, and the code row.
  - In the waiting room (A design): ready → start (verify the start button is disabled until the guest is ready). Chat both ways, in the waiting room and in-game (drawer/sheet).
  - A single-round game to the end: the result with a winner or a draw, staged reveal, and the 다음 게임 준비 chips.
  - The spectator auto-joins after the game.
  - 되돌리기 after drawing from discard. The deck draw shows no undo.
  - My-turn ring.
  - Mobile 390×844: 1:1 opponent centered, 3px gaps, my hand card between 버리기 and the estimate.
  - Leave confirm with 취소.
  - Modal ✕ and backdrop close: rules and opponent zoom.
  - Console has no errors.

  Fix any problems with focused `fix:` commits and add tests where they are testable.
- [ ] **Step 3:** Run `./stop.sh`. Then `docker compose up -d --build --wait`, smoke test (`/` returns 200, login, `/api/games`), and `docker compose down` (never `-v`). Start and quit Docker Desktop only if it wasn't running.
- [ ] **Step 4:** Update the README `## 기능` with the single-round rule, ready → start, chat and undo. Commit `docs: 단판 규칙·준비·채팅을 README에 반영`.
