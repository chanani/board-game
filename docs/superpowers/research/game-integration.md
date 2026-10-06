# Game integration architecture: how Paper Safari plugs in, and what UNO needs

Research date: 2026-10-07, branch `feature/uno` (head `a1b1d34`). Read-only analysis; no code changed.

Paths below are relative to the repo root (`/Users/ichanhan/Desktop/projectfile/board-game`).
Backend Java root: `backend/src/main/java/com/boardgame/` (abbreviated `B/`). Frontend root: `frontend/src/` (abbreviated `F/`).

---

## 0. TL;DR

- **The backend is mostly generic already.** Rooms, the turn timer, presence/auto-forfeit, chat, STOMP routing, the outcome events and records all talk only to `GameSession` / `GameType` / `GameOutcome`. To add a game you:
  1. add an enum constant to `GameType`,
  2. write a `GameSession` + `@Component GameSessionFactory`,
  3. emit `RoundCompleted` / `GameCompleted` outcomes.
  The only non-generic backend spots are a few error messages and `GameAction` (it only carries `column`/`row`).
- **The frontend is not generic.** `RoomPage` renders `PaperSafariTable` with no condition. `useRoomChannel`, `eventLog.describeChanges`, `useGameOverDismissal`/`dismissals` and the `RoomPage` game-over logic are all typed to `PaperSafariView`. `WaitingRoom`, `GameShelfPage`, `GameLobbyPage`, `RecordsPage`, `GameBox`, `SeatPicker` and `CreateRoomModal` hard-code Paper Safari content or its 2..5 player range. You need a small per-game registry seam (section 6).

---

## 1. Backend: the game abstraction

### 1.1 Core types (package `com.boardgame.game`, `B/game/`)

| Type | Signature / shape | Notes |
|---|---|---|
| `GameType` (enum) | `PAPER_SAFARI("페이퍼 사파리", 2, 5)`. Methods: `displayName()`, `minPlayers()`, `maxPlayers()` | The **only** place in `src/main` outside `papersafari/` that names Paper Safari. It is persisted as a string (`@Enumerated(STRING)`, `VARCHAR(30)`) in `game_match.game_type` and `member_game_stat.game_type`. |
| `GameSession` (interface) | `List<GameOutcome> act(long memberId, GameAction action)`<br>`List<GameOutcome> forfeit(long memberId)`<br>`List<GameOutcome> autoAct(Random random)`: timeout, "do the awaited action on their behalf"<br>`Optional<Instant> deadline()`: empty when the game is finished<br>`Object viewFor(long memberId)`<br>`boolean isFinished()`<br>`boolean isPlaying(long memberId)`<br>`int roundNumber()` | One instance per started game, held in memory by `RoomGame`. All calls happen under `RoomService`'s global `synchronized` lock, so the session needs no thread safety of its own. |
| `GameSessionFactory` | `GameType type(); GameSession create(List<Long> memberIds);` | Spring `@Component`. |
| `GameSessionFactories` (`@Component`) | ctor `(List<GameSessionFactory>)` builds an `EnumMap<GameType, GameSessionFactory>`. `create(GameType, List<Long>)` throws `IllegalStateException("등록되지 않은 게임입니다")` if no factory is registered. | Auto-discovery: registering a new `@Component` factory is enough. |
| `GameAction` (record) | `record GameAction(String type, Integer column, Integer row)` | **Paper Safari–shaped.** UNO needs something like a card id and a chosen colour (section 7). |
| `GameOutcome` | `sealed interface GameOutcome permits RoundCompleted, GameCompleted` | |
| `RoundCompleted` | `record RoundCompleted(int roundNumber, List<RoundEntry> entries)` | |
| `RoundEntry` | `record RoundEntry(long memberId, ResultType result, int score)` | |
| `GameCompleted` | `record GameCompleted(List<MatchEntry> entries)` | |
| `MatchEntry` | `record MatchEntry(long memberId, ResultType result, int tokens, int seat)` | `tokens` is legacy: Paper Safari always writes `0` (`PaperSafariSession.NO_TOKENS`). `seat` is the index into the `memberIds` passed to `create`. |
| `ResultType` | `WIN, DRAW, LOSE` | |
| Events (`B/game/event/`) | `GameStartedEvent(String matchKey, GameType gameType, List<Long> memberIds, Instant startedAt)`<br>`RoundCompletedEvent(String matchKey, GameType gameType, RoundCompleted round)`<br>`GameCompletedEvent(String matchKey, GameType gameType, Instant startedAt, Instant endedAt, GameCompleted result)` | Published by `RoomService.start` (started) and `OutcomePublisher` (round/game). |

### 1.2 How actions arrive (STOMP)

- `B/room/api/GameMessageController.java`
  - `@MessageMapping("/rooms/{code}/actions") act(@DestinationVariable code, @Payload GameAction action, Principal)` calls `roomService.act(code, LoginMember.idOf(principal), action)`.
  - `@MessageMapping("/rooms/{code}/sync")` calls `roomService.sync(...)`, which re-sends the caller's view.
  - Errors: `BusinessException`, `MessageConversionException` (becomes `INVALID_INPUT`) and any other `Exception` (becomes `INTERNAL_ERROR`) are all sent with `@SendToUser("/queue/errors", broadcast=false)` as an `ErrorResponse`.
- Client SEND destination: `/app/rooms/{code}/actions` with JSON `{ "type": "...", "column": n, "row": n }`.
- Spring Boot's ObjectMapper ignores unknown JSON properties, so extra UNO fields would be **silently dropped**. You must add them to `GameAction` (or a replacement).
- `B/common/websocket/WebSocketConfig.java` sets up the simple broker on `/topic` and `/queue`, the app prefix `/app`, and the user prefix `/user`.
  - `InboundDestinationGuard` blocks SEND to `/topic`, `/queue` and `/user`, and SUBSCRIBE to `/queue*`.
  - `RoomTopicGuard` restricts `/topic/rooms/{code}` to the room's occupants.
  - None of this is game-specific.
- Paper Safari dispatch: `B/papersafari/PaperSafariCommand.java` is an enum of `FLIP, DRAW_DECK, DRAW_DISCARD, CANCEL_DRAW, SWAP, DISCARD, PEEK`, each with `apply(game, player, action)`.
  - `of(type)` throws `INVALID_INPUT` for an unknown type.
  - `positionOf(action)` requires non-null `column` and `row`.

### 1.3 Views and hidden information

- The output path:
  1. `RoomService.broadcast(room)` sends `notifier.roomUpdated(RoomResponse)` to `/topic/rooms/{code}`.
  2. Then, for **every occupant** (`room.occupantIds()`: players and spectators), `sendView` calls `room.viewFor(memberId)`, which calls `notifier.gameUpdated(memberId, view)`.
  3. `StompRoomNotifier` delivers that with `convertAndSendToUser(memberId, "/queue/game", view)`.
- The view is typed `Object`. Jackson serialises the **runtime class**, and there is no type discriminator.
- `Room.viewFor` returns empty only when `game == null`. After a game ends, the finished session stays in `Room.game` until the next `start`, so its last view keeps being served (including to people who joined after the game ended).
- Paper Safari view tree (`B/papersafari/view/`):
  - `PaperSafariSessionView(PaperSafariView game)` serialises to `{ "game": {...} }`.
  - `PaperSafariView(long viewerId, GameStatus status, int roundNumber, RoundView round, RoundResultView lastRoundResult, Long winnerId, Long deadline, long serverNow, Long lastAutoActorId, List<Long> lastAutoActorIds, long autoActSeq)`
  - `RoundView(TurnPhase phase, long currentPlayerId, int deckSize, CardView discardTop, HeldView held, List<BoardView> boards)`
  - `BoardView(long playerId, List<SlotView> slots)`
  - `SlotView(int column, int row, boolean faceUp, boolean known, CardView card)`
  - `HeldView(long playerId, DrawSource source, CardView card)`
  - `CardView(CardKind kind, int value)`
  - `RoundResultView(List<PlayerResultView> players)`, with `PlayerResultView(long playerId, int score, RoundOutcome outcome)`
- Hidden information is enforced server-side when the view is built:
  - `SlotView.of(position, slot, knownByViewer)` sets `card` only if the slot is face up or known to this viewer.
  - `HeldView.of(holder, drawn, visible)` sets `card` only for the holder (`current.equals(viewer)` in `Turn.heldViewFor`).
  - Spectators and non-seated viewers get the public view.
  - `viewFor` does not check seating, so any `memberId` gets a valid public view.
- `PaperSafariSession.viewFor(memberId)` returns `new PaperSafariSessionView(game.viewFor(new PlayerId(memberId), countdown.timing(!isFinished())))`.

### 1.4 Outcomes, results, forfeit

- `PaperSafariSession.act/forfeit/autoAct` each:
  1. capture `TurnStage before`,
  2. run the action,
  3. call `changed(before)`, which calls `countdown.follow(before, TurnStage.of(game))` and then `outcomesIfFinished()`.
- `outcomesIfFinished()`: if the game is now `GAME_OVER`, it returns `[RoundCompleted?, GameCompleted]`. `RoundCompleted` is added only when a round actually finished (`game.lastRoundResult()`), so a forfeit ending gives only `GameCompleted`. Because actions are rejected after `GAME_OVER` (`GAME_ALREADY_OVER`), "finished right after this action" means "finished by this action". This is how the session avoids double-emitting.
- Result mapping:
  - `RoundEntry(memberId, ResultType.valueOf(outcome.name()), score)`.
  - `MatchEntry(memberId, result, 0 /*tokens*/, seatIndex)`, iterating over **all original participants** (including forfeiters, who become `LOSE` via `PaperSafariGame.drawUnlessForfeited`).
- Forfeit path: `Room.leave(memberId)` calls `forfeitIfPlaying`, which calls `game.forfeit(memberId)` **only if** `session.isPlaying(memberId)`. Then the player is removed from occupants, and `settleIfJustFinished` clears ready flags and auto-seats waiting spectators. So `isPlaying` must return `false` for already-forfeited players and after the game is over.
- Room-level forfeit triggers (all generic):
  - leave: `POST /api/rooms/{code}/leave`
  - logout: `LogoutRoomListener` calls `leaveCurrentRoom`
  - host-requested forfeit of a disconnected member: `POST /{code}/members/{id}/forfeit`, which requires `presence.isOfflineAtLeast(target, now, 60s)`
  - periodic auto-forfeit: `DisconnectForfeitScheduler` runs every 5 s and calls `RoomService.forfeitLongDisconnected()`, which forfeits each `room::isPlaying` member offline for 60 s or more
- `OutcomePublisher.publish(room, outcomes, now)` maps each outcome with a sealed `switch` (`RoundCompleted` → `RoundCompletedEvent`, `GameCompleted` → `GameCompletedEvent`) using `room.currentGame().matchKey()` / `startedAt()` and `room.gameType()`. Generic.

### 1.5 Timeouts, deadlines, auto actions

- **Generic (room layer, `B/room/application/`):**
  - `TurnTimer.arm(RoomCode, Instant deadline, Consumer<TimerVersion>)`, `cancel(code)`, `isCurrent(code, version)`. There is one scheduled task per room, and versioning (`ArmedTimers`, `TimerVersion`) guards against stale firings.
  - `TurnTimerConfig` provides a `ThreadPoolTaskScheduler` bean (`turnTimerScheduler`, using the injected `Clock`) and a `Random` bean (`turnTimerRandom`). With property `app.turn-timer.real-scheduler=false`, tests swap in `FakeTaskScheduler`.
  - `RoomService.rearm(room)` runs after **every** state change (act, leave, start, timeout, forfeit): `room.deadline()` (which is `session.deadline()` while PLAYING) is either armed or cancelled.
  - `RoomService.timeout(code, version)` runs under the lock, checks `turnTimer.isCurrent`, then calls `applyTimeout`: `room.autoAct(random)`, then baseline newcomers, save, rearm, broadcast, publish outcomes.
  - If `autoAct` throws, `retryTimeout` re-arms for `now + 15s` (`TIMEOUT_RETRY`).
  - The room layer knows nothing about phases. The session owns *when* the deadline is and *what* the auto action does.
- **Paper Safari–specific (but reusable pattern), `B/papersafari/`:**
  - `TurnCountdown`: `LIMIT = 15s`; `restart()`, `follow(TurnStage before, TurnStage now)`, `deadline()`, `timing(boolean waiting) → TurnTiming`. It also has special rules: a cancel-draw keeps the deadline, a re-draw after a cancel keeps it (`CancelMark`), and another player's forfeit keeps it.
  - `TurnStage(RoundNumber round, PlayerId player, TurnPhase phase)`: `sameTurnAs`, `cancelsDrawFrom`, `holdsStageOf`. This is tied to Paper Safari's `TurnPhase`.
  - `TurnTiming(Long deadline, long serverNow)`: values in epoch ms, put into the view so the client can correct for clock skew.
  - `AutoActors`: remembers which players were auto-acted for, plus a `sequence` counter that increases only on auto actions. `PaperSafariGame.humanAction(...)` clears it on any successful human action. It surfaces as `lastAutoActorId`, `lastAutoActorIds` and `autoActSeq` in the view; the client logs "시간이 지나 X님 대신 ..." only when `autoActSeq` increases.
  - `PaperSafariRound.autoAct(Random)` returns `List<PlayerId>`. During `SETUP_FLIP` it flips a random card for every player who hasn't flipped yet, so it can return several players.
- `TurnCountdown`, `TurnTiming` and `AutoActors` are game-agnostic in logic. Only `TurnStage` / `CancelMark` depend on Paper Safari types. **Recommended seam:** move `TurnCountdown`/`TurnTiming`/`AutoActors` to `com.boardgame.game.timing` (generic over a stage key), or copy them into `uno/`.

### 1.6 How `RoomService` calls the session (`B/room/application/RoomService.java`)

| RoomService method | Room/RoomGame call | Session method |
|---|---|---|
| `start(code, memberId)` | `room.start(memberId, ids -> sessionFactories.create(room.gameType(), ids), UUID matchKey, now)` | factory `create(memberIds)`. `Room.start` checks host, WAITING, `playerCount >= gameType().minPlayers()` and everyone ready. |
| `act(code, memberId, action)` | `room.act` → `game.act` | `act` |
| `timeout` / `applyTimeout` | `room.autoAct(random)` | `autoAct` |
| `rearm`, `waitingDeadline` | `room.deadline()` | `deadline` |
| `leave`, `forfeitDisconnected`, `forfeitLongDisconnected` | `room.leave` → `forfeitIfPlaying` | `isPlaying`, `forfeit` |
| `broadcast`, `sync` | `room.viewFor(id)` | `viewFor` |
| `Room.status()` | `game.isFinished()` | `isFinished`. WAITING when there is no game or the game is finished. |
| `rooms(gameType)` → `RoomSummaryResponse.from` | `room.roundNumber()` | `roundNumber` (only while PLAYING) |

After each mutation, `RoomService` always runs the same sequence: `baselineNewcomers` → `saveAndNotifyClosed` → `rearm` → `broadcast` → `outcomePublisher.publish`. Events are published **after** the broadcast, inside the global lock.

### 1.7 Every place that assumes Paper Safari (backend `src/main`)

1. `B/game/GameType.java`: the single enum constant `PAPER_SAFARI`.
2. `B/game/GameAction.java`: the `(type, column, row)` shape.
3. `B/papersafari/PaperSafariSessionFactory.java`: `type()` returns `GameType.PAPER_SAFARI`.
4. `B/common/error/ErrorCode.java`:
   - `INVALID_CAPACITY` says "최대 인원은 2~5명 중에서 골라 주세요." (hard-coded range, although `Capacity.of(type, n)` itself is generic);
   - `INVALID_PLAYER_COUNT` says "페이퍼 사파리는 2~5명...";
   - several Paper Safari game codes (`MUST_SWAP_TARZAN`, `EMPTY_DISCARD_PILE`, ...) share the same global enum. UNO codes go there too.
5. `MatchEntry.tokens` / `match_participant.tokens` / `MatchPlayerResponse.tokens` / `RecentMatchResponse.tokens` are leftovers from Paper Safari's old token rule.

Everything else is generic: `Room`, `RoomGame`, `Capacity` (uses `GameType.min/maxPlayers`), `GameOccupancies` (iterates `GameType.values()`), `RoomResponse`/`RoomSummaryResponse` (carry `gameType` + `gameTypeName`), `OutcomePublisher`, `TurnTimer`, `PresenceTracker`, `DisconnectForfeitScheduler`, chat, and records.

---

## 2. Records and stats (`B/record/`)

- `RecordEventListener` has synchronous `@EventListener`s, each wrapped in `safely(...)` (catch and log). A records failure never breaks gameplay (`RecordFailureIsolationTest`).
- `RecordService` (each method runs `@Transactional(REQUIRES_NEW)`):
  - `recordStart(GameStartedEvent)`: idempotent on `matchKey`. It saves `GameMatch.start(matchKey, gameType, startedAt)`, then calls `MatchParticipant.join(match, memberId, seat)` for each distinct member. `seat` is the index in `event.memberIds()` (= `room.memberIds()` order = order passed to the factory).
  - `recordRound(RoundCompletedEvent)`: ignored if the match is unknown, and idempotent on `(match, roundNumber)`. It saves `MatchRound.of(match, roundNumber, now)`, then for each `RoundEntry` saves `RoundParticipant.of(round, memberId, result, score)` and calls `MemberGameStat.recordRound(result, score)`.
  - `recordCompletion(GameCompletedEvent)`: if no start record exists, it creates the match from the completion entries (`entry.seat()`). Skipped if the match is already finished. Otherwise it calls `match.finish(endedAt)` and, per `MatchEntry`, `participant.finish(result, tokens)` + `MemberGameStat.recordMatch(result)`.
- Entities and table columns (`sql/schema.sql` mirrors them):

| Entity | Table | Columns |
|---|---|---|
| `GameMatch` | `game_match` | `id`, `match_key` (uniq, 36), `game_type` VARCHAR(30), `started_at`, `ended_at` (via `MatchPeriod`) |
| `MatchParticipant` | `match_participant` | `match_id`, `member_id`, `seat` (`ParticipantSeat`), `result`, `tokens` NOT NULL (`ParticipantOutcome`); unique `(match_id, member_id)` |
| `MatchRound` | `match_round` | `match_id`, `round_no`, `ended_at`; unique `(match_id, round_no)` |
| `RoundParticipant` | `round_participant` | `round_id`, `member_id`, `score` INT, `result` (`RoundOutcomeRecord`) |
| `MemberGameStat` | `member_game_stat` | PK `(member_id, game_type)` (`MemberGameStatId`); `wins/draws/losses` (`ResultCounts`); `round_wins/round_draws/round_losses/round_score_sum` (`RoundRecord`) |

- What a game must provide:
  - a `ResultType` per participant per match (`MatchEntry`), with a `seat` consistent with the factory's `memberIds` order and `tokens` (0 is fine);
  - optionally per-round `RoundEntry(memberId, result, score)` with a **unique, increasing `roundNumber`** per match.
  - Both `score` and `tokens` are `int`.
- Queries (`RecordQueryService`, `RecordController` at `/api/records`):
  - `GET /me`, `GET /members/{id}`: `MemberStatsResponse(memberId, nickname, List<GameStatResponse>)`. This iterates **`GameType.values()`**, so a UNO stat (zeros) appears automatically.
  - `GameStatResponse` includes `averageRoundScore = round_score_sum / rounds`. That is meaningful for Paper Safari (lower is better); for UNO its meaning depends on what you put into `RoundEntry.score`.
  - `GET /members/{id}/matches?gameType=&limit=`: `RecentMatchResponse(matchId, gameType, startedAt, endedAt, result, tokens, players[], rounds[])`. Only the requesting member's own round rows are included.
  - `GET /rankings?gameType=` (required): members with `matches.total() >= RANKING_MIN_MATCHES (5)`, sorted by match win rate desc, then total matches desc, then memberId. The ranking ignores scores and tokens, so it is fully generic.
- Schema: `game_type` is plain `VARCHAR(30)` with no CHECK constraint. `UNO` (3 chars) needs no migration.

---

## 3. Game catalog endpoints and how `gameType` flows

- `GET /api/games` (`B/room/api/GameLobbyController`) calls `RoomService.gameOccupancies()`, which calls `GameOccupancies.of(registry.all())`. That builds an `EnumMap` seeded with **every** `GameType.values()`, so a new game shows up with zero counts.
  - Response: `GameSummaryResponse(GameType gameType, String name, int minPlayers, int maxPlayers, int waitingPlayers, int playingPlayers)`.
  - Order follows enum declaration order. `GameLobbyApiTest` asserts `$[0].gameType == PAPER_SAFARI`, so declare `UNO` **after** `PAPER_SAFARI`.
- `GET /api/rooms?gameType=X`: `RoomService.rooms(gameType)` uses `room.isFor(type)` (a null type means all) and returns `RoomSummaryResponse(code, name, gameType, gameTypeName, playerCount, maxPlayers, hostNickname, status, locked, roundNumber, spectatorCount, theme)`.
- Room creation: `POST /api/rooms` with `CreateRoomRequest(String name, GameType gameType, Integer maxPlayers, String password, String theme)`.
  - `RoomService.settingsOf` → `requireGameType` (null gives `INVALID_INPUT`) → `Capacity.of(type, maxPlayers)` (or `Capacity.max(type)`), which validates against `GameType.min/maxPlayers`.
  - The result is a `RoomSettings(gameType, capacity, RoomTraits(lock, theme))` stored in `RoomProfile`.
  - `PATCH /{code}/settings` → `Capacity.of(room.gameType(), maxPlayers)`.
  - `Room.start` checks `gameType().minPlayers()`, and `RoomService.start` → `sessionFactories.create(room.gameType(), ids)`.
- `RoomResponse` includes `gameType` and `gameTypeName`, so the frontend always knows the room's game before any game view arrives.

---

## 4. Backend tests: fakes and patterns

- **Support** (`backend/src/test/java/com/boardgame/support/`):
  - `MutableClock(Instant)` with `advance(Duration)`;
  - `FakeTaskScheduler`, which records tasks; `latest().run()` fires one even if cancelled, to simulate races;
  - `TestTurnTimerConfig`, which registers the fake scheduler when `app.turn-timer.real-scheduler=false`;
  - `FixedRandom(int index)`, where `nextInt(bound) = index % bound`;
  - `ApiUsers.create(mockMvc)`, which signs up and logs in, returning `User(id, nickname, MockHttpSession)`.
- `backend/src/test/resources/application.properties`: H2 in-memory, `create-drop`, `app.turn-timer.real-scheduler=false`, `app.disconnect-forfeit.enabled=false`.
- **`FakeGameSession`** (`.../room/domain/FakeGameSession.java`) is a generic `GameSession` used by room tests.
  - Knobs: `finishOnAct()`, `finishOnAutoAct()`, `failAutoAct()`, `deadlineAt(Instant)`, `finish()`.
  - Inspection: `actions()`, `forfeitCalls()`, `autoActs()`.
  - `viewFor` returns the string `"view-" + id`.
  - Forfeit ends the game when one or fewer players remain.
  - `RoomTest` injects it through the `sessionCreator` lambda of `Room.start`.
- Room/service tests build real wiring with Paper Safari, for example `RoomServiceTurnTimerTest`: `new GameSessionFactories(List.of(new PaperSafariSessionFactory(clock)))` with `CreateRoomRequest("방", GameType.PAPER_SAFARI, 4, null)`. About 26 non-Paper-Safari test files reference `PAPER_SAFARI` (room/api, room/application, room/domain, record, chat). They stay valid when UNO is added.
- **Paper Safari engine tests** (`.../papersafari/`):
  - `Fixtures`: players `ALICE/BOB/CAROL`, positions `FIRST/REST`, hands `WINNER_HAND/LOSER_HAND`, and `stack(...)`, `round(...)`.
  - `GameFixtures`: `game(players, roundStacks)`, `roundWonBy`, `tiedRound`, `playRound`.
  - `StackedShuffler.of(stack)` / `.rounds(stacks)`: a deterministic `CardShuffler`.
  - `RoundFactory(shuffler, count -> 0)` fixes the starter.
  - `PaperSafariSessionTest` drives the session through `GameAction`s, asserts the exact `RoundCompleted`/`GameCompleted` lists (including `MatchEntry(..., 0, seat)`), and checks the JSON shape via `new ObjectMapper().valueToTree(session.viewFor(A))`.
  - `PaperSafariSessionTimerTest` uses `MutableClock` to check deadline rules.
  - `AutoActTest` checks auto actions with `FixedRandom`.
  - `PaperSafariViewTest` checks hidden-information masking.
  - The error assertion helper is `ErrorAssertions.assertError(() -> ..., ErrorCode.X)`.
- **End-to-end:** `room/api/StompGameFlowTest` (`@SpringBootTest(RANDOM_PORT)`) uses a `WebSocketStompClient` with `MappingJackson2MessageConverter` and queues of `JsonNode` views and errors per player. Copy this for a UNO STOMP flow test.
- Pattern for UNO: `UnoSessionTest`, `UnoSessionTimerTest`, `UnoViewTest` (hidden hands), `UnoAutoActTest`, a deterministic shuffler fixture, plus one `StompGameFlowTest`-style UNO test.

---

## 5. Frontend analysis

### 5.1 Catalog, routes, shelf and lobby

- `F/games/catalog.ts`:
  - `CatalogEntry = { gameType, slug, tagline }`;
  - `CATALOG = [{ PAPER_SAFARI, 'paper-safari', '2~5인 · 낮은 점수를 노려라!' }]`;
  - `COMING_SOON_SLOTS = 1`;
  - `entryBySlug(slug)`, `lobbyPath(gameType)` → `/games/{slug}` or `/`.
- `F/App.tsx` routes: `/`, `/games/:slug`, `/rooms/:code`, `/records`, `/records/:memberId`. Routes are generic and slug-based.
- `F/api/types.ts`: `export type GameType = 'PAPER_SAFARI'`. Widening this to include `'UNO'` makes TypeScript flag the `Record<GameType, ...>` maps that need an UNO entry (for example `GameShelfPage.DEFAULT_NAMES`).
- `F/pages/GameShelfPage.tsx` polls `gamesApi.list()` every 1 s and renders `CATALOG` with `GameBox`, a "규칙 보기" button, waiting/playing counts and the coming-soon slots. Paper Safari–specific parts:
  - `DEFAULT_NAMES`;
  - a single `RulesCarousel` from `games/papersafari` that every entry's "규칙 보기" opens.
- `F/games/GameBox.tsx` renders `<PaperSafariBoxArt />` for **any** available entry (hard-coded). `ComingSoonFace` is generic.
- `F/pages/GameLobbyPage.tsx` is generic: room lists, create, join by code, password prompt, spectate, "돌아가기", my stat (from `recordsApi.me()` filtered by gameType) and top-5 ranking (`recordsApi.rankings(gameType)`). Paper Safari–specific parts:
  - `gameType = entry?.gameType ?? 'PAPER_SAFARI'`;
  - `<PaperSafariBoxArt />`;
  - the `<h1>페이퍼 사파리</h1>` title.

### 5.2 `RoomPage` (`F/pages/RoomPage.tsx`): is the table hard-coded?

**Yes.** Whenever `showGame && view` is true, it renders `<PaperSafariTable ... />` with no check on `room.gameType`. Other Paper Safari–shaped logic:

- `useGameOverDismissal(code, view?.game ?? null, room?.status === 'PLAYING')` expects a `PaperSafariView`.
- `wasPlayer = view.game.round.boards.some(b => b.playerId === meId)`.
- `showGameOver = !playing && view?.game.status === 'GAME_OVER' && (wasPlayer || spectating || watched) && !dismissed`.

Everything else in `RoomPage` is generic chrome:
- `RoomStatusBar`, `LeaveConfirmModal`, `RoomSettingsModal`, `WaitingRoom`;
- `RoomThemeProvider` + `RoomBackdrop` (themes);
- `ChatColorProvider`/`chatOrderOf`;
- `GameChat` placement (`panel` beside the table on PC, `strip` below, or `asideFooter` in landscape);
- `useTableLayout`, the 1 s `now` ticker, and redirect-on-missing.

`PaperSafariTable` props (the de-facto table contract):

```ts
{ view; room: Room; meId: number; log: LogEntry[]; receivedAt: number; now: number; errorSeq: number;
  nicknameOf: (id) => string; send: (action: GameAction) => void;
  onCloseGameOver: () => void; onReadyNext: () => void; transition?: ViewTransition | null;
  aside?: ReactNode; asideFooter?: ReactNode }
```

### 5.3 `api/types.ts` view types

- Generic: `Room`, `RoomSummary`, `RoomMember`, `RoomTheme`, `GameSummary`, `GameStat`, `MemberStats`, `RecentMatch`, `MatchPlayer` (has `tokens`), `RoundResult`, `Ranking`.
- Paper Safari: `GameActionType` (`'FLIP' | 'DRAW_DECK' | ... | 'CANCEL_DRAW'`), `GameAction = { type; column?; row? }`, `CardKind`, `CardView`, `SlotView`, `BoardView`, `HeldView`, `TurnPhase`, `RoundView`, `PlayerResultView`, `GameStatus`, `PaperSafariView` (with optional `deadline`, `serverNow`, `lastAutoActorIds`, `autoActSeq`), `PaperSafariSessionView = { game: PaperSafariView }`.

### 5.4 `useRoomChannel` (`F/room/useRoomChannel.ts`)

- Generic plumbing:
  - REST `roomsApi.get` + subscription to `/topic/rooms/{code}` (`acceptRoom`, with `live` flag for departure toasts/log via `lib/departures.ts`);
  - `/user/queue/game` → `acceptView`;
  - `/user/queue/errors`: increments `errorSeq` except for chat error codes; `NOT_IN_ROOM`/`ROOM_NOT_FOUND` set `missing`;
  - `/app/rooms/{code}/sync` retried up to 5 times, 1 s apart, until a view arrives, and re-sent when status becomes PLAYING;
  - spectator polling every 5 s;
  - `send(action)` publishes to `/app/rooms/{code}/actions`;
  - `nicknameOf` uses a name cache, falling back to "떠난 플레이어".
- Paper Safari–typed parts:
  - `view: PaperSafariSessionView`;
  - `ViewTransition = { seq, from: PaperSafariView | null, to: PaperSafariView, animate }`, where `animate = false` for the view that answers a sync;
  - `acceptView` calls `describeChanges(prev.game, next.game, nicknameOf)` from `F/lib/eventLog.ts`.
- `F/lib/eventLog.ts`:
  - Generic: `LogEntry`/`LogDraft`, `LOG_LIMIT=200`, `prependLog`.
  - Paper Safari–specific: `LogKind` union (`'draw-deck' | 'draw-discard' | 'place' | 'undo' | 'peek' | 'start' | 'result' | 'timeout' | 'leave' | 'other'`) and all of `describeChanges`: `heldChanges`, `phaseChanges`, `gameResult`, `timeouts` with the `AUTO_ACTIONS` text keyed by Paper Safari phases.
  - The `gameResult` and `timeouts` (autoActSeq) patterns are reusable if a view exposes `status`, `winnerId`, `autoActSeq` and `lastAutoActorIds`.
- The log UI lives under the Paper Safari folder but is nearly generic: `F/games/papersafari/layout/LogList.tsx` (`KIND_STYLE: Record<LogKind, {Icon,bg}>`, `KindDot`, `Sentence`) and `LogModal.tsx`.

### 5.5 Game end: `useFinale`, `GameOverPanel`, dismissal

- `F/games/papersafari/useFinale.ts` (Paper Safari–specific): reveal animation for face-down slots → "게임 끝!" banner (`GameEndBanner`) → `'done'`, after which `PaperSafariTable` renders `GameOverPanel`. It uses the `transition` to decide whether to animate and plays `'flip'` while revealing.
- `F/games/papersafari/GameOverPanel.tsx` (`Modal` "게임 결과"):
  - Paper Safari–specific: staged card reveal, `ScoreRows` sorted by ascending score, `PlayerBoard` with `resolveBoard`/`wildNotes` (wild-card notes), the "상대가 나가서 게임이 끝났어요" case when `lastRoundResult` is empty.
  - Generic sub-pieces worth extracting: `useResultSound(done, outcome)` (plays `'roundWin'`/`'roundLose'`), `ReadyChips(members)`, `FooterButton` (guest: "다음 게임 준비" → `onReady`; host: "대기실로" → `onClose`), `Confetti`, `HeadlineIcon`.
- `F/room/useGameOverDismissal.ts` + `F/lib/dismissals.ts`: sessionStorage memory of dismissed result dialogs. It is Paper Safari–typed: `gameOverKey(code, game)` = `${code}:${winnerId}:${JSON.stringify(lastRoundResult.players → [id, score])}`, because the server sends no match id. The storage logic is generic; only the key function is game-specific.

### 5.6 Turn bar, countdown, sounds, layout

- `F/components/Countdown.tsx` is **generic**. `Countdown({ deadline, serverNow, onWarn?, size?, className? })` shows the ring only during the last 5 s and calls `onWarn` once per deadline. It needs `deadline` and `serverNow` (epoch ms) in the view.
- `F/games/papersafari/layout/TurnBar.tsx` is effectively **generic**: `TurnBar({ instruction, myTurn, log, nicknameOf?, deadline, serverNow, onWarn?, locked?, compact?, stacked? })`. It shows the instruction, the `Countdown`, the latest log line and a `LogModal`. It lives in the Paper Safari folder but could move to `F/room/` or `F/components/`.
- `F/lib/sound.tsx` is generic:
  - `SoundName = 'draw' | 'place' | 'flip' | 'myTurn' | 'roundWin' | 'roundLose' | 'click' | 'tick'`;
  - Web Audio recipes in `RECIPES`; `'draw'` uses the user-selected `DrawSound` (`swish|pop|tock|chime`);
  - `useSound() → { play, muted, volume, ... }`.
  - Paper Safari callers: `PaperSafariTable` (`myTurn` on turn start, `tick` via `onWarn`, `flip` in the finale), `useCardMotion` (`draw`/`place` timed to ghost flights), `GameOverPanel` (`roundWin`/`roundLose`).
  - For UNO, `draw`, `place`, `myTurn`, `tick`, `roundWin` and `roundLose` work as-is. New effects (for example an "UNO!" call or skip/reverse) need new `SoundName`s and recipes.
- `F/lib/useTableLayout.ts` is generic: `TableLayout = 'pc' | 'landscape' | 'portrait'` (`TABLE_PC_QUERY` = min-width 768 and min-height 541; `LANDSCAPE_PHONE_QUERY`).
- `F/games/papersafari/layout/TableRound.tsx` is Paper Safari–specific: `TableDensity = 'pc' | 'landscape' | 'mini'` with a `DENSITY` style table (seat sizes, felt classes); `PaperSafariTable` maps it via `DENSITY_OF`. The pattern of flowing rows rather than absolute positions is reusable.
- `F/games/papersafari/layout/seats.ts` is generic logic:
  - `seatOrder(playerIds, meId)` rotates so the opponents follow me;
  - `seatRows(count)` supports **at most 4 opponents** (5 players). `seatPositions` falls back to the 4-opponent layout, so a 6th or later player would be dropped from the rows.
- Card motion (`F/games/papersafari/motion/`: `inferMoves`, `useCardMotion`, `GhostLayer`, `ZoneAnchor` with `HiddenZonesContext`/`LiftedZonesContext`, `zones.ts`): Paper Safari–specific diffing of boards/slots/held/deck/discard. The ghost-flight layer idea is reusable, but `inferMoves` would need an UNO version (hand → discard, deck → hand).
- Generic visual components: `Felt` (`FELT_GRID`), `WoodRail`, `Confetti`, `Modal`, `RollingNumber`, `icons.tsx` (inline SVG only; `F/noEmoji.test.ts` fails the build on emoji), `ui.tsx` (`Panel`, `Button`, `TextInput`), `Toast`.

### 5.7 Chat, waiting room, rules

- Chat is fully generic: `F/room/GameChat.tsx` (`variant: 'panel' | 'strip'`), `ChatPanel`, `ChatStrip`, `ChatSheet`, `ChatInput`, `useRoomChat`, `chatColors`, `useSeatBubbles`. On the backend: `/user/queue/chat`, `ChatService` via `RoomService.withOccupant`.
- `F/room/WaitingRoom.tsx`:
  - Generic: `MemberList` (chairs around the felt; `SEAT_POSITIONS` table for 2..5 seats plus an angle formula fallback), `WaitingActionBar`, `KickConfirmModal`, the spectator list and `ChatPanel`.
  - Paper Safari–specific: imports `RulesCarousel` and `RULE_SUMMARY` from `games/papersafari`, and the heading "페이퍼 사파리 규칙".
- `F/games/papersafari/RulesCarousel.tsx`: the carousel mechanics (keyboard/swipe/Modal) are generic, but it reads `RULE_SLIDES` and renders `CardFace` for `slide.cards: CardView[]` with the title "페이퍼 사파리 규칙". `F/games/papersafari/rules.ts` exports `RULE_SLIDES` and `RULE_SUMMARY`.
- Room settings: `F/room/SeatPicker.tsx` has `SEAT_OPTIONS = [2, 3, 4, 5]` hard-coded. `CreateRoomModal` defaults `maxPlayers` to 5. `RoomSettingsModal` uses `min = Math.max(2, members.length)`. These must come from `GameSummary.min/maxPlayers` or the catalog.
- `ThemePicker` / `roomTheme.tsx` (themes WOOD/SUNSET/MOONLIT/AURORA/BEACH via scoped CSS variables) are generic.

### 5.8 Records page and ranking

- `F/pages/RecordsPage.tsx`: `const GAME = 'PAPER_SAFARI'` is used for `recordsApi.matches(...)` and `recordsApi.rankings(...)`, and the heading "페이퍼 사파리 순위표 (5판 이상)" is hard-coded. The stats grid already maps over all `stats.stats` (one card per `GameType`), so UNO stats appear automatically.
- `F/records/StatSummary.tsx`: generic, but its "평균 점수" row (`averageRoundScore`) has Paper Safari semantics.
- `F/records/RecentMatches.tsx`: generic; it shows `round.score + '점'`.
- `F/records/RankingList.tsx`: generic.
- Other generic chrome: `Layout`, `UserMenu`, `ActiveRoomBar`, `RoomStatusBar` (shows `room.gameTypeName`). Login and signup pages use the Paper Safari `CardFace` purely as decoration.

---

## 6. What a new game frontend module must provide, and the minimal seams

### 6.1 Reusable as-is

Rooms, lobby and shelf scaffolding, `useRoomChannel` transport, `GameChat`/chat stack, `WaitingRoom` (once rules are injected), `RoomStatusBar`, the theme system, `Countdown`, `TurnBar` + `LogList`/`LogModal` (move them out of `papersafari/`), `useSound`, `useTableLayout`, `seatOrder`/`seatRows` (up to 5 players), `Felt`/`WoodRail`/`Modal`/`Confetti`/`RollingNumber`/icons, `departures`, `prependLog`, the dismissal storage, and the records/ranking components.

### 6.2 A new game module (`F/games/uno/`) must provide

1. View types: `UnoSessionView`, `UnoView` (with `status`, `winnerId`, `deadline`, `serverNow`, `lastAutoActorIds`, `autoActSeq`, and per-viewer hand data).
2. Action types (`UnoAction`).
3. `UnoTable` implementing the table props contract from 5.2: instruction text, my-turn sound, the 5 s `tick` warning, and the double-send guard (`PENDING_MS` pattern).
4. `describeUnoChanges(prev, next, nicknameOf): LogDraft[]`, plus any new `LogKind`s and `KIND_STYLE` entries.
5. A game-over panel (it can reuse extracted `ReadyChips`/`FooterButton`/`useResultSound`).
6. `gameOverKey(code, view)`.
7. Helpers `isGameOver(view)` and `wasParticipant(view, meId)` for `RoomPage`.
8. Rules: `RULE_SLIDES`/`RULE_SUMMARY` plus a slide-visual renderer (UNO card faces).
9. Box art.
10. Optionally card motion (`inferMoves` equivalent).

### 6.3 Proposed minimal seams

1. **Game registry** `F/games/registry.ts`, keyed by `GameType`:

   ```ts
   type GameModule<V = unknown> = {
     Table: ComponentType<TableProps<V>>;           // replaces hard-coded PaperSafariTable in RoomPage
     describeChanges: (prev: V | null, next: V, nicknameOf: Nickname) => LogDraft[];
     isGameOver: (view: V) => boolean;               // RoomPage showGameOver
     wasParticipant: (view: V, meId: number) => boolean; // RoomPage wasPlayer
     gameOverKey: (code: string, view: V) => string; // dismissals
     rules: { title: string; summary: string[]; slides: RuleSlide[]; SlideArt: ComponentType<...> };
     BoxArt: ComponentType;
   };
   export const GAMES: Record<GameType, GameModule> = { PAPER_SAFARI: paperSafari, UNO: uno };
   ```

   You could fold `CATALOG` (slug, tagline) into this, or keep it separate.

2. **`useRoomChannel(code, { describeChanges })`**: pass the describer in, or look it up from `room.gameType` once the room is known. Make `view` and `ViewTransition` generic (`unknown` or a type parameter). The first view can arrive before the REST room, so either buffer until the room is known or let the describer return `[]` when `prev` is null; it already does that.
3. **`useGameOverDismissal(code, key: string | null, playing)`**: take a precomputed key instead of a `PaperSafariView`.
4. **`RulesCarousel({ title, slides, renderArt })`**: generic. `WaitingRoom` and `GameShelfPage` take the rules from the registry (or from `room.gameType`).
5. **`GameBox`, `GameLobbyPage` header**: use `GAMES[gameType].BoxArt` and `entry`/summary name instead of hard-coded `PaperSafariBoxArt` and "페이퍼 사파리". Drop the `'PAPER_SAFARI'` fallback (the page already `<Navigate>`s when there is no entry).
6. **`SeatPicker({ min, max })`**, `CreateRoomModal` default = max for the game, `RoomSettingsModal` bounds: feed from the `GameSummary` or catalog `minPlayers`/`maxPlayers`.
7. **`RecordsPage`**: a game selector (tabs or a dropdown over `CATALOG`) instead of `const GAME`, and a heading built from the name.
8. **Optional, for clean JSON polymorphism:** have the session view carry a discriminator, for example `UnoSessionView(String gameType = "UNO", UnoView game)`. You could also add one generically by wrapping in `RoomGame.viewFor` (`{gameType, matchKey, game}`), which would also give the client a real match id for `gameOverKey`. That wrapper changes the Paper Safari JSON contract (`{game}`) and its tests, so keep it optional. Selecting by `room.gameType` is enough today, because `RoomPage` renders nothing until the room is loaded and a room's `gameType` never changes.
9. Move `TurnBar`, `LogList`, `LogModal`, `GameEndBanner` and `seats.ts` from `games/papersafari/layout/` to a shared folder (for example `F/table/`). This is a pure file move.

---

## 7. Integration checklist for adding UNO

### Backend

- [ ] `GameType`: add `UNO("우노", 2, N)` **after** `PAPER_SAFARI`. Decide N; the frontend seat layout supports at most 5 unless you extend `seatRows`/`MemberList`. 2..5 is the low-risk choice; above that, do the layout work.
- [ ] `ErrorCode`:
  - generalise `INVALID_CAPACITY` (it says "2~5명");
  - add UNO-specific codes (for example `CARD_NOT_PLAYABLE`, `MUST_CHOOSE_COLOR`, `NOT_IN_HAND`). The enum is global, so give the codes distinct names;
  - keep `INVALID_PLAYER_COUNT` for Paper Safari or add an UNO equivalent.
- [ ] `GameAction`: extend with nullable fields, for example `String cardId` and `String color` (or `Integer cardIndex`). Keep `column`/`row` so Paper Safari is unchanged, and update `FakeGameSession`/tests that construct `new GameAction(type, col, row)` (keep a 3-arg constructor).
- [ ] Package `com.boardgame.uno`:
  - `UnoGame` / `UnoRound` domain (deck, discard, hands, direction, draw stacking rules, wild colour, "UNO" call if desired);
  - `UnoCommand` enum dispatch (`PLAY`, `DRAW`, `PASS`, `CHOOSE_COLOR`, ...);
  - `UnoSession implements GameSession`;
  - `@Component UnoSessionFactory` with `type() = GameType.UNO`, injecting `Clock`;
  - a deterministic shuffler interface for tests.
- [ ] Session contract details:
  - `act`/`forfeit`/`autoAct` return `[]` while in progress, and `[RoundCompleted?, GameCompleted]` exactly once when the game ends; reject actions after the game is over;
  - `MatchEntry` for **all** original participants, `seat` = index in `memberIds`, `tokens = 0`, forfeiters = `LOSE`;
  - `RoundEntry.score`: decide the meaning, for example remaining hand points (lower is better, like Paper Safari) or points won. Keep `roundNumber` unique per match.
  - `isPlaying` is false after a forfeit or game end;
  - `deadline()` is empty when finished and always set while waiting on an action, otherwise the game never times out;
  - `autoAct(Random)` must always make progress (for example draw-and-pass, or play the first legal card; choose a random colour for wilds). If it throws, the room retries every 15 s indefinitely;
  - `viewFor(memberId)` must work for spectators and non-participants: hide other hands (send counts only) and hide the deck.
- [ ] Timing: reuse `TurnCountdown`/`TurnTiming`/`AutoActors` (preferably moved to a shared package with a generic stage key) and expose `deadline`, `serverNow`, `lastAutoActorIds` and `autoActSeq` in the UNO view.
- [ ] Tests:
  - `UnoSessionTest`, `UnoSessionTimerTest` (`MutableClock`), `UnoAutoActTest` (`FixedRandom`), `UnoViewTest` (hidden hands via `ObjectMapper.valueToTree`);
  - a STOMP flow test cloned from `StompGameFlowTest` that creates the room with `gameType: "UNO"`;
  - a records smoke test (match, rounds and stat rows for `UNO`);
  - lobby test: `/api/games` now returns 2 entries.

### Frontend

- [ ] `api/types.ts`: `GameType = 'PAPER_SAFARI' | 'UNO'`, plus the UNO view and action types. Widen `GameAction` (a union, or add `cardId?`/`color?`).
- [ ] `games/catalog.ts`: add `{ gameType: 'UNO', slug: 'uno', tagline: ... }` and decrement `COMING_SOON_SLOTS` if desired. Update `catalog.test.ts`.
- [ ] Add the game registry (section 6.3) and wire it into `RoomPage` (Table, isGameOver, wasParticipant, gameOverKey), `useRoomChannel` (describer), `WaitingRoom` + `GameShelfPage` (rules), `GameBox` + `GameLobbyPage` (box art and name), and `RecordsPage` (game selector).
- [ ] `SeatPicker`/`CreateRoomModal`/`RoomSettingsModal`: per-game min/max player bounds.
- [ ] `F/games/uno/`:
  - `UnoTable` (reuse `TurnBar`, `Countdown`, `Felt`, `seatOrder`/`seatRows`, `useTableLayout` and the density idea);
  - card faces as inline SVG (no emoji, enforced by `noEmoji.test.ts`);
  - `describeUnoChanges` + `LogKind` additions (+ `KIND_STYLE` icons);
  - game-over panel (extract `ReadyChips`/`FooterButton`/`useResultSound` from the Paper Safari panel);
  - rules slides, box art, optional motion;
  - sounds: reuse `draw`/`place`/`myTurn`/`tick`/`roundWin`/`roundLose`, or add new `SoundName` recipes.
- [ ] Tests: registry selection in `RoomPage.test.tsx` (UNO room renders `UnoTable`), the UNO describer, the UNO table, and `useRoomChannel` with a UNO view.

---

## 8. Risks and gotchas

1. **View polymorphism.** `viewFor` returns `Object` and `/user/queue/game` carries no type tag. The client must pick the renderer from `room.gameType`. `useRoomChannel` currently casts every view to `PaperSafariSessionView`, and `describeChanges` dereferences `prev.round.held` etc., so an UNO view would crash it at runtime. Make the describer per-game **before** any UNO view can reach the client. Consider a `gameType` discriminator in the view.
2. **Stale previous-game view.** The finished session stays in `Room.game`. People who join or sit down after a game ended still get that game's view via `sync`, and `RoomPage` shows the result dialog based on it (`wasPlayer`/`watched`). Per-game `isGameOver`/`wasParticipant` must handle this. A game type can't switch inside one room, so it is never a cross-game mismatch.
3. **`GameAction` shape.** Unknown JSON fields are dropped silently by Boot's ObjectMapper, so UNO's `cardId`/`color` must be real record components. `MessageConversionException` only fires for type mismatches.
4. **Timer stages.** `RoomService.rearm` re-arms on every broadcast using `session.deadline()`. If UNO resets its countdown on every change (for example a colour choice after a wild), turns can be extended; define a stage key such as `(player, phase)` like `TurnStage`. An `autoAct` that throws, or makes no progress while `deadline()` stays in the past, causes a retry loop (15 s retry, log spam). A deadline that is always present while the game is unfinished is required; returning empty pauses the timer indefinitely.
5. **Multi-actor auto actions.** `lastAutoActorIds` + `autoActSeq` exist because one timeout can act for several players (Paper Safari setup flip). The client logs only when `autoActSeq` increases. Keep the same contract so `timeouts()`-style logging stays deduplicated across re-syncs.
6. **Hidden information.** `sendView` goes to **all occupants**, including spectators and post-game auto-seated players. UNO hands must be masked per viewer, including the drawn card and the deck order. Never put other players' cards in the view, and test with JSON (`valueToTree`) the way `PaperSafariSessionTest` does.
7. **Record schema assumptions.**
   - `match_participant.tokens` is `NOT NULL`: always send `0` (or reuse it for something like final points, but the UI shows nothing for it today).
   - `seat` must index the original `memberIds`. `recordCompletion` also creates missing participants from `MatchEntry.seat`.
   - `round_participant.score` / `round_score_sum` feed `averageRoundScore`, labelled "평균 점수" with Paper Safari "lower is better" semantics.
   - Only one `RoundCompleted` per `roundNumber` is stored (unique constraint, idempotent skip). Multi-hand UNO to 500 points must number hands 1..k. Paper Safari's `roundNumber()` is always 1.
   - Rankings use only match W/D/L. A draw is rare in UNO; decide whether a forfeit win counts.
8. **Player-count limits.** `GameType.maxPlayers` drives backend validation, but the frontend hard-codes 2..5 in `SeatPicker.SEAT_OPTIONS`, `seats.ts` (4 opponents max) and `MemberList.SEAT_POSITIONS`, and `ErrorCode.INVALID_CAPACITY` says "2~5명". Raising UNO above 5 needs UI layout work.
9. **Enum order dependence.** `GameLobbyApiTest` asserts `$[0]` is `PAPER_SAFARI`; `/api/games` and `GameStatResponse` lists follow enum declaration order.
10. **Global lock and events.** Session methods and record listeners run inside `RoomService`'s `synchronized` lock. Keep UNO engine work cheap; records are already isolated in `REQUIRES_NEW` transactions with errors swallowed.
11. **No emoji.** `F/noEmoji.test.ts` scans every non-test source file. UNO symbols (reverse, skip, +2, wild) must be inline SVG or text.
12. **Shared folders.** Several generic UI pieces (`TurnBar`, `LogList`, `LogModal`, `seats.ts`, `GameEndBanner`) live under `games/papersafari/`. Importing them from `games/uno/` works but couples the modules; prefer moving them first (no behaviour change).
