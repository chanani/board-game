# 방 테마·턴 타이머·와일드 점수·화면 재구성 17건 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 이번 작업에서 반영할 내용은 다음과 같다.
- 와일드 점수를 공식 규칙대로 고친다.
- 서버가 시간을 재는 15초 턴 타이머를 만들고, 시간이 넘으면 자동으로 행동한다.
- 방 테마 5종을 추가한다.
- 대기실과 게임 화면을 재구성한다.
- 이모지를 걷어 내고 SVG 아이콘으로 바꾼다.
- 그 밖의 화면 다듬기 항목을 반영한다.

**Spec:** `docs/superpowers/specs/2026-10-06-themes-timer-scoring-design.md`
시안 HTML: `.superpowers/brainstorm/38783-1791266346/content/themes-and-rooms.html`, `themes-extra.html`

## Global Constraints

- 이모지는 쓰지 않는다. 아이콘은 인라인 SVG(`currentColor`, `aria-hidden`)만 쓴다.
- 백엔드 Java는 `/Users/ichanhan/CLAUDE.md`의 객체지향 생활 체조를 따른다.
  - 들여쓰기는 메서드당 1단계까지만 둔다.
  - `else`를 쓰지 않는다.
  - 원시값은 VO로 감싼다.
  - 한 줄에 점은 하나만 찍는다. 스트림 체이닝은 예외로 한다.
  - 컬렉션은 일급 컬렉션으로 감싼다.
  - 필드는 3개 이하로 둔다.
  - 오류는 `BusinessException(ErrorCode)`로 던진다.
- 숨김 정보는 지금처럼 유지한다. 새 의존성은 추가하지 않는다. 사용자 문구는 한국어 해요체로 쓴다. 기존 테스트는 지우지 않는다.
  - 예외: 규칙이 바뀌어서 의미가 사라진 단언(와일드가 있으면 0점)은 새 규칙에 맞게 고친다. 고친 단언은 보고서에 목록으로 남긴다.
- 커밋 메시지는 한국어 conventional 형식으로 쓴다. 끝에 빈 줄을 두고 `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`를 정확히 붙인다.
- 기준 테스트 수: 백엔드 372개, 프론트 344개.

## Review Focus

1. **점수:** 백엔드와 프론트의 점수가 같아야 한다. 같은 판이면 결과 화면 합계와 서버 점수가 일치해야 한다.
2. **타이머 경쟁:** 자동 행동이 실행되는 순간에 사람이 행동해도 두 번 행동하면 안 된다(상태 버전으로 확인한다). 게임이 끝났거나 방이 사라진 뒤에는 예약된 작업이 남으면 안 된다.
3. **숨김 정보:** 자동 행동과 무작위 선택이 다른 사람에게 카드 정보를 새어 나가게 하면 안 된다.
4. **테마:** 테마 변수가 방 밖 화면으로 새면 안 된다. 테마를 바꿔도 대비(글자 가독성)가 유지돼야 한다.

---

### Task 1: 와일드 점수 공식 규칙 (백엔드)
- **Files:**
  - Create `papersafari/BoardScore.java`. Use small VOs as needed.
  - Modify `RoundResult` and every place that uses `ColumnScore`.
  - Replace or retire `ColumnScore`.
  - Tests: `BoardScoreTest`; update the existing round/result tests whose expectations depended on "wild column = 0".
- **Behavior:**
  - Follow spec §1.
  - For every wild, try copying its left neighbor and its right neighbor (only neighbors that exist, in the same row). A neighbor that is itself a wild resolves to whatever that wild chose.
  - Pick the assignment with the lowest total.
  - A wild with no non-wild source resolves to 0.
  - Score each column: equal values → 0, otherwise the sum.
  - Expose `BoardScore.of(board)` returning the total and the per-column scores, for tests and views.
- **Tests (each case below):**
  - [-2, W, W] in the top row, with a bottom row that doesn't match, gives the expected total.
  - A wild between 5 and 9 picks 5.
  - A wild at the edge copies its only neighbor.
  - A row of three wilds gives 0.
  - A pair of foxes gives 0.
  - Elephant with Tarzan gives 0.
  - No wilds behaves the same as before.
  - A wild whose copied value makes a match with its column partner gives that column 0, when that is the minimum.
- **Commit:** `fix: 와일드 카드를 공식 규칙(같은 줄 왼쪽·오른쪽 카드 복사, 가장 유리하게)으로 계산`

### Task 2: 15초 턴 타이머 (백엔드)
- **Files:**
  - Create `room/application/TurnTimer.java`. It schedules per room, cancels, and holds a version.
  - Add a `TaskScheduler` bean config.
  - Modify `PaperSafariSession` / `PaperSafariGame`, adding:
    - `autoAct(Random)`: performs the timeout action for the current waiting step, or for every player who hasn't flipped yet in SETUP_FLIP.
    - `awaitingSince` / `deadline` exposure.
  - Add `GameSession.autoAct(...)` and `GameSession.deadline()`.
  - Modify `RoomService`. After every state change (start, act, leave/forfeit, auto action), re-arm the timer with a new version. The scheduled task takes the global lock, checks the version, calls `room.autoAct`, then saves, broadcasts and publishes outcomes. Cancel the timer when the game finishes or the room closes.
  - Modify the view: `PaperSafariView` gets `deadline` (Long, nullable) and `serverNow`.
  - Event log support: the auto action is visible to clients as a normal state change. Also add `lastAutoActorId` (nullable) to the view so the frontend can write the "시간이 지나 ○○님 대신" log line.
  - Inject `Random` and `Clock` so tests are deterministic.
- **Behavior:** spec §2.
- **Tests:**
  - Engine `autoAct` covers each step: SETUP_FLIP flips a random face-down card for each player who hasn't flipped; DRAW takes the discard top and swaps it into a random slot, or draws from the deck when the discard pile is empty; PLACE swaps the held card into a random slot; PEEK peeks a random face-down card, or skips when there is none.
  - The deadline is 15s after the last change.
  - Service test with a fake scheduler: a timeout auto-acts and broadcasts.
  - A human action before the timeout invalidates the old task (version check).
  - The timer is cancelled when the game finishes or the room closes.
  - Views contain `deadline` while waiting for an action, and null after the game is over.
- **Commit:** `feat: 서버가 재는 15초 턴 타이머와 시간 초과 자동 행동`

### Task 3: 방 테마·채팅 관전자 표시 (백엔드)
- **Files:**
  - Create `room/domain/RoomTheme.java`, an enum with WOOD, SUNSET, MOONLIT, AURORA, BLOSSOM.
  - Room settings must stay at 3 fields or fewer: either regroup `RoomSettings`, or add the theme to `RoomProfile` through a new grouping. Record which one you chose in the report.
  - `CreateRoomRequest.theme`: null → WOOD; an unknown value → `INVALID_THEME` 400.
  - `RoomResponse.theme` and `RoomSummaryResponse.theme`.
  - Chat payload `spectator: boolean` (on both the live message and the history entry).
  - ErrorCode: `INVALID_THEME` 400 "지원하지 않는 테마예요."
- **Tests:**
  - Create with each theme and with the default.
  - Unknown theme returns 400.
  - The list and room responses include the theme.
  - A chat message from a spectator has `spectator=true`; a player's has false.
- **Commit:** `feat: 방 테마 선택과 채팅 관전자 표시 정보`

### Task 4: 프론트 테마 5종과 방 만들기 테마 선택, 비공개 토글 애니메이션 (#1, #3)
- **Files:**
  - `index.css`: per-theme CSS variables under `[data-theme="..."]`.
  - `Felt`, `CardBack`, the accent button, the room status bar and the room page background all use the variables.
  - `RoomPage` sets `data-theme` on the room root. Nothing outside the room is affected.
  - `CreateRoomModal` gets a theme picker: 5 preview tiles, `role="radiogroup"`, default WOOD.
  - The lobby room list shows a theme color dot plus the theme name.
  - `api/types` gets `RoomTheme`.
  - Private toggle: the password field opens and closes with height and opacity animation.
- **Tests:**
  - The room root has `data-theme`.
  - The picker sends `theme`.
  - The lobby shows the theme.
  - The toggle's open content is animated (use AnimatePresence, and assert its presence/absence with `waitFor`).
  - The theme variables don't leak outside the room (Layout has no `data-theme`).
- **Commit:** `feat: 방 테마 5종(원목·노을·달빛·오로라·벚꽃)과 테마 선택, 비공개 칸 펼침 애니메이션`

### Task 5: 방 화면 재구성과 타이머 표시 (#2, #4, #8, #11, #13, #14, #15, #6 프론트)
- **Files:** `RoomPage`, `WaitingRoom`, `MemberList`, `Hud`, `TableRound`, `TableRail`, `CenterPiles`, `Layout` (mobile header), and a new `components/RoomStatusBar.tsx`, `room/WaitingActionBar.tsx`, `games/papersafari/layout/TurnBar.tsx`, `components/Countdown.tsx`.
- **Behavior:** spec §4.
  - Status bar.
  - Waiting room: only the seats sit on the table; the action bar sits under the table.
  - Game: a turn bar with the countdown and the latest log line, spaced 16px or more from the table. Piles-to-my-board gap is 32px or more on PC.
  - Mobile turn bar: `text-xs`, one line, truncated.
  - Countdown: computed from `deadline - serverNow` adjusted by local elapsed time. Shown only when 5 seconds or less remain, as a number plus a shrinking ring. Plays a warning sound once at 5 seconds when it's my turn. Stops at 0.
  - The log popover animates in and out.
  - Mobile header (#8): logo mark only, icon nav, nickname truncated, icon logout. No overflow at 360px.
- **Tests:**
  - Waiting room: the start/ready buttons are outside the felt (inside the action bar), and the code chip is in the status bar.
  - Countdown: hidden above 5s, visible at 5s and below, and the number decreases with fake timers.
  - The turn bar is on mobile and has `truncate`.
  - The header at mobile width has no text nav labels hidden by overflow (class assertions).
  - The popover is animated.
- **Commit:** `feat: 방 상태 바·대기실 행동 바·차례 안내 바로 화면 재구성, 타이머 표시, 모바일 헤더 정리`

### Task 6: 점수 해석 프론트·결과 배지, 아이콘 정리, 채팅 관전 배지, 규칙 슬라이드, 덱 커서 (#5, #7, #9, #10, #12, #16, #17)
- **Files:**
  - `score.ts`: the same algorithm as Task 1 (`resolveBoard`, per-column scores, total), with tests mirroring the backend cases.
  - `estimateBoard` uses it. Hidden slots are excluded as wild sources.
  - Result column badges: bigger gap, plus a small "와일드 → n" note.
  - Deck button: cursor and hover when drawable.
  - `CardFace` peek marker: an SVG peek icon.
  - Chat spectator badge.
  - `RulesCarousel` layout: page counter above the dots at the bottom center, smaller prev/next buttons, responsive title and body sizes.
  - Emoji sweep: replace every emoji in `frontend/src` (UI and log kinds) with SVG icons from `components/icons.tsx`.
    - Include LoginPage 🌿 → LogoMark, 🏆 in the log, and 👑 in result tags.
    - Add a test that scans the rendered text of key screens for emoji (regex `\p{Extended_Pictographic}`), or a source grep test.
- **Tests:**
  - Score cases match the backend.
  - The result shows the wild note.
  - The deck has `cursor-pointer` when drawable.
  - The peek icon is an svg and there is no 👁 text.
  - The chat "관전" badge renders for spectator messages.
  - Carousel order: counter, then dots.
  - No-emoji test.
- **Commit:** `feat: 와일드 점수 화면 반영·결과 배지 간격, 이모지를 아이콘으로 교체, 채팅 관전 배지, 규칙 슬라이드 정리, 덱 커서`

### Task 7: 실제 화면 확인 (30분 제한)
- Use Playwright on PC 1280×800 and mobile 390×844.
- Check:
  - All 5 themes.
  - The timer: let it run out once in DRAW, then confirm the auto swap and the log line.
  - The wild score shown in the result.
  - The waiting/game layout.
  - That no emoji is visible.
- Every 10 minutes, write progress to the report file. Stop at 30 minutes and report whatever is left.
- Make fixes as focused `fix:` commits.
