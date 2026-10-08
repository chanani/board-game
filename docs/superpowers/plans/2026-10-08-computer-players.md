# 컴퓨터 플레이어(싱글 플레이, 난이도 하·중·상) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 대기실 빈자리에 방장이 "컴퓨터"(하·중·상)를 앉혀 사람 1명 + 컴퓨터 여러 명으로도 세 게임(페이퍼 사파리·우노·도둑잡기)을 끝까지 할 수 있게 하고, 컴퓨터가 낀 판은 전적·순위에 남기지 않는 "연습 경기"로 만든다.

**Architecture:** 컴퓨터는 방 안에서만 사는 참가자(`Participant` + `BotProfile`, 음수 번호)다. 방 도메인이 추가·난이도 바꾸기·정원 자동 늘리기·항상 준비·사람만 방장·사람 없으면 방 닫기를 맡는다. 게임 세션은 새 `GameSession.pendingActors()`로 "지금 누가 무슨 결정을 기다리는지"를 알려 주고, `RoomService`가 상태를 방송할 때마다 `BotDriver`가 행동할 컴퓨터마다 게임별 `BotBrain`의 `BotMind`에게 그 컴퓨터 자리 화면(`viewFor(botId)`)만 주고 계획(`BotPlan` = 지연 + 행동/신호 걸음)을 받아 `BotScheduler`에 예약한다. 예약은 실행 때 상태 번호(epoch)가 그대로일 때만 사람과 같은 `room.act` 경로를 탄다(실패하면 기존 자동 행동과 같은 결정을 한 번 시도). 연습 경기는 시작 때 정하고(`RoomGame.isPractice`) 전적 이벤트를 발행하지 않는다. 프론트는 대기실 빈자리 "컴퓨터 추가"·난이도 선택 창·컴퓨터 칩·정보 창·결과 창 안내를 더한다.

**Tech Stack:** Java 21, Spring Boot 3.5, JUnit 5/AssertJ/Mockito/MockMvc, STOMP(simple broker); React 19, TypeScript 5.9, Tailwind 4, motion 14, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-08-computer-players-design.md` (규칙 `R1`~`R46`, 결정 `D1`~`D8`은 스펙의 번호다. 테스트 이름·코드 주석에 그대로 쓴다). 스타일 예: `docs/superpowers/plans/2026-10-07-old-maid.md`.

## Global Constraints

- 브랜치는 `feature/bots` 그대로 쓴다. push·merge·브랜치 전환 금지. 서브에이전트가 또 다른 서브에이전트를 부르지 않는다.
- 화면에 이모지 금지. 아이콘은 모두 인라인 SVG(`currentColor`, 장식은 `aria-hidden="true"`). 로봇 얼굴은 새 `RobotIcon`(`frontend/src/components/icons.tsx`). `frontend/src/noEmoji.test.ts`가 검사한다.
- 화면 문구는 한국어, 기존 말투("~해요"). 이 계획에 따옴표로 적힌 문구는 글자 그대로 쓴다(테스트가 그 글자를 본다): "컴퓨터 추가", "빈자리에 컴퓨터 추가", "하 · 쉬움", "중 · 보통", "상 · 어려움", "컴퓨터 · 하"/"컴퓨터 · 중"/"컴퓨터 · 상", "컴퓨터 1 정보 보기", "컴퓨터와 한 연습 경기라 전적에 넣지 않아요", 이름 "컴퓨터 {n}".
- 백엔드 Java는 `/Users/ichanhan/CLAUDE.md` 객체지향 생활 체조를 따른다: 메서드 들여쓰기 1단계(중첩 if/for 금지, 메서드 추출), `else` 금지(early return), 원시값은 VO(`BotNumber`, `BotPace` 등), 컬렉션은 일급 컬렉션, 규칙은 도메인 안, setter 없음, 한 줄에 점 하나(스트림 체인은 줄바꿈), 클래스 필드 3개 이하. 예외(기존 관례): 화면으로 나가는 record(`*View`, `*Response`), 판단 입력 record(`BotSituation`), 스프링 서비스·구동기(`RoomService`, `BotDriver`)의 주입 협력자, 테스트 코드.
- 오류는 도메인에서 `throw new BusinessException(ErrorCode.X)`, 응답은 기존 통일 형식 `{status, code, message}`(`GlobalExceptionHandler`). 새 코드는 하나: `BOT_NOT_FOUND(HttpStatus.NOT_FOUND, "컴퓨터를 찾을 수 없어요.")`. 인원 초과는 기존 `ROOM_FULL`, 방장 아님은 `NOT_ROOM_HOST`, 게임 중은 `ROOM_ALREADY_PLAYING`, 잘못된 난이도·본문 없음은 `INVALID_INPUT`. 검사 순서는 기존 정원 바꾸기(`reconfigure`)와 같이 "본문 형식 → 방장 → 대기 중 → 대상/정원".
- 사람끼리 하는 판의 동작·화면·전적은 바뀌지 않는다. 기존 테스트는 고치지 않고 그대로 통과해야 한다(이 계획이 명시한 시그니처 추가 말고는). 사람끼리 하는 방에서는 컴퓨터 예약기를 부르지 않고 무작위도 소비하지 않는다.
- 레이아웃: PC 1280×860 한 화면(스크롤 없음), 도둑잡기 6인 휴대폰 가로(높이 390) 한 화면, 휴대폰 세로·가로 유지, 테마 5가지, 동작 줄이기 존중. 칩·버튼은 자리 높이를 늘리지 않는다(기존 이름표 줄/상태 칩 자리를 쓴다, R46).
- 컴퓨터 생각 시간: 기본 0.8~1.8초(`ThinkTime.standard`), 도둑잡기 하의 처음 짝 버리기 2.5~5초, 우노 잡기 중 1~3초·상 0.8~1.5초, 도둑잡기 신호 간격 0.3~0.8초. 모두 결정 시간(15초/30초)보다 짧다.
- 프론트 타입 검사는 `cd frontend && npm run build`(= `tsc --noEmit && vite build`)로만 한다. **`npx tsc -b`를 쓰지 말 것**(src에 .js 파일을 쏟아낸다).
- 명령: 백엔드 한 클래스 `cd backend && mvn -q test -Dtest=클래스명`, 전체 `cd backend && mvn -q test`. 프론트 한 파일 `cd frontend && npm test -- --run <경로>`, 전체 `cd frontend && npm test -- --run`, 빌드 `cd frontend && npm run build`.
- 모든 태스크는 끝에 저장소 전체가 초록이어야 한다: 백엔드 태스크는 `mvn -q test`, 프론트 태스크는 `npm test -- --run`과 `npm run build`.
- 커밋: 태스크마다 한 번. 자기가 만든·고친 파일만 `git add <정확한 경로들>`(`git add -A`/`git add .` 금지). 메시지는 한국어 한 줄, 빈 줄 하나, `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 표기: `B/` = `backend/src/main/java/com/boardgame/`, `BT/` = `backend/src/test/java/com/boardgame/`, `F/` = `frontend/src/`.
- 프론트 테스트 환경: `setMediaMatches(true)`(`src/test/media.ts`)면 PC. motion 애니메이션은 테스트에서 건너뛴다. 모달 안 요소는 `await waitFor(...)`.
- 브라우저 확인(Task 12)은 백엔드 8898 포트(메모리 H2, `DB_CLOSE_DELAY=-1`)와 빈 포트의 프론트 개발 서버만 쓴다. 사용자 서버(8899, 5177)는 건드리지 않고, 끝나면 자기가 띄운 PID만 끈다.

## Review Focus

- 예약한 뒤 상태가 바뀐 컴퓨터 행동(사람이 먼저 행동함, 사람이 먼저 잡거나 외침, 게임이 끝남, 마지막 사람이 나가 방이 닫힘)이 늦게 적용되거나 오류를 냄 → 사람이 기대하는 것은 "늦은 예약은 아무 일도 하지 않는다". Task 5 `BotDriverTest`의 `R20_예약_뒤에_상태가_바뀌면_옛_예약은_아무것도_하지_않는다`, `R20_게임이_끝나면_옛_예약은_아무것도_하지_않는다`, `R13_R20_사람이_모두_나가_방이_닫히면_예약은_아무것도_하지_않는다`, Task 7 `UnoMindTest.R32_한_잡기_창에서는_한_번만_정하고_창이_닫히면_잊는다`.
- 연결 끊김 처리가 컴퓨터를 사람처럼 다룸(접속 기준점이 컴퓨터에 찍혀 60초 뒤 자동 기권, 수동 기권 버튼으로 컴퓨터를 뺌) → Task 2 `RoomServiceBotTest.R6_오래_끊긴_사람을_찾는_확인은_컴퓨터를_기권시키지_않는다`, `R6_컴퓨터는_손으로_기권시킬_수_없다`.
- 연습 경기 기록 누출(나가기·시간 초과·마지막 행동 어느 길로 끝나도 `game_match`에 행이 생기거나 시작 이벤트가 나감) → Task 3 `OutcomePublisherPracticeTest.R37_연습_경기의_결과는_어느_길로_와도_발행하지_않는다`, `PracticeRecordApiTest.R37_R38_컴퓨터가_낀_게임은_연습_경기이고_기록이_남지_않는다`.
- 컴퓨터가 규칙에 막혀 같은 거절을 되풀이하거나 판이 멈춤(섞기 쿨다운, 이미 닫힌 잡기 창, 상끼리 판을 끝내지 않음) → Task 5 `R21_서버가_거절하면_자동_행동을_한_번_시도한다`, `R21_자동_행동도_거절되면_조용히_멈추고_시간_초과_처리에_맡긴다`, Task 9 시뮬레이션의 "시간 초과 0·거절 0" 단언과 `상끼리_두어도_판이_끝난다`.
- 컴퓨터 칩·추가 자리가 자리 높이를 늘려 6인 휴대폰 가로(390)·PC 1280×860 한 화면이 깨짐 → Task 11 `botSeats.test.tsx`(칩이 이름표 줄 안에 있음), Task 10 `WaitingRoomBots.test.tsx`(추가 자리는 의자 하나만 늘림), Task 12 브라우저 스크린샷.

---

## 파일 구조

백엔드(`B/`):

| 파일 | 책임 | 태스크 |
|---|---|---|
| `game/bot/BotDifficulty.java` | 난이도 EASY·MEDIUM·HARD와 파싱 | 1 |
| `room/domain/BotNumber.java`, `BotProfile.java`, `BotIds.java` | 컴퓨터 이름 번호·프로필·음수 번호 발급 | 1 |
| `room/domain/Participant.java`, `RoomMembers.java`, `RoomOccupants.java`, `Room.java`, `Capacity.java`, `RoomRegistry.java` | 추가·바꾸기·정원 늘리기·항상 준비·사람만 방장·사람 없으면 빈 방·회원 방 찾기 | 1 |
| `common/error/ErrorCode.java` | `BOT_NOT_FOUND` | 1 |
| `room/domain/AvatarDraw.java` | 겹치지 않는 그림 고르기(R4) | 2 |
| `room/api/BotDifficultyRequest.java`, `RoomController.java`, `RoomMemberResponse.java`, `RoomResponse.java`, `RoomSummaryResponse.java` | 엔드포인트·응답 필드 | 2 |
| `room/application/RoomService.java` | 추가·바꾸기, 접속 기준점·기권에서 컴퓨터 제외, 화면을 사람에게만 | 2 |
| `room/domain/MatchStamp.java`, `RoomGame.java`, `Room.java`, `room/application/OutcomePublisher.java`, `RoomService.java`, `room/api/RoomResponse.java` | 연습 경기 | 3 |
| `game/PendingKind.java`, `game/PendingActor.java`, `game/GameSession.java` | 기다리는 참가자 | 4 |
| `papersafari/PaperSafariRound.java`, `PaperSafariGame.java`, `PaperSafariSession.java`, `uno/UnoGame.java`, `UnoSession.java`, `oldmaid/OldMaidGame.java`, `OldMaidSession.java`, `room/domain/RoomGame.java`, `Room.java` | 게임별 `pendingActors` | 4 |
| `game/bot/BotStepKind.java`, `BotStep.java`, `BotPlan.java`, `BotSituation.java`, `BotMind.java`, `BotBrain.java`, `BotBrains.java`, `ThinkTime.java` | 컴퓨터 판단 공통 계약 | 5 |
| `room/application/BotConfig.java`, `BotPace.java`, `BotScheduler.java`, `BotTicket.java`, `BotRunner.java`, `BotRoom.java`, `BotRooms.java`, `BotDriver.java`, `RoomService.java` | 예약·무효화·실패 대비·사람과 같은 경로 | 5 |
| `papersafari/bot/*` | 페이퍼 사파리 시야·어림·하/중/상·자동 행동 대체 | 6 |
| `uno/bot/*` | 우노 시야·기억·하/중/상·잡기 | 7 |
| `oldmaid/bot/*` | 도둑잡기 시야·섞기 기억·하/중/상·신호 | 8 |

테스트(`BT/`): `room/domain/BotRoomTest`, `BotRoomRegistryTest`, `CapacityTest`(추가), `game/bot/BotDifficultyTest`, `common/error/BotErrorCodeTest`(1), `room/domain/AvatarDrawTest`, `room/api/BotRoomApiTest`, `room/application/RoomServiceBotTest`(2), `room/domain/RoomPracticeTest`, `room/application/OutcomePublisherPracticeTest`, `RoomServicePracticeTest`, `record/api/PracticeRecordApiTest`(3), `papersafari/PaperSafariPendingActorsTest`, `uno/UnoPendingActorsTest`, `oldmaid/OldMaidPendingActorsTest`, `room/domain/RoomPendingActorsTest`(4), `game/bot/ThinkTimeTest`, `BotPlanTest`, `room/application/ScriptedBrain`, `BotDriverTest`, `BotAutoActorLogTest`, `support/TestBotConfig`(5), `papersafari/bot/*Test`(6), `uno/bot/*Test`(7), `oldmaid/bot/*Test`(8), `game/bot/BotTable`, `papersafari/bot/PaperSafariSimulationTest`, `uno/bot/UnoSimulationTest`, `oldmaid/bot/OldMaidSimulationTest`, `room/api/BotStompFlowTest`(9).

프론트(`F/`):

| 파일 | 책임 | 태스크 |
|---|---|---|
| `api/types.ts`, `api/rooms.ts` | `BotDifficulty`, `RoomMember.bot/difficulty`, `Room.practice`, `addBot`·`changeBot` | 10 |
| `lib/bots.ts`, `components/icons.tsx`(`RobotIcon`), `components/BotChip.tsx` | 난이도 글자·칩 | 10 |
| `room/BotDifficultyModal.tsx`, `room/BotInfoModal.tsx`, `room/MemberList.tsx`, `room/WaitingRoom.tsx`, `room/WaitingActionBar.tsx`, `pages/RoomPage.tsx` | 대기실 | 10 |
| `components/PresenceMark.tsx`, `games/papersafari/PlayerBoard.tsx`, `layout/Seat.tsx`, `layout/OpponentSeat.tsx`, `PaperSafariTable.tsx`, `games/uno/UnoSeat.tsx`, `UnoTable.tsx`, `games/oldmaid/OldMaidSeat.tsx`, `OldMaidTable.tsx` | 게임 테이블 컴퓨터 칩·연결 표시 숨김 | 11 |
| `table/PracticeNote.tsx`, 세 결과 창 | 연습 경기 안내 | 11 |

---

### Task 1: 방 도메인 — 컴퓨터 참가자, 추가·난이도 바꾸기·정원 늘리기·항상 준비·사람만 방장·사람 없으면 빈 방

**Files:**
- Create: `B/game/bot/BotDifficulty.java`, `B/room/domain/BotNumber.java`, `B/room/domain/BotProfile.java`, `B/room/domain/BotIds.java`
- Modify: `B/room/domain/Participant.java`, `B/room/domain/RoomMembers.java`, `B/room/domain/RoomOccupants.java`, `B/room/domain/Room.java`, `B/room/domain/Capacity.java`, `B/room/domain/RoomRegistry.java`, `B/common/error/ErrorCode.java`
- Test: `BT/room/domain/BotRoomTest.java`, `BT/room/domain/BotRoomRegistryTest.java`, `BT/room/domain/CapacityTest.java`(추가), `BT/game/bot/BotDifficultyTest.java`, `BT/common/error/BotErrorCodeTest.java`

**Interfaces:**
- Produces: `enum BotDifficulty { EASY, MEDIUM, HARD; static BotDifficulty parse(String raw) }`(모르는 값·null은 `INVALID_INPUT`).
- Produces: `record Participant(long memberId, String nickname, BotProfile bot)` + 기존 2인자 생성자(사람, `bot = null`), `static Participant bot(long botId, BotProfile profile)`, `boolean isBot()`, `boolean isHuman()`, `Participant withDifficulty(BotDifficulty)`.
- Produces: `record BotProfile(BotNumber number, BotDifficulty difficulty, Avatar avatar)`, `record BotNumber(int value)` + `static smallestFree(Collection<BotNumber>)`, `String nickname()`("컴퓨터 {n}").
- Produces: `Room.addBot(long requesterId, BotDifficulty difficulty, Avatar avatar): Participant`, `Room.changeBot(long requesterId, long botId, BotDifficulty difficulty)`, `Room.bots(): List<Participant>`, `Room.isBot(long)`, `Room.humanIds(): List<Long>`(사람 참가자), `Room.humanOccupantIds(): List<Long>`(사람 참가자 + 관전자), `Room.host(): Participant`, `Room.isEmpty()`(이제 "사람 참가자가 없음").
- Produces: `Capacity.grownFor(GameType type): Capacity`, `ErrorCode.BOT_NOT_FOUND`.

- [ ] **Step 1: 실패하는 테스트 작성**

`BT/game/bot/BotDifficultyTest.java`:

```java
package com.boardgame.game.bot;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import org.junit.jupiter.api.Test;

class BotDifficultyTest {

    @Test
    void R8_난이도_글자를_읽고_모르는_값은_INVALID_INPUT() {
        assertThat(BotDifficulty.parse("EASY")).isEqualTo(BotDifficulty.EASY);
        assertThat(BotDifficulty.parse("MEDIUM")).isEqualTo(BotDifficulty.MEDIUM);
        assertThat(BotDifficulty.parse("HARD")).isEqualTo(BotDifficulty.HARD);
        assertError(() -> BotDifficulty.parse("hard"), ErrorCode.INVALID_INPUT);
        assertError(() -> BotDifficulty.parse(null), ErrorCode.INVALID_INPUT);
    }
}
```

`BT/common/error/BotErrorCodeTest.java`:

```java
package com.boardgame.common.error;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;

class BotErrorCodeTest {

    @Test
    void BOT_NOT_FOUND는_404와_안내_문구다() {
        assertThat(ErrorCode.BOT_NOT_FOUND.status()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(ErrorCode.BOT_NOT_FOUND.message()).isEqualTo("컴퓨터를 찾을 수 없어요.");
    }
}
```

`BT/room/domain/CapacityTest.java` 끝(마지막 `}` 앞)에 추가(필요한 import: `com.boardgame.game.GameType`, `com.boardgame.common.error.ErrorCode`, `static com.boardgame.common.error.ErrorAssertions.assertError`, `static org.assertj.core.api.Assertions.assertThat` — 이미 있으면 그대로):

```java
    @Test
    void R9_게임_최대_인원보다_작으면_하나_늘리고_최대면_ROOM_FULL() {
        assertThat(Capacity.of(GameType.UNO, 4).grownFor(GameType.UNO)).isEqualTo(new Capacity(5));
        assertError(() -> Capacity.of(GameType.UNO, 5).grownFor(GameType.UNO), ErrorCode.ROOM_FULL);
        assertThat(Capacity.of(GameType.OLD_MAID, 5).grownFor(GameType.OLD_MAID)).isEqualTo(new Capacity(6));
    }
```

`BT/room/domain/BotRoomTest.java`:

```java
package com.boardgame.room.domain;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.GameType;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.member.domain.Avatar;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class BotRoomTest {

    private static final Instant NOW = Instant.parse("2026-10-08T10:00:00Z");
    private final Participant alice = new Participant(1L, "앨리스");
    private final Participant bob = new Participant(2L, "밥");

    private Room room(GameType type, int capacity) {
        RoomSettings settings = new RoomSettings(type, Capacity.of(type, capacity), RoomLock.open());
        return Room.open(new RoomProfile(new RoomCode("ABCDEF"), new RoomName("방"), settings), alice);
    }

    private Participant addBot(Room room, BotDifficulty difficulty) {
        return room.addBot(1L, difficulty, Avatar.CAT);
    }

    private void join(Room room, Participant participant) {
        room.join(participant, null, new FakeRoomPasswordHasher());
    }

    @Test
    void R2_R3_컴퓨터는_음수_번호와_컴퓨터_n_이름으로_앉는다() {
        Room room = room(GameType.UNO, 4);

        Participant first = addBot(room, BotDifficulty.EASY);
        Participant second = addBot(room, BotDifficulty.HARD);

        assertThat(first.memberId()).isEqualTo(-1L);
        assertThat(second.memberId()).isEqualTo(-2L);
        assertThat(first.nickname()).isEqualTo("컴퓨터 1");
        assertThat(second.nickname()).isEqualTo("컴퓨터 2");
        assertThat(second.isBot()).isTrue();
        assertThat(second.bot().difficulty()).isEqualTo(BotDifficulty.HARD);
        assertThat(second.bot().avatar()).isEqualTo(Avatar.CAT);
        assertThat(room.memberIds()).containsExactly(1L, -1L, -2L);
        assertThat(room.humanIds()).containsExactly(1L);
        assertThat(room.bots()).containsExactly(first, second);
        assertThat(room.isBot(-1L)).isTrue();
        assertThat(room.isBot(1L)).isFalse();
    }

    @Test
    void R2_R3_내보낸_번호는_다시_쓰지_않고_이름은_가장_작은_빈_번호를_쓴다() {
        Room room = room(GameType.UNO, 4);
        addBot(room, BotDifficulty.EASY);
        addBot(room, BotDifficulty.EASY);
        room.kick(1L, -1L);

        Participant third = addBot(room, BotDifficulty.MEDIUM);

        assertThat(third.memberId()).isEqualTo(-3L);
        assertThat(third.nickname()).isEqualTo("컴퓨터 1");
    }

    @Test
    void R8_방장만_대기_중에만_추가할_수_있다() {
        Room room = room(GameType.UNO, 4);
        join(room, bob);

        assertError(() -> room.addBot(2L, BotDifficulty.EASY, Avatar.CAT), ErrorCode.NOT_ROOM_HOST);
        assertError(() -> room.addBot(9L, BotDifficulty.EASY, Avatar.CAT), ErrorCode.NOT_IN_ROOM);
        room.setReady(2L, true);
        room.start(1L, FakeGameSession::new, "m", NOW);
        assertError(() -> addBot(room, BotDifficulty.EASY), ErrorCode.ROOM_ALREADY_PLAYING);
    }

    @Test
    void R9_꽉_차면_정원을_하나씩_늘려_앉히고_게임_최대_인원이면_ROOM_FULL() {
        Room room = room(GameType.UNO, 2);
        addBot(room, BotDifficulty.EASY);

        addBot(room, BotDifficulty.EASY);
        addBot(room, BotDifficulty.EASY);
        addBot(room, BotDifficulty.EASY);

        assertThat(room.capacity()).isEqualTo(5);
        assertThat(room.participants()).hasSize(5);
        assertError(() -> addBot(room, BotDifficulty.EASY), ErrorCode.ROOM_FULL);
        assertThat(room.capacity()).isEqualTo(5);
        assertThat(room.participants()).hasSize(5);
    }

    @Test
    void R10_난이도를_바꾸고_없는_컴퓨터나_사람이면_BOT_NOT_FOUND() {
        Room room = room(GameType.OLD_MAID, 6);
        join(room, bob);
        addBot(room, BotDifficulty.EASY);

        room.changeBot(1L, -1L, BotDifficulty.HARD);

        Participant changed = room.participants().get(2);
        assertThat(changed.bot().difficulty()).isEqualTo(BotDifficulty.HARD);
        assertThat(changed.nickname()).isEqualTo("컴퓨터 1");
        assertThat(changed.bot().avatar()).isEqualTo(Avatar.CAT);
        assertError(() -> room.changeBot(1L, -7L, BotDifficulty.EASY), ErrorCode.BOT_NOT_FOUND);
        assertError(() -> room.changeBot(1L, 2L, BotDifficulty.EASY), ErrorCode.BOT_NOT_FOUND);
        assertError(() -> room.changeBot(2L, -1L, BotDifficulty.EASY), ErrorCode.NOT_ROOM_HOST);
    }

    @Test
    void R11_방장은_컴퓨터를_내보낸다() {
        Room room = room(GameType.UNO, 4);
        addBot(room, BotDifficulty.EASY);

        room.kick(1L, -1L);

        assertThat(room.memberIds()).containsExactly(1L);
    }

    @Test
    void R5_R44_방장과_컴퓨터만_있어도_준비_없이_시작한다() {
        Room room = room(GameType.PAPER_SAFARI, 4);
        addBot(room, BotDifficulty.MEDIUM);

        room.start(1L, FakeGameSession::new, "m", NOW);

        assertThat(room.status()).isEqualTo(RoomStatus.PLAYING);
    }

    @Test
    void R5_사람_손님이_준비하지_않으면_컴퓨터가_있어도_시작할_수_없다() {
        Room room = room(GameType.PAPER_SAFARI, 4);
        addBot(room, BotDifficulty.MEDIUM);
        join(room, bob);

        assertError(() -> room.start(1L, FakeGameSession::new, "m", NOW), ErrorCode.PLAYERS_NOT_READY);
    }

    @Test
    void R12_방장이_나가면_컴퓨터를_건너뛰고_다음_사람이_방장이다() {
        Room room = room(GameType.UNO, 4);
        addBot(room, BotDifficulty.EASY);
        join(room, bob);

        room.leave(1L);

        assertThat(room.hostId()).isEqualTo(2L);
        assertThat(room.host()).isEqualTo(bob);
        assertThat(room.memberIds()).containsExactly(-1L, 2L);
    }

    @Test
    void R13_사람이_모두_나가면_컴퓨터가_남아도_빈_방이다() {
        Room room = room(GameType.UNO, 4);
        addBot(room, BotDifficulty.EASY);
        assertThat(room.isEmpty()).isFalse();

        room.leave(1L);

        assertThat(room.isEmpty()).isTrue();
        assertThat(room.memberIds()).containsExactly(-1L);
    }

    @Test
    void R14_컴퓨터를_포함한_인원보다_적게_줄일_수_없다() {
        Room room = room(GameType.UNO, 4);
        addBot(room, BotDifficulty.EASY);
        addBot(room, BotDifficulty.EASY);

        assertError(() -> room.reconfigure(1L, Capacity.of(GameType.UNO, 2), RoomTheme.WOOD),
                ErrorCode.CAPACITY_BELOW_PLAYERS);
    }

    @Test
    void R7_사람_방_사람_목록에_컴퓨터는_없고_관전자는_있다() {
        Room room = room(GameType.UNO, 2);
        join(room, bob);
        room.setReady(2L, true);
        room.start(1L, FakeGameSession::new, "m", NOW);
        room.watch(new Participant(3L, "캐롤"));

        assertThat(room.humanOccupantIds()).containsExactly(1L, 2L, 3L);
    }
}
```

`BT/room/domain/BotRoomRegistryTest.java`:

```java
package com.boardgame.room.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameType;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.member.domain.Avatar;
import org.junit.jupiter.api.Test;

class BotRoomRegistryTest {

    private Room roomWithBot() {
        RoomSettings settings = new RoomSettings(GameType.UNO, Capacity.max(GameType.UNO), RoomLock.open());
        Room room = Room.open(new RoomProfile(new RoomCode("ROBOTS"), new RoomName("방"), settings),
                new Participant(1L, "앨리스"));
        room.addBot(1L, BotDifficulty.EASY, Avatar.CAT);
        return room;
    }

    @Test
    void R7_회원의_방_찾기는_컴퓨터_번호를_무시한다() {
        RoomRegistry registry = new RoomRegistry();
        Room room = roomWithBot();

        registry.save(room);

        assertThat(registry.findByMember(1L)).contains(room);
        assertThat(registry.findByMember(-1L)).isEmpty();
    }

    @Test
    void R13_사람이_모두_나가면_컴퓨터가_남아도_방을_지운다() {
        RoomRegistry registry = new RoomRegistry();
        Room room = roomWithBot();
        registry.save(room);

        room.leave(1L);
        registry.save(room);

        assertThat(registry.exists(room.code())).isFalse();
        assertThat(registry.findByMember(1L)).isEmpty();
    }
}
```

- [ ] **Step 2: 실패 확인**

Run: `cd backend && mvn -q test -Dtest='BotRoomTest,BotRoomRegistryTest,CapacityTest,BotDifficultyTest,BotErrorCodeTest'`
Expected: 컴파일 실패(`BotDifficulty`, `Room.addBot`, `ErrorCode.BOT_NOT_FOUND`, `Capacity.grownFor` 없음).

- [ ] **Step 3: 구현**

`B/game/bot/BotDifficulty.java`:

```java
package com.boardgame.game.bot;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import java.util.Arrays;

// R3·R8: 컴퓨터 난이도. 화면 표기는 하·중·상.
public enum BotDifficulty {
    EASY, MEDIUM, HARD;

    public static BotDifficulty parse(String raw) {
        return Arrays.stream(values())
                .filter(difficulty -> difficulty.name().equals(raw))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_INPUT));
    }
}
```

`B/room/domain/BotNumber.java`:

```java
package com.boardgame.room.domain;

import java.util.Collection;
import java.util.stream.IntStream;

// R3: 컴퓨터 이름 번호. 방에 지금 앉아 있는 컴퓨터 중 가장 작은 빈 번호(1부터)를 쓴다.
public record BotNumber(int value) {

    private static final String NAME_PREFIX = "컴퓨터 ";

    public static BotNumber smallestFree(Collection<BotNumber> taken) {
        return IntStream.iterate(1, number -> number + 1)
                .mapToObj(BotNumber::new)
                .filter(number -> !taken.contains(number))
                .findFirst()
                .orElseThrow();
    }

    public String nickname() {
        return NAME_PREFIX + value;
    }
}
```

`B/room/domain/BotProfile.java`:

```java
package com.boardgame.room.domain;

import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.member.domain.Avatar;

// R1·R3·R4: 방 안에서만 사는 컴퓨터의 이름 번호·난이도·프로필 그림. 회원 테이블과 상관없다.
public record BotProfile(BotNumber number, BotDifficulty difficulty, Avatar avatar) {

    public BotProfile withDifficulty(BotDifficulty changed) {
        return new BotProfile(number, changed, avatar);
    }
}
```

`B/room/domain/BotIds.java`:

```java
package com.boardgame.room.domain;

// R2: 방마다 -1, -2, … 로 센다. 내보낸 컴퓨터의 번호는 다시 쓰지 않는다(화면 애니메이션·키 충돌 방지).
public class BotIds {

    private long last;

    public long next() {
        last--;
        return last;
    }
}
```

`B/room/domain/Participant.java` 전체:

```java
package com.boardgame.room.domain;

import com.boardgame.game.bot.BotDifficulty;

// 방 참가자. bot이 null이면 사람(회원), 있으면 컴퓨터(R1, 음수 번호).
public record Participant(long memberId, String nickname, BotProfile bot) {

    public Participant(long memberId, String nickname) {
        this(memberId, nickname, null);
    }

    public static Participant bot(long botId, BotProfile profile) {
        BotNumber number = profile.number();
        return new Participant(botId, number.nickname(), profile);
    }

    public boolean isBot() {
        return bot != null;
    }

    public boolean isHuman() {
        return bot == null;
    }

    public Participant withDifficulty(BotDifficulty difficulty) {
        return new Participant(memberId, nickname, bot.withDifficulty(difficulty));
    }
}
```

`B/room/domain/RoomMembers.java` 전체:

```java
package com.boardgame.room.domain;

import com.boardgame.common.error.BusinessException;
import com.boardgame.common.error.ErrorCode;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.member.domain.Avatar;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;
import java.util.stream.Stream;

public class RoomMembers {

    private final List<Participant> members = new ArrayList<>();
    private final ReadyMembers ready = new ReadyMembers();
    private final BotIds botIds = new BotIds();

    public void add(Participant participant, Capacity capacity) {
        if (contains(participant.memberId())) {
            return;
        }
        if (capacity.isFull(members.size())) {
            throw new BusinessException(ErrorCode.ROOM_FULL);
        }
        members.add(participant);
    }

    /** R2·R3: 다음 음수 번호와 가장 작은 빈 이름 번호로 컴퓨터를 앉힌다. */
    public Participant addBot(BotDifficulty difficulty, Avatar avatar, Capacity capacity) {
        BotProfile profile = new BotProfile(BotNumber.smallestFree(botNumbers()), difficulty, avatar);
        Participant bot = Participant.bot(botIds.next(), profile);
        add(bot, capacity);
        return bot;
    }

    /** R10: 앉아 있는 컴퓨터의 난이도만 바꾼다. 없거나 사람이면 BOT_NOT_FOUND. */
    public void changeBot(long botId, BotDifficulty difficulty) {
        int index = botIndexOf(botId);
        Participant bot = members.get(index);
        members.set(index, bot.withDifficulty(difficulty));
    }

    public void remove(long memberId) {
        boolean wasHost = isHost(memberId);
        members.removeIf(member -> member.memberId() == memberId);
        ready.unmark(memberId);
        if (wasHost) {
            ready.clear();
        }
    }

    public void setReady(long memberId, boolean value) {
        if (!value) {
            ready.unmark(memberId);
            return;
        }
        ready.mark(memberId);
    }

    // R5: 컴퓨터는 늘 준비된 것으로 본다. 사람 손님만 확인한다.
    public boolean everyGuestReady() {
        return ready.containsAll(guestIds());
    }

    public void clearReady() {
        ready.clear();
    }

    public List<Long> readyIds() {
        return ready.asList();
    }

    private List<Long> guestIds() {
        long hostId = hostId();
        return humans()
                .map(Participant::memberId)
                .filter(id -> id != hostId)
                .toList();
    }

    public boolean contains(long memberId) {
        return members.stream().anyMatch(member -> member.memberId() == memberId);
    }

    public void requireMember(long memberId) {
        if (!contains(memberId)) {
            throw new BusinessException(ErrorCode.NOT_IN_ROOM);
        }
    }

    // R12: 방장은 들어온 순서로 첫 사람이다(컴퓨터는 건너뛴다).
    public Participant host() {
        return humans()
                .findFirst()
                .orElseThrow(() -> new IllegalStateException("사람이 없는 방에는 방장이 없다"));
    }

    public long hostId() {
        return host().memberId();
    }

    public boolean isHost(long memberId) {
        return hasHumans() && hostId() == memberId;
    }

    public boolean hasHumans() {
        return humans().findAny().isPresent();
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

    public List<Long> humanIds() {
        return humans()
                .map(Participant::memberId)
                .toList();
    }

    public List<Participant> bots() {
        return members.stream()
                .filter(Participant::isBot)
                .toList();
    }

    public boolean isBot(long memberId) {
        return bots().stream().anyMatch(bot -> bot.memberId() == memberId);
    }

    public List<Participant> asList() {
        return List.copyOf(members);
    }

    private Stream<Participant> humans() {
        return members.stream().filter(Participant::isHuman);
    }

    private List<BotNumber> botNumbers() {
        return bots().stream()
                .map(Participant::bot)
                .map(BotProfile::number)
                .toList();
    }

    private int botIndexOf(long botId) {
        return IntStream.range(0, members.size())
                .filter(index -> isBotAt(index, botId))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.BOT_NOT_FOUND));
    }

    private boolean isBotAt(int index, long botId) {
        Participant member = members.get(index);
        return member.memberId() == botId && member.isBot();
    }
}
```

`B/room/domain/RoomOccupants.java`: import `com.boardgame.game.bot.BotDifficulty`, `com.boardgame.member.domain.Avatar`를 더하고, 클래스 끝(마지막 `}` 앞)에 추가:

```java
    public Participant addBot(BotDifficulty difficulty, Avatar avatar, Capacity capacity) {
        return players.addBot(difficulty, avatar, capacity);
    }

    public void changeBot(long botId, BotDifficulty difficulty) {
        players.changeBot(botId, difficulty);
    }

    // R13: 사람 참가자가 한 명도 없으면 컴퓨터·관전자가 남아도 빈 방이다.
    public boolean hasNoHumanPlayers() {
        return !players.hasHumans();
    }

    public boolean hasBots() {
        return !players.bots().isEmpty();
    }

    public List<Participant> bots() {
        return players.bots();
    }

    public boolean isBot(long memberId) {
        return players.isBot(memberId);
    }

    public Participant host() {
        return players.host();
    }

    public List<Long> humanPlayerIds() {
        return players.humanIds();
    }

    public List<Long> humanOccupantIds() {
        return Stream.concat(players.humanIds().stream(), spectators.ids().stream()).toList();
    }
```

`B/room/domain/Capacity.java` 끝(마지막 `}` 앞)에 추가:

```java
    /** R9: 게임 최대 인원보다 작으면 1 늘린다. 이미 최대면 ROOM_FULL. */
    public Capacity grownFor(GameType type) {
        if (value >= type.maxPlayers()) {
            throw new BusinessException(ErrorCode.ROOM_FULL);
        }
        return new Capacity(value + 1);
    }
```

`B/room/domain/Room.java`:
- import 추가: `com.boardgame.game.bot.BotDifficulty`, `com.boardgame.member.domain.Avatar`.
- `kick` 메서드 바로 아래에 추가:

```java
    /** R8·R9: 방장이 대기 중에 컴퓨터를 앉힌다. 꽉 찼으면 게임 최대 인원까지 정원을 1 늘린다(D3). */
    public Participant addBot(long requesterId, BotDifficulty difficulty, Avatar avatar) {
        requireHost(requesterId);
        requireWaiting();
        makeSeatForBot();
        return occupants.addBot(difficulty, avatar, profile.capacity());
    }

    /** R10: 대기 중에 방장이 앉아 있는 컴퓨터의 난이도를 바꾼다. */
    public void changeBot(long requesterId, long botId, BotDifficulty difficulty) {
        requireHost(requesterId);
        requireWaiting();
        occupants.changeBot(botId, difficulty);
    }

    private void makeSeatForBot() {
        Capacity capacity = profile.capacity();
        if (!capacity.isFull(occupants.playerCount())) {
            return;
        }
        profile = profile.reconfigured(capacity.grownFor(gameType()), theme());
    }
```

- `isEmpty()`를 바꾼다:

```java
    // R13: 사람 참가자가 없으면 빈 방이다(컴퓨터·관전자만 남아도 닫는다, D6).
    public boolean isEmpty() {
        return occupants.hasNoHumanPlayers();
    }
```

- `hostId()` 아래에 추가:

```java
    public Participant host() {
        return occupants.host();
    }

    public List<Participant> bots() {
        return occupants.bots();
    }

    public boolean isBot(long memberId) {
        return occupants.isBot(memberId);
    }

    /** 사람 참가자(R6: 접속 기준점·연결 끊김 기권 대상). */
    public List<Long> humanIds() {
        return occupants.humanPlayerIds();
    }

    /** 사람 참가자와 관전자(R7: 회원 방 찾기, R16: 화면을 받는 사람). */
    public List<Long> humanOccupantIds() {
        return occupants.humanOccupantIds();
    }
```

`B/room/domain/RoomRegistry.java`의 `save`에서 `room.occupantIds().forEach(...)` 줄을 바꾼다:

```java
        // R7: 회원 방 찾기는 사람만 기억한다(컴퓨터 번호는 음수라 회원과 겹치지 않지만 넣지 않는다).
        room.humanOccupantIds().forEach(memberId -> memberRooms.put(memberId, code));
```

`B/common/error/ErrorCode.java`: `NOT_SPECTATOR(...)` 줄 바로 아래에 추가:

```java
    BOT_NOT_FOUND(HttpStatus.NOT_FOUND, "컴퓨터를 찾을 수 없어요."),
```

- [ ] **Step 4: 통과 확인**

Run: `cd backend && mvn -q test -Dtest='BotRoomTest,BotRoomRegistryTest,CapacityTest,BotDifficultyTest,BotErrorCodeTest,RoomTest,RoomRegistryTest'`
Expected: PASS.
Run: `cd backend && mvn -q test`
Expected: PASS(기존 테스트 모두 그대로).

- [ ] **Step 5: 커밋**

```bash
git add backend/src/main/java/com/boardgame/game/bot/BotDifficulty.java \
  backend/src/main/java/com/boardgame/room/domain/BotNumber.java backend/src/main/java/com/boardgame/room/domain/BotProfile.java \
  backend/src/main/java/com/boardgame/room/domain/BotIds.java backend/src/main/java/com/boardgame/room/domain/Participant.java \
  backend/src/main/java/com/boardgame/room/domain/RoomMembers.java backend/src/main/java/com/boardgame/room/domain/RoomOccupants.java \
  backend/src/main/java/com/boardgame/room/domain/Room.java backend/src/main/java/com/boardgame/room/domain/Capacity.java \
  backend/src/main/java/com/boardgame/room/domain/RoomRegistry.java backend/src/main/java/com/boardgame/common/error/ErrorCode.java \
  backend/src/test/java/com/boardgame/room/domain/BotRoomTest.java backend/src/test/java/com/boardgame/room/domain/BotRoomRegistryTest.java \
  backend/src/test/java/com/boardgame/room/domain/CapacityTest.java backend/src/test/java/com/boardgame/game/bot/BotDifficultyTest.java \
  backend/src/test/java/com/boardgame/common/error/BotErrorCodeTest.java
git commit -m "$(cat <<'EOF'
feat: 방에 컴퓨터 참가자 추가 - 음수 번호·컴퓨터 n 이름·난이도 바꾸기·정원 자동 늘리기·항상 준비·사람만 방장·사람 없으면 빈 방

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: 방 서비스·API — 컴퓨터 추가/바꾸기 엔드포인트, 겹치지 않는 그림, 연결 처리 제외, 응답 필드

**Files:**
- Create: `B/room/domain/AvatarDraw.java`, `B/room/api/BotDifficultyRequest.java`
- Modify: `B/room/application/RoomService.java`, `B/room/api/RoomController.java`, `B/room/api/RoomMemberResponse.java`, `B/room/api/RoomResponse.java`, `B/room/api/RoomSummaryResponse.java`
- Test: `BT/room/domain/AvatarDrawTest.java`, `BT/room/application/RoomServiceBotTest.java`, `BT/room/api/BotRoomApiTest.java`

**Interfaces:**
- Consumes: Task 1의 `Room.addBot/changeBot/bots/isBot/humanIds/humanOccupantIds/host`, `BotDifficulty.parse`, `BotProfile`.
- Produces: `POST /api/rooms/{code}/bots` 본문 `{"difficulty":"EASY|MEDIUM|HARD"}` → `RoomResponse`; `PATCH /api/rooms/{code}/bots/{botId}` 같은 본문 → `RoomResponse`. 기존 `POST /api/rooms/{code}/members/{id}/kick`이 컴퓨터에도 동작.
- Produces: `RoomService.addBot(String rawCode, long requesterId, BotDifficultyRequest request): RoomResponse`, `RoomService.changeBot(String rawCode, long requesterId, long botId, BotDifficultyRequest request): RoomResponse`.
- Produces: `record RoomMemberResponse(long id, String nickname, String avatar, boolean host, boolean connected, long offlineSeconds, boolean ready, boolean bot, BotDifficulty difficulty)`(사람은 `bot=false`, `difficulty=null`; 컴퓨터는 `connected=true`, `offlineSeconds=0`, `ready=true`, `host=false`). 프론트 Task 10이 `bot`·`difficulty`를 읽는다.
- Produces: `AvatarDraw.pick(Set<Avatar> taken, Random random): Avatar`.

- [ ] **Step 1: 실패하는 테스트 작성**

`BT/room/domain/AvatarDrawTest.java`:

```java
package com.boardgame.room.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.member.domain.Avatar;
import com.boardgame.support.FixedRandom;
import java.util.EnumSet;
import java.util.Set;
import org.junit.jupiter.api.Test;

class AvatarDrawTest {

    @Test
    void R4_방_안_다른_사람과_겹치지_않는_그림을_무작위로_고른다() {
        Set<Avatar> taken = EnumSet.of(Avatar.CAT, Avatar.DOG);

        assertThat(AvatarDraw.pick(taken, new FixedRandom(0))).isEqualTo(Avatar.RABBIT);
        assertThat(AvatarDraw.pick(taken, new FixedRandom(9))).isEqualTo(Avatar.PENGUIN);
    }

    @Test
    void R4_모두_겹치면_아무거나_고른다() {
        Set<Avatar> taken = EnumSet.allOf(Avatar.class);

        assertThat(AvatarDraw.pick(taken, new FixedRandom(1))).isEqualTo(Avatar.DOG);
    }
}
```

`BT/room/application/RoomServiceBotTest.java`:

```java
package com.boardgame.room.application;

import static com.boardgame.common.error.ErrorAssertions.assertError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.boardgame.common.error.ErrorCode;
import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameSessionFactories;
import com.boardgame.game.GameType;
import com.boardgame.member.domain.Avatar;
import com.boardgame.papersafari.PaperSafariSessionFactory;
import com.boardgame.room.api.BotDifficultyRequest;
import com.boardgame.room.api.CreateRoomRequest;
import com.boardgame.room.api.RoomMemberResponse;
import com.boardgame.room.api.RoomResponse;
import com.boardgame.room.api.RoomSummaryResponse;
import com.boardgame.room.domain.FakeRoomPasswordHasher;
import com.boardgame.room.domain.RoomClosedEvent;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomRegistry;
import com.boardgame.support.FakeTaskScheduler;
import com.boardgame.support.FixedRandom;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

class RoomServiceBotTest {

    private static final String CODE = "ROBOTS";
    private static final RoomCode ROOM_CODE = new RoomCode(CODE);
    private static final long HOST = 1L;
    private static final long BOT = -1L;
    private static final Instant T0 = Instant.parse("2026-10-08T00:00:00Z");

    private final MutableClock clock = new MutableClock(T0);
    private final RoomRegistry registry = new RoomRegistry();
    private final RoomNotifier notifier = mock(RoomNotifier.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final PresenceTracker presence = new PresenceTracker();
    private final RoomService service = new RoomService(registry, () -> ROOM_CODE,
            new GameSessionFactories(List.of(new PaperSafariSessionFactory(clock))), notifier,
            new OutcomePublisher(events), events, clock, presence, new FakeRoomPasswordHasher(),
            new TurnTimer(new FakeTaskScheduler()), new FixedRandom(0), new RoomAvatars(Avatar::defaultFor));

    @BeforeEach
    void openRoom() {
        service.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("방", GameType.PAPER_SAFARI, 4, null));
        presence.connected(HOST, "session-1");
    }

    private RoomResponse addBot(String difficulty) {
        return service.addBot(CODE, HOST, new BotDifficultyRequest(difficulty));
    }

    @Test
    void R4_R15_프로필_그림은_방_안_다른_사람과_겹치지_않게_고르고_응답에_컴퓨터로_나온다() {
        addBot("EASY");

        RoomResponse response = addBot("HARD");

        assertThat(response.members()).extracting(RoomMemberResponse::avatar).containsExactly("DOG", "CAT", "RABBIT");
        RoomMemberResponse bot = response.members().get(2);
        assertThat(bot.id()).isEqualTo(-2L);
        assertThat(bot.nickname()).isEqualTo("컴퓨터 2");
        assertThat(bot.bot()).isTrue();
        assertThat(bot.difficulty()).isEqualTo(com.boardgame.game.bot.BotDifficulty.HARD);
        assertThat(bot.ready()).isTrue();
        assertThat(bot.connected()).isTrue();
        assertThat(bot.offlineSeconds()).isZero();
        assertThat(bot.host()).isFalse();
        assertThat(response.members().get(0).bot()).isFalse();
        assertThat(response.members().get(0).difficulty()).isNull();
    }

    @Test
    void R8_R10_잘못된_난이도와_없는_본문은_INVALID_INPUT이고_없는_컴퓨터는_BOT_NOT_FOUND() {
        addBot("EASY");

        assertError(() -> addBot("SUPER"), ErrorCode.INVALID_INPUT);
        assertError(() -> service.addBot(CODE, HOST, null), ErrorCode.INVALID_INPUT);
        assertError(() -> service.changeBot(CODE, HOST, -9L, new BotDifficultyRequest("HARD")), ErrorCode.BOT_NOT_FOUND);

        RoomResponse changed = service.changeBot(CODE, HOST, BOT, new BotDifficultyRequest("HARD"));
        assertThat(changed.members().get(1).difficulty()).isEqualTo(com.boardgame.game.bot.BotDifficulty.HARD);
    }

    @Test
    void R6_오래_끊긴_사람을_찾는_확인은_컴퓨터를_기권시키지_않는다() {
        addBot("EASY");
        service.start(CODE, HOST);
        clock.advance(Duration.ofSeconds(120));

        service.forfeitLongDisconnected();

        assertThat(registry.get(ROOM_CODE).isPlaying(BOT)).isTrue();
    }

    @Test
    void R6_컴퓨터는_손으로_기권시킬_수_없다() {
        addBot("EASY");
        service.start(CODE, HOST);
        clock.advance(Duration.ofSeconds(120));

        assertError(() -> service.forfeitDisconnected(CODE, HOST, BOT), ErrorCode.INVALID_INPUT);
    }

    @Test
    void R13_게임_중_마지막_사람이_나가면_방을_닫는다() {
        addBot("EASY");
        service.start(CODE, HOST);

        service.leave(CODE, HOST);

        assertThat(registry.find(ROOM_CODE)).isEmpty();
        verify(events).publishEvent(new RoomClosedEvent(CODE));
    }

    @Test
    void R16_방송은_컴퓨터에게_화면을_보내지_않는다() {
        addBot("EASY");
        clearInvocations(notifier);

        service.start(CODE, HOST);

        verify(notifier).gameUpdated(eq(HOST), any());
        verify(notifier, never()).gameUpdated(eq(BOT), any());
    }

    @Test
    void R12_방_목록의_방장_이름은_컴퓨터가_아니라_첫_사람이다() {
        addBot("EASY");
        service.join(CODE, new LoginMember(2L, "밥"), null);
        service.leave(CODE, HOST);

        RoomSummaryResponse summary = service.rooms(GameType.PAPER_SAFARI).get(0);

        assertThat(summary.hostNickname()).isEqualTo("밥");
        assertThat(summary.playerCount()).isEqualTo(2);
    }
}
```

`BT/room/api/BotRoomApiTest.java`:

```java
package com.boardgame.room.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

@SpringBootTest
@AutoConfigureMockMvc
class BotRoomApiTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private RoomNotifier notifier;

    private String createRoom(User host, String gameType, int maxPlayers) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name": "컴퓨터 방", "gameType": "%s", "maxPlayers": %d}
                                """.formatted(gameType, maxPlayers)))
                .andExpect(status().isCreated())
                .andReturn();
        return JsonPath.read(result.getResponse().getContentAsString(), "$.code");
    }

    private ResultActions addBot(User user, String code, String difficulty) throws Exception {
        return mockMvc.perform(post("/api/rooms/" + code + "/bots").session(user.session())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"difficulty": "%s"}
                        """.formatted(difficulty)));
    }

    private ResultActions changeBot(User user, String code, long botId, String difficulty) throws Exception {
        return mockMvc.perform(patch("/api/rooms/" + code + "/bots/" + botId).session(user.session())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"difficulty": "%s"}
                        """.formatted(difficulty)));
    }

    @Test
    void R8_R15_방장이_컴퓨터를_추가하면_방_응답에_컴퓨터로_나온다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = createRoom(host, "UNO", 4);

        addBot(host, code, "HARD")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.members[1].id").value(-1))
                .andExpect(jsonPath("$.members[1].nickname").value("컴퓨터 1"))
                .andExpect(jsonPath("$.members[1].bot").value(true))
                .andExpect(jsonPath("$.members[1].difficulty").value("HARD"))
                .andExpect(jsonPath("$.members[1].ready").value(true))
                .andExpect(jsonPath("$.members[1].connected").value(true))
                .andExpect(jsonPath("$.members[1].host").value(false))
                .andExpect(jsonPath("$.members[0].bot").value(false))
                .andExpect(jsonPath("$.members[0].difficulty").doesNotExist());
    }

    @Test
    void R8_방장이_아니면_403_참가자가_아니면_403_잘못된_난이도는_400() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User guest = ApiUsers.create(mockMvc);
        User stranger = ApiUsers.create(mockMvc);
        String code = createRoom(host, "UNO", 4);
        mockMvc.perform(post("/api/rooms/" + code + "/join").session(guest.session())).andExpect(status().isOk());

        addBot(guest, code, "EASY").andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_ROOM_HOST"));
        addBot(stranger, code, "EASY").andExpect(status().isForbidden())
                .andExpect(jsonPath("$.code").value("NOT_IN_ROOM"));
        addBot(host, code, "NORMAL").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_INPUT"));
    }

    @Test
    void R9_꽉_차면_정원이_늘고_게임_최대_인원이면_409_ROOM_FULL() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = createRoom(host, "PAPER_SAFARI", 2);

        addBot(host, code, "EASY").andExpect(jsonPath("$.maxPlayers").value(2));
        addBot(host, code, "EASY").andExpect(jsonPath("$.maxPlayers").value(3));
        addBot(host, code, "EASY").andExpect(jsonPath("$.maxPlayers").value(4));
        addBot(host, code, "EASY").andExpect(jsonPath("$.maxPlayers").value(5));
        addBot(host, code, "EASY").andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ROOM_FULL"));
    }

    @Test
    void R10_R11_난이도를_바꾸고_없으면_404_내보내기도_된다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = createRoom(host, "OLD_MAID", 6);
        addBot(host, code, "EASY");

        changeBot(host, code, -1, "MEDIUM").andExpect(status().isOk())
                .andExpect(jsonPath("$.members[1].difficulty").value("MEDIUM"));
        changeBot(host, code, -5, "MEDIUM").andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("BOT_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("컴퓨터를 찾을 수 없어요."));
        mockMvc.perform(post("/api/rooms/" + code + "/members/-1/kick").session(host.session()))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/rooms/" + code).session(host.session()))
                .andExpect(jsonPath("$.members.length()").value(1));
    }

    @Test
    void R44_방장과_컴퓨터만으로_시작하고_게임_중에는_추가_바꾸기가_409() throws Exception {
        User host = ApiUsers.create(mockMvc);
        String code = createRoom(host, "PAPER_SAFARI", 4);
        addBot(host, code, "EASY");

        mockMvc.perform(post("/api/rooms/" + code + "/start").session(host.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PLAYING"));
        addBot(host, code, "EASY").andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ROOM_ALREADY_PLAYING"));
        changeBot(host, code, -1, "HARD").andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("ROOM_ALREADY_PLAYING"));
    }

    @Test
    void R13_사람이_모두_나가면_방이_사라진다() throws Exception {
        User host = ApiUsers.create(mockMvc);
        User other = ApiUsers.create(mockMvc);
        String code = createRoom(host, "UNO", 4);
        addBot(host, code, "EASY");

        mockMvc.perform(post("/api/rooms/" + code + "/leave").session(host.session()))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/rooms/" + code).session(other.session()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("ROOM_NOT_FOUND"));
        mockMvc.perform(get("/api/rooms/me").session(host.session()))
                .andExpect(status().isNoContent());
    }
}
```

- [ ] **Step 2: 실패 확인**

Run: `cd backend && mvn -q test -Dtest='AvatarDrawTest,RoomServiceBotTest,BotRoomApiTest'`
Expected: 컴파일 실패(`AvatarDraw`, `BotDifficultyRequest`, `RoomService.addBot` 없음).

- [ ] **Step 3: 구현**

`B/room/domain/AvatarDraw.java`:

```java
package com.boardgame.room.domain;

import com.boardgame.member.domain.Avatar;
import java.util.Arrays;
import java.util.List;
import java.util.Random;
import java.util.Set;

// R4: 방 안 다른 참가자와 겹치지 않는 그림을 무작위로 고른다. 모두 겹치면 12종 중 아무거나.
public final class AvatarDraw {

    private AvatarDraw() {
    }

    public static Avatar pick(Set<Avatar> taken, Random random) {
        List<Avatar> pool = freeOf(taken);
        return pool.get(random.nextInt(pool.size()));
    }

    private static List<Avatar> freeOf(Set<Avatar> taken) {
        List<Avatar> free = Arrays.stream(Avatar.values())
                .filter(avatar -> !taken.contains(avatar))
                .toList();
        if (free.isEmpty()) {
            return List.of(Avatar.values());
        }
        return free;
    }
}
```

`B/room/api/BotDifficultyRequest.java`:

```java
package com.boardgame.room.api;

// R8·R10: 컴퓨터 추가·난이도 바꾸기 본문. difficulty = "EASY" | "MEDIUM" | "HARD".
public record BotDifficultyRequest(String difficulty) {
}
```

`B/room/api/RoomMemberResponse.java` 전체:

```java
package com.boardgame.room.api;

import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.room.domain.BotProfile;
import com.boardgame.room.domain.Participant;

// R15: bot·difficulty를 더했다(사람은 false·null). 기존 필드는 그대로.
public record RoomMemberResponse(long id, String nickname, String avatar, boolean host, boolean connected,
                                 long offlineSeconds, boolean ready, boolean bot, BotDifficulty difficulty) {

    public static RoomMemberResponse human(long id, String nickname, String avatar, boolean host, boolean connected,
                                           long offlineSeconds, boolean ready) {
        return new RoomMemberResponse(id, nickname, avatar, host, connected, offlineSeconds, ready, false, null);
    }

    // R5·R6: 컴퓨터는 늘 연결·준비된 것으로 보이고 방장이 아니다(R12).
    public static RoomMemberResponse bot(Participant bot) {
        BotProfile profile = bot.bot();
        String avatar = profile.avatar().key();
        return new RoomMemberResponse(bot.memberId(), bot.nickname(), avatar, false, true, 0, true, true,
                profile.difficulty());
    }
}
```

`B/room/api/RoomResponse.java`의 `member(...)` 메서드를 바꾼다:

```java
    private static RoomMemberResponse member(Participant participant, long hostId, List<Long> readyIds,
                                             PresenceTracker presence, Instant now, AvatarBook avatars) {
        if (participant.isBot()) {
            return RoomMemberResponse.bot(participant);
        }
        long memberId = participant.memberId();
        long offlineSeconds = presence.offlineFor(memberId, now).toSeconds();
        return RoomMemberResponse.human(memberId, participant.nickname(), avatars.keyOf(memberId), memberId == hostId,
                presence.isConnected(memberId), offlineSeconds, readyIds.contains(memberId));
    }
```

`B/room/api/RoomSummaryResponse.java`의 `from`에서 `Participant host = participants.get(0);`를 바꾼다:

```java
        // R12: 방장은 첫 사람이다(컴퓨터가 먼저 앉아 있어도).
        Participant host = room.host();
```

`B/room/api/RoomController.java`: `kick` 메서드 아래에 추가:

```java
    @PostMapping("/{code}/bots")
    public RoomResponse addBot(@PathVariable String code, @AuthenticationPrincipal LoginMember member,
                               @RequestBody(required = false) BotDifficultyRequest request) {
        return roomService.addBot(code, member.id(), request);
    }

    @PatchMapping("/{code}/bots/{botId}")
    public RoomResponse changeBot(@PathVariable String code, @PathVariable long botId,
                                  @AuthenticationPrincipal LoginMember member,
                                  @RequestBody(required = false) BotDifficultyRequest request) {
        return roomService.changeBot(code, member.id(), botId, request);
    }
```

`B/room/application/RoomService.java`:
- import 추가: `com.boardgame.game.bot.BotDifficulty`, `com.boardgame.member.domain.AvatarBook`, `com.boardgame.room.api.BotDifficultyRequest`, `com.boardgame.room.domain.AvatarDraw`, `com.boardgame.room.domain.BotProfile`, `java.util.Set`, `java.util.stream.Collectors`.
- `open`, `admit`, `seat`, `start`의 `presence.baseline(room.memberIds(), clock.instant());`를 모두 `presence.baseline(room.humanIds(), clock.instant());`로 바꾼다(R6).
- `baselineNewcomers`를 바꾼다:

```java
    // 게임이 끝나 자동으로 참가한 관전자도 기권 유예 시간을 잴 수 있게 기준 시각을 둔다. R6: 컴퓨터는 빼고 사람만.
    private void baselineNewcomers(Room room, List<Long> before) {
        List<Long> newcomers = room.humanIds().stream()
                .filter(id -> !before.contains(id))
                .toList();
        presence.baseline(newcomers, clock.instant());
    }
```

- `forfeitDisconnected`에서 `if (requesterId == targetId) {...}` 블록 바로 아래에 추가:

```java
        // R6: 컴퓨터는 연결 끊김 기권 대상이 아니다.
        if (room.isBot(targetId)) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
```

- `longDisconnected`의 `room.memberIds()`를 `room.humanIds()`로 바꾼다.
- `sendSignal`의 `room.occupantIds()`를 `room.humanOccupantIds()`로 바꾼다.
- `broadcast`의 `room.occupantIds().forEach(memberId -> sendView(room, memberId));`를 `room.humanOccupantIds().forEach(memberId -> sendView(room, memberId));`로 바꾼다(R16: 컴퓨터는 STOMP 화면을 받지 않는다).
- `kick` 메서드 아래에 추가:

```java
    // R8·R9·R4: 방장이 대기 중에 컴퓨터를 앉힌다. 그림은 방 안 다른 사람과 겹치지 않게 고른다.
    public synchronized RoomResponse addBot(String rawCode, long requesterId, BotDifficultyRequest request) {
        BotDifficulty difficulty = BotDifficulty.parse(requireDifficulty(request));
        Room room = find(rawCode);
        room.addBot(requesterId, difficulty, botAvatarFor(room));
        saveAndNotifyClosed(room);
        return broadcast(room);
    }

    // R10: 방장이 대기 중에 앉아 있는 컴퓨터의 난이도를 바꾼다.
    public synchronized RoomResponse changeBot(String rawCode, long requesterId, long botId,
                                               BotDifficultyRequest request) {
        BotDifficulty difficulty = BotDifficulty.parse(requireDifficulty(request));
        Room room = find(rawCode);
        room.changeBot(requesterId, botId, difficulty);
        saveAndNotifyClosed(room);
        return broadcast(room);
    }

    private String requireDifficulty(BotDifficultyRequest request) {
        if (request == null) {
            throw new BusinessException(ErrorCode.INVALID_INPUT);
        }
        return request.difficulty();
    }

    // R4: 사람의 그림(메모리)과 앉은 컴퓨터의 그림을 피해 고른다.
    private Avatar botAvatarFor(Room room) {
        List<Long> humans = room.humanOccupantIds();
        AvatarBook book = avatars.bookOf(humans);
        Stream<Avatar> humanAvatars = humans.stream()
                .map(book::keyOf)
                .map(Avatar::parse);
        Stream<Avatar> botAvatars = room.bots().stream()
                .map(Participant::bot)
                .map(BotProfile::avatar);
        Set<Avatar> taken = Stream.concat(humanAvatars, botAvatars).collect(Collectors.toSet());
        return AvatarDraw.pick(taken, random);
    }
```

- [ ] **Step 4: 통과 확인**

Run: `cd backend && mvn -q test -Dtest='AvatarDrawTest,RoomServiceBotTest,BotRoomApiTest,RoomApiTest,DisconnectForfeitApiTest,RoomForfeitApiTest'`
Expected: PASS.
Run: `cd backend && mvn -q test`
Expected: PASS. (`BotRoomApiTest.R44_...`는 시작 이벤트가 음수 번호로 전적 기록을 시도해 로그에 "전적 기록에 실패했습니다"가 찍힐 수 있다. `RecordEventListener`가 삼키므로 테스트는 통과하고, Task 3에서 사라진다.)

- [ ] **Step 5: 커밋**

```bash
git add backend/src/main/java/com/boardgame/room/domain/AvatarDraw.java backend/src/main/java/com/boardgame/room/api/BotDifficultyRequest.java \
  backend/src/main/java/com/boardgame/room/api/RoomMemberResponse.java backend/src/main/java/com/boardgame/room/api/RoomResponse.java \
  backend/src/main/java/com/boardgame/room/api/RoomSummaryResponse.java backend/src/main/java/com/boardgame/room/api/RoomController.java \
  backend/src/main/java/com/boardgame/room/application/RoomService.java \
  backend/src/test/java/com/boardgame/room/domain/AvatarDrawTest.java backend/src/test/java/com/boardgame/room/application/RoomServiceBotTest.java \
  backend/src/test/java/com/boardgame/room/api/BotRoomApiTest.java
git commit -m "$(cat <<'EOF'
feat: 컴퓨터 추가·난이도 바꾸기 API와 응답 bot·difficulty, 겹치지 않는 프로필 그림, 연결 끊김 기권·화면 전송에서 컴퓨터 제외

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: 연습 경기 — 컴퓨터가 낀 게임은 전적 이벤트를 내지 않고 `practice`를 알린다

**Files:**
- Modify: `B/room/domain/MatchStamp.java`, `B/room/domain/RoomGame.java`, `B/room/domain/Room.java`, `B/room/application/OutcomePublisher.java`, `B/room/application/RoomService.java`, `B/room/api/RoomResponse.java`
- Test: `BT/room/domain/RoomPracticeTest.java`, `BT/room/application/OutcomePublisherPracticeTest.java`, `BT/room/application/RoomServicePracticeTest.java`, `BT/record/api/PracticeRecordApiTest.java`

**Interfaces:**
- Consumes: Task 1 `Room.addBot`, Task 2 `RoomService.addBot`.
- Produces: `record MatchStamp(String matchKey, Instant startedAt, boolean practice)`, `RoomGame(GameSession, String, Instant, boolean practice)` + 기존 3인자 생성자(`practice=false`), `RoomGame.isPractice()`, `Room.isPractice()`(시작한 게임이 있고 그 게임이 연습 경기면 참, 끝난 뒤에도 다음 시작 전까지 유지).
- Produces: `RoomResponse`의 마지막 필드 `boolean practice`(R38). 프론트 Task 11이 `room.practice`를 읽는다.

- [ ] **Step 1: 실패하는 테스트 작성**

`BT/room/domain/RoomPracticeTest.java`:

```java
package com.boardgame.room.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameType;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.member.domain.Avatar;
import java.time.Instant;
import org.junit.jupiter.api.Test;

class RoomPracticeTest {

    private static final Instant NOW = Instant.parse("2026-10-08T10:00:00Z");

    private Room room() {
        RoomSettings settings = new RoomSettings(GameType.UNO, Capacity.max(GameType.UNO), RoomLock.open());
        return Room.open(new RoomProfile(new RoomCode("ABCDEF"), new RoomName("방"), settings), new Participant(1L, "앨리스"));
    }

    @Test
    void R37_D8_컴퓨터가_있으면_시작할_때_연습_경기로_정하고_끝나도_유지한다() {
        Room room = room();
        room.addBot(1L, BotDifficulty.EASY, Avatar.CAT);
        assertThat(room.isPractice()).isFalse();

        room.start(1L, FakeGameSession::new, "m", NOW);
        assertThat(room.isPractice()).isTrue();

        ((FakeGameSession) room.currentGame().session()).finish();
        assertThat(room.status()).isEqualTo(RoomStatus.WAITING);
        assertThat(room.isPractice()).isTrue();
    }

    @Test
    void R37_사람끼리면_연습_경기가_아니다() {
        Room room = room();
        room.join(new Participant(2L, "밥"), null, new FakeRoomPasswordHasher());
        room.setReady(2L, true);

        room.start(1L, FakeGameSession::new, "m", NOW);

        assertThat(room.isPractice()).isFalse();
    }
}
```

`BT/room/application/OutcomePublisherPracticeTest.java`:

```java
package com.boardgame.room.application;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.boardgame.game.GameCompleted;
import com.boardgame.game.GameType;
import com.boardgame.game.RoundCompleted;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.member.domain.Avatar;
import com.boardgame.room.domain.Capacity;
import com.boardgame.room.domain.FakeGameSession;
import com.boardgame.room.domain.Participant;
import com.boardgame.room.domain.Room;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomLock;
import com.boardgame.room.domain.RoomName;
import com.boardgame.room.domain.RoomProfile;
import com.boardgame.room.domain.RoomSettings;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

class OutcomePublisherPracticeTest {

    private static final Instant NOW = Instant.parse("2026-10-08T10:00:00Z");

    @Test
    void R37_연습_경기의_결과는_어느_길로_와도_발행하지_않는다() {
        ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
        RoomSettings settings = new RoomSettings(GameType.UNO, Capacity.max(GameType.UNO), RoomLock.open());
        Room room = Room.open(new RoomProfile(new RoomCode("ABCDEF"), new RoomName("방"), settings), new Participant(1L, "앨리스"));
        room.addBot(1L, BotDifficulty.EASY, Avatar.CAT);
        room.start(1L, FakeGameSession::new, "m", NOW);

        new OutcomePublisher(events).publish(room,
                List.of(new RoundCompleted(1, List.of()), new GameCompleted(List.of())), NOW);

        verify(events, never()).publishEvent(any(Object.class));
    }
}
```

`BT/room/application/RoomServicePracticeTest.java`:

```java
package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameSessionFactories;
import com.boardgame.game.GameType;
import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.game.event.GameStartedEvent;
import com.boardgame.game.event.RoundCompletedEvent;
import com.boardgame.member.domain.Avatar;
import com.boardgame.papersafari.PaperSafariSessionFactory;
import com.boardgame.room.api.BotDifficultyRequest;
import com.boardgame.room.api.CreateRoomRequest;
import com.boardgame.room.api.RoomResponse;
import com.boardgame.room.domain.FakeRoomPasswordHasher;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomRegistry;
import com.boardgame.support.FakeTaskScheduler;
import com.boardgame.support.FixedRandom;
import com.boardgame.support.MutableClock;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

class RoomServicePracticeTest {

    private static final String CODE = "PRACTI";
    private static final long HOST = 1L;

    private final MutableClock clock = new MutableClock(Instant.parse("2026-10-08T00:00:00Z"));
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final RoomService service = new RoomService(new RoomRegistry(), () -> new RoomCode(CODE),
            new GameSessionFactories(List.of(new PaperSafariSessionFactory(clock))), mock(RoomNotifier.class),
            new OutcomePublisher(events), events, clock, new PresenceTracker(), new FakeRoomPasswordHasher(),
            new TurnTimer(new FakeTaskScheduler()), new FixedRandom(0), new RoomAvatars(Avatar::defaultFor));

    @Test
    void R37_R38_연습_경기는_시작_결과_이벤트를_보내지_않고_응답에_practice를_싣는다() {
        service.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("방", GameType.PAPER_SAFARI, 4, null));
        service.addBot(CODE, HOST, new BotDifficultyRequest("EASY"));

        RoomResponse started = service.start(CODE, HOST);
        service.leave(CODE, HOST);

        assertThat(started.practice()).isTrue();
        verify(events, never()).publishEvent(any(GameStartedEvent.class));
        verify(events, never()).publishEvent(any(RoundCompletedEvent.class));
        verify(events, never()).publishEvent(any(GameCompletedEvent.class));
    }

    @Test
    void R37_사람끼리는_그대로_시작_이벤트를_보내고_practice는_false다() {
        service.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("방", GameType.PAPER_SAFARI, 4, null));
        service.join(CODE, new LoginMember(2L, "밥"), null);
        service.setReady(CODE, 2L, true);

        RoomResponse started = service.start(CODE, HOST);

        assertThat(started.practice()).isFalse();
        verify(events).publishEvent(any(GameStartedEvent.class));
    }
}
```

`BT/record/api/PracticeRecordApiTest.java`:

```java
package com.boardgame.record.api;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.boardgame.game.event.GameCompletedEvent;
import com.boardgame.game.event.GameStartedEvent;
import com.boardgame.record.domain.GameMatchRepository;
import com.boardgame.record.domain.MatchParticipantRepository;
import com.boardgame.record.domain.MemberGameStatRepository;
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
import org.springframework.test.context.event.ApplicationEvents;
import org.springframework.test.context.event.RecordApplicationEvents;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@RecordApplicationEvents
class PracticeRecordApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ApplicationEvents events;

    @Autowired
    private GameMatchRepository matches;

    @Autowired
    private MatchParticipantRepository participants;

    @Autowired
    private MemberGameStatRepository stats;

    @MockitoBean
    private RoomNotifier notifier;

    @Test
    void R37_R38_컴퓨터가_낀_게임은_연습_경기이고_기록이_남지_않는다() throws Exception {
        long matchCount = matches.count();
        long participantCount = participants.count();
        long statCount = stats.count();
        User host = ApiUsers.create(mockMvc);
        MvcResult created = mockMvc.perform(post("/api/rooms").session(host.session())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name": "연습", "gameType": "PAPER_SAFARI"}
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        String code = JsonPath.read(created.getResponse().getContentAsString(), "$.code");
        mockMvc.perform(post("/api/rooms/" + code + "/bots").session(host.session())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"difficulty\": \"EASY\"}"));

        mockMvc.perform(post("/api/rooms/" + code + "/start").session(host.session()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.practice").value(true));
        mockMvc.perform(post("/api/rooms/" + code + "/leave").session(host.session()))
                .andExpect(status().isNoContent());

        assertThat(events.stream(GameStartedEvent.class)).isEmpty();
        assertThat(events.stream(GameCompletedEvent.class)).isEmpty();
        assertThat(matches.count()).isEqualTo(matchCount);
        assertThat(participants.count()).isEqualTo(participantCount);
        assertThat(stats.count()).isEqualTo(statCount);
    }
}
```

- [ ] **Step 2: 실패 확인**

Run: `cd backend && mvn -q test -Dtest='RoomPracticeTest,OutcomePublisherPracticeTest,RoomServicePracticeTest,PracticeRecordApiTest'`
Expected: 컴파일 실패(`Room.isPractice`, `RoomResponse.practice` 없음).

- [ ] **Step 3: 구현**

`B/room/domain/MatchStamp.java` 전체:

```java
package com.boardgame.room.domain;

import java.time.Instant;

/** 기록용 매치 키와 시작 시각, 그리고 연습 경기(R37: 컴퓨터가 낀 게임, 시작 때 정함 D8)인지. */
public record MatchStamp(String matchKey, Instant startedAt, boolean practice) {
}
```

`B/room/domain/RoomGame.java`: 생성자를 바꾸고 메서드를 더한다.

```java
    public RoomGame(GameSession session, String matchKey, Instant startedAt) {
        this(session, matchKey, startedAt, false);
    }

    public RoomGame(GameSession session, String matchKey, Instant startedAt, boolean practice) {
        this.session = session;
        this.stamp = new MatchStamp(matchKey, startedAt, practice);
    }

    public boolean isPractice() {
        return stamp.practice();
    }
```

`B/room/domain/Room.java`:
- `start`의 `game = new RoomGame(sessionCreator.apply(occupants.playerIds()), matchKey, startedAt);`를 바꾼다:

```java
        // R37·D8: 시작 때 컴퓨터가 있으면 연습 경기로 정한다(게임 중에는 컴퓨터가 빠질 수 없어 바뀌지 않는다).
        game = new RoomGame(sessionCreator.apply(occupants.playerIds()), matchKey, startedAt, occupants.hasBots());
```

- `isGameInProgress()` 아래에 추가:

```java
    /** R38: 마지막으로 시작한 게임이 연습 경기인지. 끝난 뒤에도 다음 시작 전까지 결과 창 안내에 쓴다. */
    public boolean isPractice() {
        return game != null && game.isPractice();
    }
```

`B/room/application/OutcomePublisher.java`의 `publish` 첫 줄 검사를 바꾼다:

```java
        // R37: 연습 경기는 판 결과·게임 결과를 기록하지 않는다(나가기·시간 초과·행동 어느 길로 와도).
        if (outcomes.isEmpty() || room.isPractice()) {
            return;
        }
```

`B/room/application/RoomService.java`의 `start`를 바꾼다:

```java
    public synchronized RoomResponse start(String rawCode, long memberId) {
        Room room = find(rawCode);
        GameType gameType = room.gameType();
        RoomGame game = room.start(memberId, memberIds -> sessionFactories.create(gameType, memberIds),
                UUID.randomUUID().toString(), clock.instant());
        presence.baseline(room.humanIds(), clock.instant());
        rearm(room);
        RoomResponse response = broadcast(room);
        publishStartUnlessPractice(room, game);
        return response;
    }

    // R37: 연습 경기는 경기 시작을 기록하지 않는다.
    private void publishStartUnlessPractice(Room room, RoomGame game) {
        if (game.isPractice()) {
            return;
        }
        eventPublisher.publishEvent(
                new GameStartedEvent(game.matchKey(), room.gameType(), room.memberIds(), game.startedAt()));
    }
```

`B/room/api/RoomResponse.java`: record 끝에 `boolean practice` 필드를 더하고 `from`의 생성자 호출 끝에 `room.isPractice()`를 넘긴다.

```java
public record RoomResponse(String code, String name, GameType gameType, String gameTypeName, RoomStatus status,
                           long hostId, int maxPlayers, boolean locked, RoomTheme theme, List<RoomMemberResponse> members,
                           List<RoomSpectatorResponse> spectators, boolean practice) {
```

```java
        return new RoomResponse(room.codeValue(), room.nameValue(), gameType, gameType.displayName(),
                room.status(), hostId, room.capacity(), room.isLocked(), room.theme(), members, spectators,
                room.isPractice());
```

- [ ] **Step 4: 통과 확인**

Run: `cd backend && mvn -q test -Dtest='RoomPracticeTest,OutcomePublisherPracticeTest,RoomServicePracticeTest,PracticeRecordApiTest,OutcomePublisherTest,RecordApiTest,RecordEventListenerTest'`
Expected: PASS.
Run: `cd backend && mvn -q test`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add backend/src/main/java/com/boardgame/room/domain/MatchStamp.java backend/src/main/java/com/boardgame/room/domain/RoomGame.java \
  backend/src/main/java/com/boardgame/room/domain/Room.java backend/src/main/java/com/boardgame/room/application/OutcomePublisher.java \
  backend/src/main/java/com/boardgame/room/application/RoomService.java backend/src/main/java/com/boardgame/room/api/RoomResponse.java \
  backend/src/test/java/com/boardgame/room/domain/RoomPracticeTest.java \
  backend/src/test/java/com/boardgame/room/application/OutcomePublisherPracticeTest.java \
  backend/src/test/java/com/boardgame/room/application/RoomServicePracticeTest.java \
  backend/src/test/java/com/boardgame/record/api/PracticeRecordApiTest.java
git commit -m "$(cat <<'EOF'
feat: 컴퓨터가 낀 게임은 연습 경기 - 시작·판 결과·게임 결과 이벤트를 내지 않고 방 응답에 practice를 싣는다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: 게임 세션의 "지금 행동을 기다리는 참가자"(`pendingActors`)

**Files:**
- Create: `B/game/PendingKind.java`, `B/game/PendingActor.java`
- Modify: `B/game/GameSession.java`, `B/papersafari/PaperSafariRound.java`, `B/papersafari/PaperSafariGame.java`, `B/papersafari/PaperSafariSession.java`, `B/uno/UnoGame.java`, `B/uno/UnoSession.java`, `B/oldmaid/OldMaidGame.java`, `B/oldmaid/OldMaidSession.java`, `B/room/domain/RoomGame.java`, `B/room/domain/Room.java`
- Modify test: `BT/room/domain/FakeGameSession.java`
- Test: `BT/papersafari/PaperSafariPendingActorsTest.java`, `BT/uno/UnoPendingActorsTest.java`, `BT/oldmaid/OldMaidPendingActorsTest.java`, `BT/room/domain/RoomPendingActorsTest.java`

**Interfaces:**
- Produces: `enum PendingKind { TURN, TOGETHER, REACTION }`(차례 행동 / 모두 동시에 하는 단계 / 차례 밖 행동 — 잡기·늦은 외침·섞기처럼 안 해도 되는 것), `record PendingActor(long memberId, PendingKind kind)` + `static turn(long)`, `together(long)`, `reaction(long)`.
- Produces: `GameSession.pendingActors(): List<PendingActor>`(기본 `List.of()`, 끝난 게임은 빈 목록). 페이퍼 사파리: 처음 뒤집기는 아직 안 뒤집은 모두 `TOGETHER`, 그 밖에는 차례인 사람 `TURN`. 우노: 차례인 사람 `TURN` + 잡기 창이 열려 있으면 나머지 남은 사람 모두 `REACTION`. 도둑잡기: 처음 버리기는 짝이 남은 사람 `TOGETHER`, 그 밖에는 뽑는 사람 `TURN` + 섞을 수 있는 사람 `REACTION`.
- Produces: `Room.pendingActors()`(게임 중이 아니면 빈 목록), `RoomGame.pendingActors()`, `FakeGameSession.awaitActors(List<PendingActor>)`·`actors()`·`rejectType(String)`(Task 5가 쓴다).

- [ ] **Step 1: 실패하는 테스트 작성**

`BT/papersafari/PaperSafariPendingActorsTest.java`:

```java
package com.boardgame.papersafari;

import static com.boardgame.papersafari.Fixtures.ALICE;
import static com.boardgame.papersafari.Fixtures.BOB;
import static com.boardgame.papersafari.Fixtures.FIRST;
import static com.boardgame.papersafari.Fixtures.LOSER_HAND;
import static com.boardgame.papersafari.Fixtures.WINNER_HAND;
import static com.boardgame.papersafari.Fixtures.stack;
import static com.boardgame.papersafari.Fixtures.zeros;
import static com.boardgame.papersafari.GameFixtures.roundWonBy;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.PendingActor;
import java.util.List;
import org.junit.jupiter.api.Test;

class PaperSafariPendingActorsTest {

    @Test
    void R18_처음_뒤집기는_아직_안_뒤집은_모두가_함께_기다리고_그다음은_차례인_사람이다() {
        PaperSafariRound round = Fixtures.round(List.of(ALICE, BOB),
                stack(List.of(WINNER_HAND, LOSER_HAND), Card.number(7), zeros(10)));

        assertThat(round.pendingActors()).containsExactly(PendingActor.together(1L), PendingActor.together(2L));
        round.flipInitial(ALICE, FIRST);
        assertThat(round.pendingActors()).containsExactly(PendingActor.together(2L));
        round.flipInitial(BOB, FIRST);
        assertThat(round.pendingActors()).containsExactly(PendingActor.turn(1L));
        round.drawFromDeck(ALICE);
        assertThat(round.pendingActors()).containsExactly(PendingActor.turn(1L));
    }

    @Test
    void R18_끝난_게임은_기다리는_사람이_없다() {
        PaperSafariSession session = new PaperSafariSession(List.of(1L, 2L),
                new RoundFactory(StackedShuffler.rounds(List.of(roundWonBy(ALICE))), count -> 0));
        assertThat(session.pendingActors()).hasSize(2);

        session.forfeit(2L);

        assertThat(session.isFinished()).isTrue();
        assertThat(session.pendingActors()).isEmpty();
    }
}
```

`BT/uno/UnoPendingActorsTest.java`:

```java
package com.boardgame.uno;

import static com.boardgame.uno.UnoColor.BLUE;
import static com.boardgame.uno.UnoColor.RED;
import static com.boardgame.uno.UnoFixtures.A;
import static com.boardgame.uno.UnoFixtures.B;
import static com.boardgame.uno.UnoFixtures.C;
import static com.boardgame.uno.UnoFixtures.filler;
import static com.boardgame.uno.UnoFixtures.game;
import static com.boardgame.uno.UnoFixtures.num;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.PendingActor;
import java.util.List;
import org.junit.jupiter.api.Test;

class UnoPendingActorsTest {

    private static final UnoCard FIRST = num(RED, 5);
    private static final List<List<UnoCard>> HANDS = List.of(
            List.of(num(RED, 1), num(RED, 2)),
            List.of(num(RED, 3), num(BLUE, 8)),
            List.of(num(RED, 4), num(BLUE, 9)));

    @Test
    void R18_차례인_사람과_잡기_창이_열리면_나머지_남은_사람이_반응을_기다린다() {
        UnoGame game = game(List.of(A, B, C), HANDS, FIRST, filler(20));
        assertThat(game.pendingActors()).containsExactly(PendingActor.turn(1L));

        game.play(A, num(RED, 1).id(), ChosenColor.none());

        assertThat(game.catchTarget()).contains(A);
        assertThat(game.pendingActors()).containsExactly(
                PendingActor.turn(2L), PendingActor.reaction(1L), PendingActor.reaction(3L));
    }

    @Test
    void R18_끝난_게임은_기다리는_사람이_없다() {
        UnoGame game = game(List.of(A, B), List.of(HANDS.get(0), HANDS.get(1)), FIRST, filler(20));

        game.forfeit(B);

        assertThat(game.isFinished()).isTrue();
        assertThat(game.pendingActors()).isEmpty();
    }
}
```

`BT/oldmaid/OldMaidPendingActorsTest.java`:

```java
package com.boardgame.oldmaid;

import static com.boardgame.oldmaid.OldMaidFixtures.A;
import static com.boardgame.oldmaid.OldMaidFixtures.JOKER;
import static com.boardgame.oldmaid.OldMaidFixtures.c;
import static com.boardgame.oldmaid.OldMaidFixtures.d;
import static com.boardgame.oldmaid.OldMaidFixtures.game;
import static com.boardgame.oldmaid.OldMaidFixtures.h;
import static com.boardgame.oldmaid.OldMaidFixtures.hands;
import static com.boardgame.oldmaid.OldMaidFixtures.opening;
import static com.boardgame.oldmaid.OldMaidFixtures.s;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.PendingActor;
import java.util.List;
import org.junit.jupiter.api.Test;

class OldMaidPendingActorsTest {

    @Test
    void R18_처음_버리기는_짝이_남은_사람만_함께_기다리고_그다음은_뽑는_사람과_섞을_수_있는_사람이다() {
        OldMaidGame game = opening(A, hands(List.of(s(Rank.ACE), h(Rank.ACE), s(Rank.TWO)),
                List.of(d(Rank.TWO), c(Rank.THREE), JOKER)));
        assertThat(game.pendingActors()).containsExactly(PendingActor.together(1L));

        game.discardAll(A);

        assertThat(game.stage()).isEqualTo(OldMaidStage.DRAW);
        assertThat(game.pendingActors()).containsExactly(PendingActor.turn(1L), PendingActor.reaction(2L));
    }

    @Test
    void R18_끝난_게임은_기다리는_사람이_없다() {
        OldMaidGame game = game(A, hands(List.of(s(Rank.TWO)), List.of(d(Rank.TWO))));

        game.draw(A, new SlotIndex(0));

        assertThat(game.isFinished()).isTrue();
        assertThat(game.pendingActors()).isEmpty();
    }
}
```

`BT/room/domain/RoomPendingActorsTest.java`:

```java
package com.boardgame.room.domain;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameType;
import com.boardgame.game.PendingActor;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class RoomPendingActorsTest {

    @Test
    void R18_게임_중에만_세션이_알려_준_기다리는_사람을_돌려준다() {
        RoomSettings settings = new RoomSettings(GameType.UNO, Capacity.max(GameType.UNO), RoomLock.open());
        Room room = Room.open(new RoomProfile(new RoomCode("ABCDEF"), new RoomName("방"), settings), new Participant(1L, "앨리스"));
        room.join(new Participant(2L, "밥"), null, new FakeRoomPasswordHasher());
        room.setReady(2L, true);
        assertThat(room.pendingActors()).isEmpty();

        room.start(1L, ids -> {
            FakeGameSession session = new FakeGameSession(ids);
            session.awaitActors(List.of(PendingActor.turn(2L)));
            return session;
        }, "m", Instant.parse("2026-10-08T10:00:00Z"));

        assertThat(room.pendingActors()).containsExactly(PendingActor.turn(2L));
    }
}
```

- [ ] **Step 2: 실패 확인**

Run: `cd backend && mvn -q test -Dtest='PaperSafariPendingActorsTest,UnoPendingActorsTest,OldMaidPendingActorsTest,RoomPendingActorsTest'`
Expected: 컴파일 실패(`PendingActor`, `pendingActors` 없음).

- [ ] **Step 3: 구현**

`B/game/PendingKind.java`:

```java
package com.boardgame.game;

// R18: 기다리는 결정의 종류. TURN = 차례 행동, TOGETHER = 모두 동시에 하는 단계(처음 뒤집기·처음 짝 버리기),
// REACTION = 차례 밖 행동(우노 잡기·늦은 외침, 도둑잡기 섞기). REACTION은 하지 않아도 된다.
public enum PendingKind {
    TURN, TOGETHER, REACTION
}
```

`B/game/PendingActor.java`:

```java
package com.boardgame.game;

// R18: 지금 행동할 수 있는 참가자와 그 결정의 종류.
public record PendingActor(long memberId, PendingKind kind) {

    public static PendingActor turn(long memberId) {
        return new PendingActor(memberId, PendingKind.TURN);
    }

    public static PendingActor together(long memberId) {
        return new PendingActor(memberId, PendingKind.TOGETHER);
    }

    public static PendingActor reaction(long memberId) {
        return new PendingActor(memberId, PendingKind.REACTION);
    }
}
```

`B/game/GameSession.java`: `roundNumber()` 아래에 추가.

```java
    /** R18: 지금 행동할 수 있는 참가자와 결정 종류. 끝난 게임은 빈 목록. */
    default List<PendingActor> pendingActors() {
        return List.of();
    }
```

`B/papersafari/PaperSafariRound.java`: import `com.boardgame.game.PendingActor`, `autoAct` 위에 추가.

```java
    // R18: 처음 뒤집기는 아직 안 뒤집은 모두, 그 밖에는 차례인 사람. 판이 끝나면 없음.
    public List<PendingActor> pendingActors() {
        if (turn.isSettingUp()) {
            return boards.notFlipped()
                    .stream()
                    .map(player -> PendingActor.together(player.value()))
                    .toList();
        }
        if (isOver()) {
            return List.of();
        }
        return List.of(PendingActor.turn(currentPlayer().value()));
    }
```

`B/papersafari/PaperSafariGame.java`: import `com.boardgame.game.PendingActor`, `currentPlayer()` 위에 추가.

```java
    public List<PendingActor> pendingActors() {
        if (status() == GameStatus.GAME_OVER) {
            return List.of();
        }
        return round.pendingActors();
    }
```

`B/papersafari/PaperSafariSession.java`: import `com.boardgame.game.PendingActor`, `roundNumber()` 아래에 추가.

```java
    @Override
    public List<PendingActor> pendingActors() {
        return game.pendingActors();
    }
```

`B/uno/UnoGame.java`: import `com.boardgame.game.PendingActor`, `java.util.ArrayList`, `actor()` 위에 추가.

```java
    // R18: 차례인 사람(TURN). 잡기 창이 열려 있으면 차례인 사람을 뺀 남은 사람 모두(REACTION: 잡기, 대상 본인은 늦은 외침).
    public List<PendingActor> pendingActors() {
        if (isFinished()) {
            return List.of();
        }
        PlayerId actor = round.actor();
        List<PendingActor> pending = new ArrayList<>();
        pending.add(PendingActor.turn(actor.value()));
        if (round.catchTarget().isPresent()) {
            pending.addAll(reactionsExcept(actor));
        }
        return List.copyOf(pending);
    }

    private List<PendingActor> reactionsExcept(PlayerId actor) {
        return round.remaining()
                .stream()
                .filter(player -> !player.equals(actor))
                .map(player -> PendingActor.reaction(player.value()))
                .toList();
    }
```

`B/uno/UnoSession.java`: import `com.boardgame.game.PendingActor`, `roundNumber()` 아래에 추가.

```java
    @Override
    public List<PendingActor> pendingActors() {
        return game.pendingActors();
    }
```

`B/oldmaid/OldMaidGame.java`: import `com.boardgame.game.PendingActor`, `java.util.function.LongFunction`, `java.util.function.Predicate`, `drawer()` 위에 추가.

```java
    // R18: 처음 버리기 단계면 짝이 남은 모두(TOGETHER), 그 밖에는 뽑는 사람(TURN)과 섞을 수 있는 사람(REACTION).
    public List<PendingActor> pendingActors() {
        if (isFinished()) {
            return List.of();
        }
        if (isOpening()) {
            return seatsWhere(this::canDiscard, PendingActor::together);
        }
        List<PendingActor> pending = new ArrayList<>();
        pending.add(PendingActor.turn(drawer().value()));
        pending.addAll(seatsWhere(this::canShuffle, PendingActor::reaction));
        return List.copyOf(pending);
    }

    private List<PendingActor> seatsWhere(Predicate<PlayerId> condition, LongFunction<PendingActor> kind) {
        return seats().stream()
                .filter(condition)
                .map(player -> kind.apply(player.value()))
                .toList();
    }
```

`B/oldmaid/OldMaidSession.java`: import `com.boardgame.game.PendingActor`, `roundNumber()` 아래에 추가.

```java
    @Override
    public List<PendingActor> pendingActors() {
        return game.pendingActors();
    }
```

`B/room/domain/RoomGame.java`: import `com.boardgame.game.PendingActor`, `roundNumber()` 아래에 추가.

```java
    public List<PendingActor> pendingActors() {
        return session.pendingActors();
    }
```

`B/room/domain/Room.java`: import `com.boardgame.game.PendingActor`, `deadline()` 아래에 추가.

```java
    /** R18: 진행 중인 게임이 기다리는 참가자. 진행 중이 아니면 비어 있다. */
    public List<PendingActor> pendingActors() {
        if (status() != RoomStatus.PLAYING) {
            return List.of();
        }
        return game.pendingActors();
    }
```

`BT/room/domain/FakeGameSession.java`: import `com.boardgame.common.error.BusinessException`, `com.boardgame.common.error.ErrorCode`, `com.boardgame.game.PendingActor`. 필드와 메서드를 더하고 `act`를 바꾼다.

```java
    private List<PendingActor> pending = List.of();
    private final List<Long> actors = new ArrayList<>();
    private final Set<String> rejectedTypes = new HashSet<>();
```

```java
    @Override
    public List<GameOutcome> act(long memberId, GameAction action) {
        if (rejectedTypes.contains(action.type())) {
            throw new BusinessException(ErrorCode.INVALID_PHASE);
        }
        actions.add(action);
        actors.add(memberId);
        if (finishOnAct) {
            finished = true;
            return List.of(new GameCompleted(List.of()));
        }
        return List.of();
    }

    @Override
    public List<PendingActor> pendingActors() {
        if (finished) {
            return List.of();
        }
        return pending;
    }

    public void awaitActors(List<PendingActor> actors) {
        pending = List.copyOf(actors);
    }

    public List<Long> actors() {
        return actors;
    }

    /** 이 type의 행동은 규칙 위반처럼 거절한다(INVALID_PHASE). */
    public void rejectType(String type) {
        rejectedTypes.add(type);
    }
```

- [ ] **Step 4: 통과 확인**

Run: `cd backend && mvn -q test -Dtest='PaperSafariPendingActorsTest,UnoPendingActorsTest,OldMaidPendingActorsTest,RoomPendingActorsTest,RoomTest'`
Expected: PASS.
Run: `cd backend && mvn -q test`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add backend/src/main/java/com/boardgame/game/PendingKind.java backend/src/main/java/com/boardgame/game/PendingActor.java \
  backend/src/main/java/com/boardgame/game/GameSession.java \
  backend/src/main/java/com/boardgame/papersafari/PaperSafariRound.java backend/src/main/java/com/boardgame/papersafari/PaperSafariGame.java \
  backend/src/main/java/com/boardgame/papersafari/PaperSafariSession.java backend/src/main/java/com/boardgame/uno/UnoGame.java \
  backend/src/main/java/com/boardgame/uno/UnoSession.java backend/src/main/java/com/boardgame/oldmaid/OldMaidGame.java \
  backend/src/main/java/com/boardgame/oldmaid/OldMaidSession.java backend/src/main/java/com/boardgame/room/domain/RoomGame.java \
  backend/src/main/java/com/boardgame/room/domain/Room.java backend/src/test/java/com/boardgame/room/domain/FakeGameSession.java \
  backend/src/test/java/com/boardgame/papersafari/PaperSafariPendingActorsTest.java backend/src/test/java/com/boardgame/uno/UnoPendingActorsTest.java \
  backend/src/test/java/com/boardgame/oldmaid/OldMaidPendingActorsTest.java backend/src/test/java/com/boardgame/room/domain/RoomPendingActorsTest.java
git commit -m "$(cat <<'EOF'
feat: GameSession.pendingActors - 세 게임이 지금 행동을 기다리는 참가자와 결정 종류(차례·동시·차례 밖)를 알려 준다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: 컴퓨터 구동 — 판단 계약(`BotBrain`/`BotMind`/`BotPlan`), 예약·무효화·실패 대비, 사람과 같은 행동 경로

**Files:**
- Create: `B/game/bot/BotStepKind.java`, `B/game/bot/BotStep.java`, `B/game/bot/BotPlan.java`, `B/game/bot/BotSituation.java`, `B/game/bot/BotMind.java`, `B/game/bot/BotBrain.java`, `B/game/bot/BotBrains.java`, `B/game/bot/ThinkTime.java`
- Create: `B/room/application/BotConfig.java`, `B/room/application/BotPace.java`, `B/room/application/BotScheduler.java`, `B/room/application/BotTicket.java`, `B/room/application/BotRunner.java`, `B/room/application/BotRoom.java`, `B/room/application/BotRooms.java`, `B/room/application/BotDriver.java`
- Modify: `B/room/application/RoomService.java`
- Create test support: `BT/support/TestBotConfig.java`, `BT/room/application/ScriptedBrain.java`; Modify: `backend/src/test/resources/application.properties`
- Test: `BT/game/bot/ThinkTimeTest.java`, `BT/game/bot/BotPlanTest.java`, `BT/room/application/BotDriverTest.java`, `BT/room/application/BotAutoActorLogTest.java`

**Interfaces:**
- Consumes: Task 4 `PendingActor`/`PendingKind`, `Room.pendingActors()`; Task 1 `Room.bots()/isBot()`; Task 3 `RoomGame.matchKey()`.
- Produces (게임별 머리 Task 6~8이 구현한다):

```java
public interface BotBrain {            // 게임 종류마다 @Component 하나
    GameType type();
    BotMind mind(BotDifficulty difficulty);   // 컴퓨터 한 명·게임 한 판마다 새로 만든다(기억을 담는다)
}
public interface BotMind {
    default void observe(Object view) {}       // 상태가 바뀔 때마다 자기 자리 화면(viewFor(botId))만 받는다(R16)
    Optional<BotPlan> plan(BotSituation situation);   // 빈 값 = 이번에는 하지 않음(차례 밖 행동)
    Optional<GameAction> fallback(Object view, Random random);  // R21: 기존 autoAct와 같은 결정, 자기 차례가 아니면 빈 값
}
public record BotSituation(Object view, PendingKind kind, Instant now, Random random) {}
public record BotStep(Duration delay, BotStepKind kind, GameAction action) { static act(...); static signal(...); boolean isSignal(); }
public record BotPlan(List<BotStep> steps) { static of(BotStep...); static act(Duration, GameAction); BotStep first(); Optional<BotPlan> rest(); Duration total(); }
public final class ThinkTime { static Duration standard(Random); static Duration between(Random, int minMillis, int maxMillis); }
```

- Produces: `BotDriver.afterChange(Room, BotRunner)`, `isCurrent(Room, BotTicket)`, `continueWith(BotTicket, BotRunner)`, `fallback(Room, long botId): Optional<GameAction>`, `forget(RoomCode)`, `static BotDriver idle()`; `BotScheduler(TaskScheduler, Clock, double pace)`; 설정 `app.bots.real-scheduler`(기본 true, 테스트 false), `app.bots.pace`(기본 1.0).
- Produces: `RoomService`에 새 13인자 생성자(`@Autowired`, 마지막 인자 `BotDriver`). 기존 12인자 생성자는 `BotDriver.idle()`로 위임해 기존 단위 테스트가 그대로 돈다.

- [ ] **Step 1: 실패하는 테스트 작성**

`backend/src/test/resources/application.properties` 끝에 추가:

```properties
# 스프링 컨텍스트 테스트에서 컴퓨터가 실제로 움직이지 않게 한다(TestBotConfig의 가짜 예약기). STOMP 통합 테스트만 켠다.
app.bots.real-scheduler=false
```

`BT/support/TestBotConfig.java`:

```java
package com.boardgame.support;

import com.boardgame.room.application.BotConfig;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.TaskScheduler;

// 스프링 컨텍스트 테스트는 컴퓨터 예약을 기록만 하고 실행하지 않는다(TestTurnTimerConfig와 같은 방식).
@Configuration
public class TestBotConfig {

    @Bean(BotConfig.SCHEDULER)
    @ConditionalOnProperty(name = BotConfig.REAL_SCHEDULER_PROPERTY, havingValue = "false")
    public TaskScheduler fakeBotScheduler() {
        return new FakeTaskScheduler();
    }
}
```

`BT/game/bot/ThinkTimeTest.java`:

```java
package com.boardgame.game.bot;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.support.FixedRandom;
import java.time.Duration;
import java.util.Random;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;

class ThinkTimeTest {

    @Test
    void R19_생각_시간은_0_8초에서_1_8초_사이다() {
        Random random = new Random(7);

        IntStream.range(0, 500).mapToObj(index -> ThinkTime.standard(random))
                .forEach(delay -> assertThat(delay).isBetween(Duration.ofMillis(800), Duration.ofMillis(1800)));
        assertThat(ThinkTime.standard(new FixedRandom(0))).isEqualTo(Duration.ofMillis(800));
        assertThat(ThinkTime.between(new FixedRandom(1000), 2500, 5000)).isEqualTo(Duration.ofMillis(3500));
    }
}
```

`BT/game/bot/BotPlanTest.java`:

```java
package com.boardgame.game.bot;

import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameAction;
import java.time.Duration;
import org.junit.jupiter.api.Test;

class BotPlanTest {

    @Test
    void 계획은_첫_걸음과_나머지로_나뉘고_전체_시간을_안다() {
        GameAction peek = new GameAction("PEEK", null, null, null, null, null, 2);
        GameAction draw = new GameAction("DRAW", null, null, null, null, null, 2);
        BotPlan plan = BotPlan.of(BotStep.signal(Duration.ofMillis(800), peek), BotStep.act(Duration.ofMillis(300), draw));

        assertThat(plan.first().isSignal()).isTrue();
        assertThat(plan.rest()).contains(BotPlan.act(Duration.ofMillis(300), draw));
        assertThat(plan.rest().orElseThrow().rest()).isEmpty();
        assertThat(plan.total()).isEqualTo(Duration.ofMillis(1100));
    }
}
```

`BT/room/application/ScriptedBrain.java`:

```java
package com.boardgame.room.application;

import com.boardgame.game.GameAction;
import com.boardgame.game.GameType;
import com.boardgame.game.bot.BotBrain;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.game.bot.BotMind;
import com.boardgame.game.bot.BotPlan;
import com.boardgame.game.bot.BotSituation;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.function.Function;

// 정해 둔 계획을 돌려주고 받은 입력을 모두 기록하는 머리(BotDriverTest용). planner·fallbackAction은 테스트가 바꾼다.
final class ScriptedBrain implements BotBrain {

    final List<Object> observed = new ArrayList<>();
    final List<BotSituation> situations = new ArrayList<>();
    final List<BotDifficulty> made = new ArrayList<>();
    Function<BotSituation, Optional<BotPlan>> planner =
            situation -> Optional.of(BotPlan.act(Duration.ofMillis(800), new GameAction("FLIP", 0, 0)));
    GameAction fallbackAction = new GameAction("AUTO", null, null);

    @Override
    public GameType type() {
        return GameType.PAPER_SAFARI;
    }

    @Override
    public BotMind mind(BotDifficulty difficulty) {
        made.add(difficulty);
        return new BotMind() {
            @Override
            public void observe(Object view) {
                observed.add(view);
            }

            @Override
            public Optional<BotPlan> plan(BotSituation situation) {
                situations.add(situation);
                return planner.apply(situation);
            }

            @Override
            public Optional<GameAction> fallback(Object view, Random random) {
                return Optional.of(fallbackAction);
            }
        };
    }
}
```

`BT/room/application/BotDriverTest.java`:

```java
package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.clearInvocations;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameSession;
import com.boardgame.game.GameSessionFactories;
import com.boardgame.game.GameSessionFactory;
import com.boardgame.game.GameType;
import com.boardgame.game.PendingActor;
import com.boardgame.game.PendingKind;
import com.boardgame.game.bot.BotBrains;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.game.bot.BotPlan;
import com.boardgame.game.bot.BotSituation;
import com.boardgame.game.bot.BotStep;
import com.boardgame.member.domain.Avatar;
import com.boardgame.room.api.BotDifficultyRequest;
import com.boardgame.room.api.CreateRoomRequest;
import com.boardgame.room.domain.FakeGameSession;
import com.boardgame.room.domain.FakeRoomPasswordHasher;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomRegistry;
import com.boardgame.support.FakeTaskScheduler;
import com.boardgame.support.FakeTaskScheduler.ScheduledTask;
import com.boardgame.support.FixedRandom;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

// 가짜 예약기로 컴퓨터 생각 시간을 기다리지 않고 직접 실행한다. 세션은 모든 참가자가 함께 기다리는 FakeGameSession.
class BotDriverTest {

    private static final String CODE = "ROBOTS";
    private static final RoomCode ROOM_CODE = new RoomCode(CODE);
    private static final long HOST = 1L;
    private static final long BOT = -1L;
    private static final Instant T0 = Instant.parse("2026-10-08T00:00:00Z");
    private static final GameAction HOST_FLIP = new GameAction("FLIP", 1, 1);

    private final MutableClock clock = new MutableClock(T0);
    private final RoomRegistry registry = new RoomRegistry();
    private final RoomNotifier notifier = mock(RoomNotifier.class);
    private final ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
    private final FakeTaskScheduler botTasks = new FakeTaskScheduler();
    private final ScriptedBrain brain = new ScriptedBrain();
    private final AtomicReference<FakeGameSession> session = new AtomicReference<>();
    private final GameSessionFactory factory = new GameSessionFactory() {
        @Override
        public GameType type() {
            return GameType.PAPER_SAFARI;
        }

        @Override
        public GameSession create(List<Long> memberIds) {
            FakeGameSession created = new FakeGameSession(memberIds);
            created.awaitActors(memberIds.stream().map(PendingActor::together).toList());
            session.set(created);
            return created;
        }
    };
    private final RoomService service = serviceWith(registry);

    private RoomService serviceWith(RoomRegistry rooms) {
        BotDriver driver = new BotDriver(new BotScheduler(botTasks, clock, 1.0), new BotBrains(List.of(brain)),
                new FixedRandom(0));
        return new RoomService(rooms, () -> ROOM_CODE, new GameSessionFactories(List.of(factory)), notifier,
                new OutcomePublisher(events), events, clock, new PresenceTracker(), new FakeRoomPasswordHasher(),
                new TurnTimer(new FakeTaskScheduler()), new FixedRandom(0), new RoomAvatars(Avatar::defaultFor), driver);
    }

    @BeforeEach
    void startWithTwoBots() {
        service.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("방", GameType.PAPER_SAFARI, 4, null));
        service.addBot(CODE, HOST, new BotDifficultyRequest("EASY"));
        service.addBot(CODE, HOST, new BotDifficultyRequest("HARD"));
        service.start(CODE, HOST);
    }

    @Test
    void R19_시작하면_행동할_컴퓨터마다_생각_시간_뒤로_한_번씩_예약한다() {
        assertThat(brain.made).containsExactly(BotDifficulty.EASY, BotDifficulty.HARD);
        assertThat(botTasks.tasks()).hasSize(2);
        assertThat(botTasks.tasks()).extracting(ScheduledTask::startTime).containsOnly(T0.plusMillis(800));
        assertThat(brain.situations).extracting(BotSituation::kind).containsOnly(PendingKind.TOGETHER);
    }

    @Test
    void R17_예약이_실행되면_사람과_같은_경로로_행동하고_다시_예약한다() {
        clearInvocations(notifier);

        botTasks.tasks().get(0).run();

        assertThat(session.get().actors()).containsExactly(BOT);
        assertThat(session.get().actions()).containsExactly(new GameAction("FLIP", 0, 0));
        verify(notifier).gameUpdated(eq(HOST), any());
        verify(notifier, never()).gameUpdated(eq(BOT), any());
        assertThat(botTasks.tasks()).hasSize(4);
    }

    @Test
    void R20_예약_뒤에_상태가_바뀌면_옛_예약은_아무것도_하지_않는다() {
        ScheduledTask stale = botTasks.tasks().get(1);

        service.act(CODE, HOST, HOST_FLIP);
        stale.run();

        assertThat(session.get().actors()).containsExactly(HOST);
    }

    @Test
    void R20_게임이_끝나면_옛_예약은_아무것도_하지_않는다() {
        ScheduledTask stale = botTasks.tasks().get(0);
        session.get().finishOnAct();
        service.act(CODE, HOST, HOST_FLIP);
        int scheduled = botTasks.tasks().size();

        stale.run();

        assertThat(session.get().actors()).containsExactly(HOST);
        assertThat(botTasks.tasks()).hasSize(scheduled);
    }

    @Test
    void R13_R20_사람이_모두_나가_방이_닫히면_예약은_아무것도_하지_않는다() {
        ScheduledTask stale = botTasks.tasks().get(0);

        service.leave(CODE, HOST);
        stale.run();

        assertThat(registry.find(ROOM_CODE)).isEmpty();
        assertThat(session.get().actions()).isEmpty();
    }

    @Test
    void R21_판단이_예외를_내면_자동_행동_결정을_생각_시간_뒤에_한다() {
        brain.planner = situation -> {
            throw new IllegalStateException("판단 실패");
        };
        service.act(CODE, HOST, HOST_FLIP);

        botTasks.latest().run();

        assertThat(session.get().actions()).containsExactly(HOST_FLIP, new GameAction("AUTO", null, null));
    }

    @Test
    void R21_서버가_거절하면_자동_행동을_한_번_시도한다() {
        brain.planner = situation -> Optional.of(BotPlan.act(Duration.ofMillis(800), new GameAction("BAD", null, null)));
        session.get().rejectType("BAD");
        service.act(CODE, HOST, HOST_FLIP);

        botTasks.latest().run();

        assertThat(session.get().actions()).containsExactly(HOST_FLIP, new GameAction("AUTO", null, null));
    }

    @Test
    void R21_자동_행동도_거절되면_조용히_멈추고_시간_초과_처리에_맡긴다() {
        brain.planner = situation -> Optional.of(BotPlan.act(Duration.ofMillis(800), new GameAction("BAD", null, null)));
        brain.fallbackAction = new GameAction("BAD", null, null);
        session.get().rejectType("BAD");
        service.act(CODE, HOST, HOST_FLIP);

        botTasks.latest().run();

        assertThat(session.get().actions()).containsExactly(HOST_FLIP);
    }

    @Test
    void R16_컴퓨터_판단의_입력은_그_컴퓨터_자리_화면뿐이다() {
        assertThat(brain.observed).containsOnly("view--1", "view--2");
        assertThat(brain.situations).extracting(BotSituation::view).containsExactly("view--1", "view--2");
    }

    @Test
    void 신호_걸음은_상태를_바꾸지_않고_같은_번호로_다음_걸음을_예약한다() {
        GameAction peek = new GameAction("PEEK", null, null, null, null, null, 2);
        GameAction draw = new GameAction("DRAW", null, null, null, null, null, 2);
        brain.planner = situation -> Optional.of(BotPlan.of(
                BotStep.signal(Duration.ofMillis(800), peek), BotStep.act(Duration.ofMillis(300), draw)));
        session.get().replySignal("lift");
        service.act(CODE, HOST, HOST_FLIP);
        int before = botTasks.tasks().size();

        botTasks.tasks().get(before - 2).run();

        verify(notifier).gameSignal(HOST, "lift");
        verify(notifier, never()).gameSignal(eq(BOT), any());
        assertThat(botTasks.tasks()).hasSize(before + 1);
        assertThat(botTasks.latest().startTime()).isEqualTo(T0.plusMillis(300));
        botTasks.latest().run();
        assertThat(session.get().actors()).containsExactly(HOST, BOT);
        assertThat(session.get().actions()).endsWith(draw);
    }

    @Test
    void 사람끼리_하는_판은_아무것도_예약하지_않는다() {
        FakeTaskScheduler before = botTasks;
        int scheduled = before.tasks().size();
        RoomService humans = serviceWith(new RoomRegistry());
        humans.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("방", GameType.PAPER_SAFARI, 4, null));
        humans.join(CODE, new LoginMember(2L, "밥"), null);
        humans.setReady(CODE, 2L, true);

        humans.start(CODE, HOST);
        humans.act(CODE, HOST, HOST_FLIP);

        assertThat(botTasks.tasks()).hasSize(scheduled);
    }
}
```

`BT/room/application/BotAutoActorLogTest.java`:

```java
package com.boardgame.room.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

import com.boardgame.common.security.LoginMember;
import com.boardgame.game.GameAction;
import com.boardgame.game.GameSessionFactories;
import com.boardgame.game.GameType;
import com.boardgame.game.bot.BotBrain;
import com.boardgame.game.bot.BotBrains;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.game.bot.BotMind;
import com.boardgame.game.bot.BotPlan;
import com.boardgame.game.bot.BotSituation;
import com.boardgame.member.domain.Avatar;
import com.boardgame.papersafari.PaperSafariSessionFactory;
import com.boardgame.papersafari.view.BoardView;
import com.boardgame.papersafari.view.PaperSafariSessionView;
import com.boardgame.papersafari.view.PaperSafariView;
import com.boardgame.papersafari.view.SlotView;
import com.boardgame.room.api.BotDifficultyRequest;
import com.boardgame.room.api.CreateRoomRequest;
import com.boardgame.room.domain.FakeRoomPasswordHasher;
import com.boardgame.room.domain.RoomCode;
import com.boardgame.room.domain.RoomRegistry;
import com.boardgame.support.FakeTaskScheduler;
import com.boardgame.support.FixedRandom;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

// R22: 실제 페이퍼 사파리 세션에서 컴퓨터의 행동이 "시간이 지나 자동으로…" 기록(AutoActorLog)에 남지 않는다.
class BotAutoActorLogTest {

    private static final String CODE = "ROBOTS";
    private static final RoomCode ROOM_CODE = new RoomCode(CODE);
    private static final long HOST = 1L;
    private static final long BOT = -1L;

    // 자기 판의 첫 뒷면 칸을 뒤집는 머리.
    private static final class FlipFirstBrain implements BotBrain {
        @Override
        public GameType type() {
            return GameType.PAPER_SAFARI;
        }

        @Override
        public BotMind mind(BotDifficulty difficulty) {
            return new BotMind() {
                @Override
                public Optional<BotPlan> plan(BotSituation situation) {
                    return firstFaceDown(situation.view())
                            .map(slot -> BotPlan.act(Duration.ofMillis(800), new GameAction("FLIP", slot.column(), slot.row())));
                }

                @Override
                public Optional<GameAction> fallback(Object view, Random random) {
                    return Optional.empty();
                }
            };
        }

        private static Optional<SlotView> firstFaceDown(Object view) {
            PaperSafariView game = ((PaperSafariSessionView) view).game();
            return game.round().boards().stream()
                    .filter(board -> board.playerId() == game.viewerId())
                    .map(BoardView::slots)
                    .flatMap(List::stream)
                    .filter(slot -> !slot.faceUp())
                    .findFirst();
        }
    }

    @Test
    void R22_컴퓨터의_행동은_자동_행동_기록에_남지_않는다() {
        MutableClock clock = new MutableClock(Instant.parse("2026-10-08T00:00:00Z"));
        RoomRegistry registry = new RoomRegistry();
        FakeTaskScheduler botTasks = new FakeTaskScheduler();
        ApplicationEventPublisher events = mock(ApplicationEventPublisher.class);
        BotDriver driver = new BotDriver(new BotScheduler(botTasks, clock, 1.0),
                new BotBrains(List.of(new FlipFirstBrain())), new FixedRandom(0));
        RoomService service = new RoomService(registry, () -> ROOM_CODE,
                new GameSessionFactories(List.of(new PaperSafariSessionFactory(clock))), mock(RoomNotifier.class),
                new OutcomePublisher(events), events, clock, new PresenceTracker(), new FakeRoomPasswordHasher(),
                new TurnTimer(new FakeTaskScheduler()), new FixedRandom(0), new RoomAvatars(Avatar::defaultFor), driver);
        service.create(new LoginMember(HOST, "앨리스"), new CreateRoomRequest("방", GameType.PAPER_SAFARI, 4, null));
        service.addBot(CODE, HOST, new BotDifficultyRequest("EASY"));
        service.start(CODE, HOST);

        botTasks.latest().run();

        PaperSafariView view = ((PaperSafariSessionView) registry.get(ROOM_CODE).viewFor(HOST).orElseThrow()).game();
        BoardView botBoard = view.round().boards().stream().filter(board -> board.playerId() == BOT).findFirst().orElseThrow();
        assertThat(botBoard.slots()).filteredOn(SlotView::faceUp).hasSize(1);
        assertThat(view.lastAutoActorIds()).isEmpty();
        assertThat(view.autoActSeq()).isZero();
    }
}
```

- [ ] **Step 2: 실패 확인**

Run: `cd backend && mvn -q test -Dtest='ThinkTimeTest,BotPlanTest,BotDriverTest,BotAutoActorLogTest'`
Expected: 컴파일 실패(`ThinkTime`, `BotPlan`, `BotDriver` 등 없음).

- [ ] **Step 3: 판단 계약 구현(`B/game/bot`)**

`B/game/bot/BotStepKind.java`:

```java
package com.boardgame.game.bot;

// ACT = 행동(상태를 바꾼다, room.act), SIGNAL = 신호(상태를 바꾸지 않는다, room.signal — 도둑잡기 고르는 카드 들어 올림).
public enum BotStepKind {
    ACT, SIGNAL
}
```

`B/game/bot/BotStep.java`:

```java
package com.boardgame.game.bot;

import com.boardgame.game.GameAction;
import java.time.Duration;

// 컴퓨터 계획의 한 걸음: 앞 걸음(첫 걸음은 지금)으로부터 delay 뒤에 action을 보낸다.
public record BotStep(Duration delay, BotStepKind kind, GameAction action) {

    public static BotStep act(Duration delay, GameAction action) {
        return new BotStep(delay, BotStepKind.ACT, action);
    }

    public static BotStep signal(Duration delay, GameAction action) {
        return new BotStep(delay, BotStepKind.SIGNAL, action);
    }

    public boolean isSignal() {
        return kind == BotStepKind.SIGNAL;
    }
}
```

`B/game/bot/BotPlan.java`:

```java
package com.boardgame.game.bot;

import com.boardgame.game.GameAction;
import java.time.Duration;
import java.util.List;
import java.util.Optional;

// 컴퓨터가 지금 하기로 한 일. 신호 걸음들 뒤에 행동 걸음이 하나 오거나, 행동 하나뿐이다.
public record BotPlan(List<BotStep> steps) {

    public BotPlan {
        if (steps.isEmpty()) {
            throw new IllegalArgumentException("계획에는 걸음이 하나 이상 있어야 한다");
        }
        steps = List.copyOf(steps);
    }

    public static BotPlan of(BotStep... steps) {
        return new BotPlan(List.of(steps));
    }

    public static BotPlan act(Duration delay, GameAction action) {
        return of(BotStep.act(delay, action));
    }

    public BotStep first() {
        return steps.get(0);
    }

    public Optional<BotPlan> rest() {
        if (steps.size() == 1) {
            return Optional.empty();
        }
        return Optional.of(new BotPlan(steps.subList(1, steps.size())));
    }

    /** 처음부터 마지막 걸음까지 걸리는 시간(시뮬레이션이 가장 먼저 끝나는 계획을 고를 때 쓴다). */
    public Duration total() {
        return steps.stream()
                .map(BotStep::delay)
                .reduce(Duration.ZERO, Duration::plus);
    }
}
```

`B/game/bot/BotSituation.java`:

```java
package com.boardgame.game.bot;

import com.boardgame.game.PendingKind;
import java.time.Instant;
import java.util.Random;

// 컴퓨터가 판단할 때 받는 것: 자기 자리 화면(R16, viewFor(botId)와 같은 객체), 결정 종류(R18), 지금 시각, 무작위.
public record BotSituation(Object view, PendingKind kind, Instant now, Random random) {
}
```

`B/game/bot/BotMind.java`:

```java
package com.boardgame.game.bot;

import com.boardgame.game.GameAction;
import java.util.Optional;
import java.util.Random;

// 컴퓨터 한 명의 한 게임 동안의 판단(기억 포함). 입력은 늘 그 컴퓨터 자리 화면뿐이다(R16).
public interface BotMind {

    /** 상태가 바뀔 때마다 자기 자리 화면을 본다. 기억이 필요한 난이도만 쓴다. */
    default void observe(Object view) {
    }

    /** 지금 할 일. 하지 않기로 하면 빈 값(차례 밖 행동). */
    Optional<BotPlan> plan(BotSituation situation);

    /** R21: 판단이 실패했을 때 쓰는 기존 자동 행동(autoAct)과 같은 결정. 자기 차례가 아니면 빈 값. */
    Optional<GameAction> fallback(Object view, Random random);
}
```

`B/game/bot/BotBrain.java`:

```java
package com.boardgame.game.bot;

import com.boardgame.game.GameType;

// 게임 종류마다 하나(@Component). 컴퓨터 한 명·한 판마다 새 BotMind를 만든다.
public interface BotBrain {

    GameType type();

    BotMind mind(BotDifficulty difficulty);
}
```

`B/game/bot/BotBrains.java`:

```java
package com.boardgame.game.bot;

import com.boardgame.game.GameType;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Component;

// 게임 종류별 머리 모음. 머리가 없는 게임의 컴퓨터는 움직이지 않는다(시간 초과 처리만 받는다).
// 생성자가 하나라 등록된 BotBrain이 없으면 스프링이 빈 목록을 넣는다(GameSessionFactories와 같은 방식).
@Component
public class BotBrains {

    private final Map<GameType, BotBrain> brains = new EnumMap<>(GameType.class);

    public BotBrains(List<BotBrain> brains) {
        brains.forEach(brain -> this.brains.put(brain.type(), brain));
    }

    public Optional<BotMind> mind(GameType type, BotDifficulty difficulty) {
        return Optional.ofNullable(brains.get(type))
                .map(brain -> brain.mind(difficulty));
    }
}
```

`B/game/bot/ThinkTime.java`:

```java
package com.boardgame.game.bot;

import java.time.Duration;
import java.util.Random;

// R19: 생각 시간은 난이도와 무관하게 0.8~1.8초. between은 따로 정한 범위(우노 잡기, 도둑잡기 신호·하의 처음 버리기)에 쓴다.
public final class ThinkTime {

    private static final int MIN_MILLIS = 800;
    private static final int MAX_MILLIS = 1800;

    private ThinkTime() {
    }

    public static Duration standard(Random random) {
        return between(random, MIN_MILLIS, MAX_MILLIS);
    }

    public static Duration between(Random random, int minMillis, int maxMillis) {
        return Duration.ofMillis(minMillis + random.nextInt(maxMillis - minMillis + 1));
    }
}
```

- [ ] **Step 4: 예약·구동 구현(`B/room/application`)**

`B/room/application/BotConfig.java`:

```java
package com.boardgame.room.application;

import java.time.Clock;
import java.util.Random;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.scheduling.concurrent.ThreadPoolTaskScheduler;

@Configuration
public class BotConfig {

    public static final String SCHEDULER = "botScheduler";
    public static final String RANDOM = "botRandom";
    public static final String REAL_SCHEDULER_PROPERTY = "app.bots.real-scheduler";

    // 턴 타이머와 따로 둔다(컴퓨터 생각 시간이 시간 초과 처리를 막지 않게). 테스트는 속성을 false로 두고 가짜 예약기를 쓴다.
    @Bean(SCHEDULER)
    @ConditionalOnProperty(name = REAL_SCHEDULER_PROPERTY, havingValue = "true", matchIfMissing = true)
    public TaskScheduler botScheduler(Clock clock) {
        ThreadPoolTaskScheduler scheduler = new ThreadPoolTaskScheduler();
        scheduler.setClock(clock);
        scheduler.setPoolSize(2);
        scheduler.setThreadNamePrefix("bot-");
        scheduler.setRemoveOnCancelPolicy(true);
        return scheduler;
    }

    @Bean(RANDOM)
    public Random botRandom() {
        return new Random();
    }
}
```

`B/room/application/BotPace.java`:

```java
package com.boardgame.room.application;

import java.time.Duration;

// app.bots.pace: 컴퓨터 지연에 곱하는 배율(기본 1.0). STOMP 통합 테스트만 짧게 줄인다.
public record BotPace(double factor) {

    public Duration scale(Duration delay) {
        return Duration.ofMillis(Math.round(delay.toMillis() * factor));
    }
}
```

`B/room/application/BotScheduler.java`:

```java
package com.boardgame.room.application;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.TaskScheduler;
import org.springframework.stereotype.Component;

// 컴퓨터 계획의 걸음을 예약한다. 예약 스레드에서 예외가 나면 조용히 사라지므로 기록을 남긴다.
@Component
public class BotScheduler {

    private static final Logger log = LoggerFactory.getLogger(BotScheduler.class);

    private final TaskScheduler scheduler;
    private final Clock clock;
    private final BotPace pace;

    public BotScheduler(@Qualifier(BotConfig.SCHEDULER) TaskScheduler scheduler, Clock clock,
                        @Value("${app.bots.pace:1.0}") double pace) {
        this.scheduler = scheduler;
        this.clock = clock;
        this.pace = new BotPace(pace);
    }

    public void schedule(Duration delay, Runnable task) {
        scheduler.schedule(() -> runQuietly(task), clock.instant().plus(pace.scale(delay)));
    }

    public Instant now() {
        return clock.instant();
    }

    private void runQuietly(Runnable task) {
        try {
            task.run();
        } catch (RuntimeException exception) {
            log.warn("컴퓨터 예약 실행 실패", exception);
        }
    }
}
```

`B/room/application/BotTicket.java`:

```java
package com.boardgame.room.application;

import com.boardgame.game.bot.BotPlan;
import com.boardgame.game.bot.BotStep;
import com.boardgame.room.domain.RoomCode;
import java.util.Optional;

// R20: 예약 당시의 방 상태 번호(epoch). 실행 때 번호가 최신일 때만 계획의 첫 걸음을 한다.
public record BotTicket(RoomCode code, long botId, long epoch, BotPlan plan) {

    public BotStep step() {
        return plan.first();
    }

    public Optional<BotTicket> next() {
        return plan.rest()
                .map(rest -> new BotTicket(code, botId, epoch, rest));
    }
}
```

`B/room/application/BotRunner.java`:

```java
package com.boardgame.room.application;

// 예약된 걸음을 방 잠금 안에서 실행하는 쪽(RoomService). BotDriver가 RoomService를 직접 알지 않게 한다.
@FunctionalInterface
public interface BotRunner {

    void run(BotTicket ticket);
}
```

`B/room/application/BotRoom.java`:

```java
package com.boardgame.room.application;

import com.boardgame.game.bot.BotMind;
import com.boardgame.room.domain.Room;
import java.util.Map;
import java.util.Optional;

// 방 하나의 컴퓨터 상태: 이 게임(matchKey)의 컴퓨터별 마음과 마지막 상태 번호.
class BotRoom {

    private final String matchKey;
    private final Map<Long, BotMind> minds;
    private long epoch;

    BotRoom(String matchKey, Map<Long, BotMind> minds) {
        this.matchKey = matchKey;
        this.minds = Map.copyOf(minds);
    }

    boolean isFor(String key) {
        return matchKey.equals(key);
    }

    void advance(long next) {
        epoch = next;
    }

    long epoch() {
        return epoch;
    }

    boolean isAt(long value) {
        return epoch == value;
    }

    Optional<BotMind> mindOf(long botId) {
        return Optional.ofNullable(minds.get(botId));
    }

    // R16: 컴퓨터마다 자기 자리 화면만 본다.
    void observe(Room room) {
        minds.forEach((botId, mind) -> room.viewFor(botId).ifPresent(mind::observe));
    }
}
```

`B/room/application/BotRooms.java`:

```java
package com.boardgame.room.application;

import com.boardgame.game.bot.BotMind;
import com.boardgame.room.domain.Room;
import com.boardgame.room.domain.RoomCode;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Supplier;

// 방마다 컴퓨터 상태. 상태 번호는 모든 방이 함께 쓰는 발급기에서 받아 방이 다시 만들어져도 옛 예약과 겹치지 않는다.
class BotRooms {

    private final Map<RoomCode, BotRoom> rooms = new ConcurrentHashMap<>();
    private final AtomicLong epochs = new AtomicLong();

    // 새 게임이면 마음을 새로 만들고, 상태 번호를 올린다(R20: 이전 예약은 모두 무효).
    BotRoom refresh(Room room, Supplier<Map<Long, BotMind>> minds) {
        String matchKey = room.currentGame().matchKey();
        BotRoom state = find(room.code())
                .filter(found -> found.isFor(matchKey))
                .orElseGet(() -> new BotRoom(matchKey, minds.get()));
        state.advance(epochs.incrementAndGet());
        rooms.put(room.code(), state);
        return state;
    }

    Optional<BotRoom> find(RoomCode code) {
        return Optional.ofNullable(rooms.get(code));
    }

    void forget(RoomCode code) {
        rooms.remove(code);
    }
}
```

`B/room/application/BotDriver.java`:

```java
package com.boardgame.room.application;

import com.boardgame.game.GameAction;
import com.boardgame.game.PendingActor;
import com.boardgame.game.bot.BotBrains;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.game.bot.BotMind;
import com.boardgame.game.bot.BotPlan;
import com.boardgame.game.bot.BotSituation;
import com.boardgame.game.bot.ThinkTime;
import com.boardgame.room.domain.BotProfile;
import com.boardgame.room.domain.Participant;
import com.boardgame.room.domain.Room;
import com.boardgame.room.domain.RoomCode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Random;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;

// D1·R17~R21: 서버 안의 컴퓨터 구동. 상태가 바뀔 때마다(RoomService.broadcast) 행동할 컴퓨터마다 한 번 계획을 받아 예약하고,
// 실행 때 상태 번호가 그대로일 때만 RoomService가 사람과 같은 경로로 적용한다.
@Component
public class BotDriver {

    private static final Logger log = LoggerFactory.getLogger(BotDriver.class);

    private final BotScheduler scheduler;
    private final BotBrains brains;
    private final Random random;
    private final BotRooms rooms = new BotRooms();

    public BotDriver(BotScheduler scheduler, BotBrains brains, @Qualifier(BotConfig.RANDOM) Random random) {
        this.scheduler = scheduler;
        this.brains = brains;
        this.random = random;
    }

    /** 컴퓨터를 움직이지 않는 구동기(기존 12인자 RoomService 생성자용). 머리가 없어 아무것도 예약하지 않는다. */
    public static BotDriver idle() {
        return new BotDriver(null, new BotBrains(List.of()), new Random());
    }

    /** 상태가 바뀐 뒤 방 잠금 안에서 부른다. R19: 행동할 컴퓨터마다 한 번 예약한다. 이전 예약은 R20으로 무효가 된다. */
    public void afterChange(Room room, BotRunner runner) {
        if (!room.isGameInProgress() || room.bots().isEmpty()) {
            rooms.forget(room.code());
            return;
        }
        BotRoom state = rooms.refresh(room, () -> mindsOf(room));
        state.observe(room);
        room.pendingActors()
                .stream()
                .filter(actor -> room.isBot(actor.memberId()))
                .forEach(actor -> plan(room, state, actor, runner));
    }

    /** R20: 예약 뒤로 상태가 바뀌지 않았고 게임이 이어지며 그 컴퓨터가 아직 게임 중일 때만 참. */
    public boolean isCurrent(Room room, BotTicket ticket) {
        boolean sameState = rooms.find(ticket.code())
                .filter(state -> state.isAt(ticket.epoch()))
                .isPresent();
        return sameState && room.isPlaying(ticket.botId());
    }

    /** 신호 걸음 뒤 같은 상태 번호로 다음 걸음을 예약한다. */
    public void continueWith(BotTicket ticket, BotRunner runner) {
        ticket.next().ifPresent(next -> schedule(next, runner));
    }

    /** R21: 기존 자동 행동과 같은 결정(서버가 컴퓨터 행동을 거절했을 때 한 번). */
    public Optional<GameAction> fallback(Room room, long botId) {
        Optional<BotMind> mind = rooms.find(room.code())
                .flatMap(state -> state.mindOf(botId));
        Optional<Object> view = room.viewFor(botId);
        if (mind.isEmpty() || view.isEmpty()) {
            return Optional.empty();
        }
        return mind.get().fallback(view.get(), random);
    }

    public void forget(RoomCode code) {
        rooms.forget(code);
    }

    private Map<Long, BotMind> mindsOf(Room room) {
        Map<Long, BotMind> minds = new HashMap<>();
        room.bots().forEach(bot -> brains.mind(room.gameType(), difficultyOf(bot))
                .ifPresent(mind -> minds.put(bot.memberId(), mind)));
        return minds;
    }

    private static BotDifficulty difficultyOf(Participant bot) {
        BotProfile profile = bot.bot();
        return profile.difficulty();
    }

    private void plan(Room room, BotRoom state, PendingActor actor, BotRunner runner) {
        long botId = actor.memberId();
        Optional<BotMind> mind = state.mindOf(botId);
        Optional<Object> view = room.viewFor(botId);
        if (mind.isEmpty() || view.isEmpty()) {
            return;
        }
        BotSituation situation = new BotSituation(view.get(), actor.kind(), scheduler.now(), random);
        planSafely(mind.get(), situation)
                .ifPresent(plan -> schedule(new BotTicket(room.code(), botId, state.epoch(), plan), runner));
    }

    // R21: 판단이 예외를 내면 기록하고, 기존 자동 행동과 같은 결정을 생각 시간 뒤에 한 번 한다.
    private Optional<BotPlan> planSafely(BotMind mind, BotSituation situation) {
        try {
            return mind.plan(situation);
        } catch (RuntimeException exception) {
            log.warn("컴퓨터 판단 실패, 자동 행동으로 대신한다", exception);
            return mind.fallback(situation.view(), random)
                    .map(action -> BotPlan.act(ThinkTime.standard(random), action));
        }
    }

    private void schedule(BotTicket ticket, BotRunner runner) {
        scheduler.schedule(ticket.step().delay(), () -> runner.run(ticket));
    }
}
```

`B/room/application/RoomService.java`:
- import 추가: `com.boardgame.game.bot.BotStep`, `org.springframework.beans.factory.annotation.Autowired`.
- 필드 추가: `private final BotDriver bots;`
- 기존 생성자를 새 생성자로 위임시키고, 새 생성자를 더한다:

```java
    public RoomService(RoomRegistry registry, RoomCodeGenerator codeGenerator, GameSessionFactories sessionFactories,
                       RoomNotifier notifier, OutcomePublisher outcomePublisher,
                       ApplicationEventPublisher eventPublisher, Clock clock, PresenceTracker presence,
                       RoomPasswordHasher hasher, TurnTimer turnTimer, Random random, RoomAvatars avatars) {
        this(registry, codeGenerator, sessionFactories, notifier, outcomePublisher, eventPublisher, clock, presence,
                hasher, turnTimer, random, avatars, BotDriver.idle());
    }

    @Autowired
    public RoomService(RoomRegistry registry, RoomCodeGenerator codeGenerator, GameSessionFactories sessionFactories,
                       RoomNotifier notifier, OutcomePublisher outcomePublisher,
                       ApplicationEventPublisher eventPublisher, Clock clock, PresenceTracker presence,
                       RoomPasswordHasher hasher, TurnTimer turnTimer,
                       @Qualifier(TurnTimerConfig.RANDOM) Random random, RoomAvatars avatars, BotDriver bots) {
        this.registry = registry;
        this.codeGenerator = codeGenerator;
        this.sessionFactories = sessionFactories;
        this.notifier = notifier;
        this.outcomePublisher = outcomePublisher;
        this.eventPublisher = eventPublisher;
        this.clock = clock;
        this.presence = presence;
        this.hasher = hasher;
        this.turnTimer = turnTimer;
        this.random = random;
        this.avatars = avatars;
        this.bots = bots;
    }
```

(원래 생성자의 `@Qualifier(TurnTimerConfig.RANDOM)`은 새 생성자로 옮기고, 위임용 12인자 생성자에서는 뺀다.)

- `saveAndNotifyClosed`를 바꾼다:

```java
    private void saveAndNotifyClosed(Room room) {
        registry.save(room);
        if (!registry.exists(room.code())) {
            bots.forget(room.code());
            eventPublisher.publishEvent(new RoomClosedEvent(room.codeValue()));
        }
    }
```

- `act`를 바꾸고 아래 메서드들을 더한다:

```java
    public synchronized void act(String rawCode, long memberId, GameAction action) {
        applyAct(find(rawCode), memberId, action);
    }

    // R17: 사람과 컴퓨터가 같은 경로(검증 → 저장 → 타이머 → 방송 → 결과 발행)를 탄다.
    private void applyAct(Room room, long memberId, GameAction action) {
        List<Long> before = room.humanIds();
        List<GameOutcome> outcomes = room.act(memberId, action);
        baselineNewcomers(room, before);
        saveAndNotifyClosed(room);
        rearm(room);
        broadcast(room);
        outcomePublisher.publish(room, outcomes, clock.instant());
    }

    // R20: 예약 스레드에서 들어온다. 같은 잠금 안에서 상태 번호가 최신일 때만 그 컴퓨터의 걸음을 한다.
    private synchronized void runBot(BotTicket ticket) {
        registry.find(ticket.code())
                .filter(room -> bots.isCurrent(room, ticket))
                .ifPresent(room -> runBotStep(room, ticket));
    }

    private void runBotStep(Room room, BotTicket ticket) {
        BotStep step = ticket.step();
        if (step.isSignal()) {
            signal(room, ticket.botId(), step.action());
            bots.continueWith(ticket, this::runBot);
            return;
        }
        actAsBot(room, ticket.botId(), step.action());
    }

    // R21: 서버가 거절하면 기록하고 기존 자동 행동과 같은 결정을 한 번 시도한다.
    private void actAsBot(Room room, long botId, GameAction action) {
        try {
            applyAct(room, botId, action);
        } catch (RuntimeException exception) {
            log.warn("컴퓨터 행동 거절, 자동 행동으로 대신한다: room={}, bot={}, action={}", room.codeValue(), botId,
                    action, exception);
            fallbackAct(room, botId);
        }
    }

    // R21: 그래도 안 되면 결정 시간이 끝날 때 기존 시간 초과 처리가 진행시킨다.
    private void fallbackAct(Room room, long botId) {
        try {
            bots.fallback(room, botId).ifPresent(action -> applyAct(room, botId, action));
        } catch (RuntimeException exception) {
            log.warn("컴퓨터 자동 행동도 실패, 시간 초과 처리에 맡긴다: room={}, bot={}", room.codeValue(), botId, exception);
        }
    }
```

- `broadcast`를 바꾼다:

```java
    private RoomResponse broadcast(Room room) {
        RoomResponse response = response(room);
        notifier.roomUpdated(response);
        room.humanOccupantIds().forEach(memberId -> sendView(room, memberId));
        bots.afterChange(room, this::runBot);
        return response;
    }
```

- [ ] **Step 5: 통과 확인**

Run: `cd backend && mvn -q test -Dtest='ThinkTimeTest,BotPlanTest,BotDriverTest,BotAutoActorLogTest,RoomServiceTurnTimerTest,RoomServiceSignalTest,RoomServiceTimeoutFailureTest'`
Expected: PASS.
Run: `cd backend && mvn -q test`
Expected: PASS(스프링 컨텍스트는 등록된 `BotBrain`이 아직 없어 빈 목록으로 뜬다).

- [ ] **Step 6: 커밋**

```bash
git add backend/src/main/java/com/boardgame/game/bot/BotStepKind.java backend/src/main/java/com/boardgame/game/bot/BotStep.java \
  backend/src/main/java/com/boardgame/game/bot/BotPlan.java backend/src/main/java/com/boardgame/game/bot/BotSituation.java \
  backend/src/main/java/com/boardgame/game/bot/BotMind.java backend/src/main/java/com/boardgame/game/bot/BotBrain.java \
  backend/src/main/java/com/boardgame/game/bot/BotBrains.java backend/src/main/java/com/boardgame/game/bot/ThinkTime.java \
  backend/src/main/java/com/boardgame/room/application/BotConfig.java backend/src/main/java/com/boardgame/room/application/BotPace.java \
  backend/src/main/java/com/boardgame/room/application/BotScheduler.java backend/src/main/java/com/boardgame/room/application/BotTicket.java \
  backend/src/main/java/com/boardgame/room/application/BotRunner.java backend/src/main/java/com/boardgame/room/application/BotRoom.java \
  backend/src/main/java/com/boardgame/room/application/BotRooms.java backend/src/main/java/com/boardgame/room/application/BotDriver.java \
  backend/src/main/java/com/boardgame/room/application/RoomService.java \
  backend/src/test/resources/application.properties backend/src/test/java/com/boardgame/support/TestBotConfig.java \
  backend/src/test/java/com/boardgame/game/bot/ThinkTimeTest.java backend/src/test/java/com/boardgame/game/bot/BotPlanTest.java \
  backend/src/test/java/com/boardgame/room/application/ScriptedBrain.java backend/src/test/java/com/boardgame/room/application/BotDriverTest.java \
  backend/src/test/java/com/boardgame/room/application/BotAutoActorLogTest.java
git commit -m "$(cat <<'EOF'
feat: 컴퓨터 구동기 - 상태가 바뀔 때마다 행동할 컴퓨터마다 계획을 예약하고, 최신일 때만 사람과 같은 경로로 행동, 실패하면 자동 행동 한 번

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: 페이퍼 사파리 컴퓨터 머리(하·중·상)

**Files:**
- Create: `B/papersafari/bot/SafariSight.java`, `Guess.java`, `BoardGuess.java`, `CardOdds.java`, `SafariMoves.java`, `SafariAuto.java`, `SafariPlayer.java`, `Choice.java`, `EasySafari.java`, `MediumSafari.java`, `HardSafari.java`, `SeenCards.java`, `PaperSafariMind.java`, `PaperSafariBrain.java` (모두 `B/papersafari/bot/`)
- Test: `BT/papersafari/bot/SafariViews.java`(도우미), `BoardGuessTest.java`, `EasySafariTest.java`, `MediumSafariTest.java`, `HardSafariTest.java`, `PaperSafariMindTest.java` (모두 `BT/papersafari/bot/`)

**Interfaces:**
- Consumes: Task 5 `BotBrain`, `BotMind`, `BotPlan`, `BotSituation`, `ThinkTime`; 화면 record `PaperSafariSessionView`, `PaperSafariView`, `RoundView`, `BoardView`, `SlotView`, `CardView`, `HeldView`.
- Produces: `@Component PaperSafariBrain implements BotBrain`(`type() == PAPER_SAFARI`). Task 9 시뮬레이션과 STOMP 테스트가 `new PaperSafariBrain().mind(BotDifficulty)`를 쓴다.
- Produces: `SafariSight.of(Object view)`(R16: 화면 객체만 읽는다), `CardOdds.DECK_AVERAGE`(= 252/54), `CardOdds.remainingAverage(List<CardView> seen)`.
- 행동 글자: `FLIP`·`SWAP`·`PEEK`(column,row), `DRAW_DECK`, `DRAW_DISCARD`, `DISCARD`.

- [ ] **Step 1: 실패하는 테스트 작성**

`BT/papersafari/bot/SafariViews.java`:

```java
package com.boardgame.papersafari.bot;

import com.boardgame.papersafari.CardKind;
import com.boardgame.papersafari.DrawSource;
import com.boardgame.papersafari.GameStatus;
import com.boardgame.papersafari.TurnPhase;
import com.boardgame.papersafari.view.BoardView;
import com.boardgame.papersafari.view.CardView;
import com.boardgame.papersafari.view.HeldView;
import com.boardgame.papersafari.view.PaperSafariSessionView;
import com.boardgame.papersafari.view.PaperSafariView;
import com.boardgame.papersafari.view.RoundView;
import com.boardgame.papersafari.view.SlotView;
import java.util.List;
import java.util.stream.IntStream;

// 페이퍼 사파리 컴퓨터 테스트용 화면 만들기. 판은 위 줄 왼쪽부터 6칸(위 0·1·2, 아래 0·1·2), null = 모르는 뒷면.
final class SafariViews {

    static final long ME = -1L;
    static final long OTHER = -2L;

    private SafariViews() {
    }

    static CardView number(int value) {
        return new CardView(CardKind.NUMBER, value);
    }

    static CardView fox() {
        return new CardView(CardKind.FOX, -2);
    }

    static CardView wild() {
        return new CardView(CardKind.WILD, 0);
    }

    static CardView tarzan() {
        return new CardView(CardKind.TARZAN, 10);
    }

    static BoardView board(long playerId, CardView... cards) {
        List<SlotView> slots = IntStream.range(0, 6)
                .mapToObj(index -> new SlotView(index % 3, index / 3, cards[index] != null, false, cards[index]))
                .toList();
        return new BoardView(playerId, slots);
    }

    static HeldView fromDeck(CardView card) {
        return new HeldView(ME, DrawSource.DECK, card);
    }

    static HeldView fromDiscard(CardView card) {
        return new HeldView(ME, DrawSource.DISCARD, card);
    }

    static PaperSafariSessionView view(TurnPhase phase, long current, CardView top, HeldView held, BoardView... boards) {
        RoundView round = new RoundView(phase, current, 30, top, held, List.of(boards));
        return new PaperSafariSessionView(new PaperSafariView(ME, GameStatus.IN_ROUND, 1, round, null, null, null, 0L,
                null, List.of(), 0L));
    }

    static SafariSight sight(TurnPhase phase, CardView top, HeldView held, BoardView... boards) {
        return SafariSight.of(view(phase, ME, top, held, boards));
    }
}
```

`BT/papersafari/bot/BoardGuessTest.java`:

```java
package com.boardgame.papersafari.bot;

import static com.boardgame.papersafari.bot.SafariViews.ME;
import static com.boardgame.papersafari.bot.SafariViews.board;
import static com.boardgame.papersafari.bot.SafariViews.number;
import static com.boardgame.papersafari.bot.SafariViews.wild;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import org.junit.jupiter.api.Test;

class BoardGuessTest {

    @Test
    void R26_아는_카드는_그_값_같은_열_짝은_0점_모르는_칸은_평균이다() {
        BoardGuess known = BoardGuess.of(board(ME, number(1), number(2), number(3), number(1), number(5), number(6)), 4.5);
        BoardGuess hidden = BoardGuess.of(board(ME, number(1), number(2), number(3), null, number(5), number(6)), 4.5);

        assertThat(known.total()).isCloseTo(16.0, within(1e-9));
        assertThat(hidden.total()).isCloseTo(1 + 4.5 + 7 + 9, within(1e-9));
    }

    @Test
    void R26_와일드는_같은_줄_이웃을_복사하는_가장_낮은_해석이다() {
        BoardGuess guess = BoardGuess.of(board(ME, wild(), number(4), number(9), number(4), number(0), number(1)), 4.5);

        assertThat(guess.total()).isCloseTo(0 + 4 + 10, within(1e-9));
    }

    @Test
    void 칸을_바꾼_어림은_원래_판을_바꾸지_않는다() {
        BoardGuess guess = BoardGuess.of(board(ME, number(9), number(2), number(8), null, number(2), null), 4.5);

        BoardGuess changed = guess.with(SafariViews.sight(com.boardgame.papersafari.TurnPhase.PLACE, null, null,
                board(ME, number(9), number(2), number(8), null, number(2), null)).mySlot(0, 0), number(1));

        assertThat(changed.total()).isCloseTo(guess.total() - 8, within(1e-9));
        assertThat(guess.worthAt(SafariViews.sight(com.boardgame.papersafari.TurnPhase.PLACE, null, null,
                board(ME, number(9), number(2), number(8), null, number(2), null)).mySlot(0, 1))).isEqualTo(4.5);
    }
}
```

`BT/papersafari/bot/EasySafariTest.java`:

```java
package com.boardgame.papersafari.bot;

import static com.boardgame.papersafari.bot.SafariViews.ME;
import static com.boardgame.papersafari.bot.SafariViews.board;
import static com.boardgame.papersafari.bot.SafariViews.fromDeck;
import static com.boardgame.papersafari.bot.SafariViews.fromDiscard;
import static com.boardgame.papersafari.bot.SafariViews.number;
import static com.boardgame.papersafari.bot.SafariViews.sight;
import static com.boardgame.papersafari.bot.SafariViews.tarzan;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameAction;
import com.boardgame.papersafari.TurnPhase;
import com.boardgame.papersafari.view.BoardView;
import com.boardgame.support.FixedRandom;
import org.junit.jupiter.api.Test;

class EasySafariTest {

    private static final BoardView MINE = board(ME, number(9), number(2), number(8), null, number(2), null);
    private final EasySafari easy = new EasySafari();

    @Test
    void R25_버린_더미가_있으면_가져오고_없으면_덱에서_뽑는다() {
        assertThat(easy.draw(sight(TurnPhase.DRAW, number(9), null, MINE), new FixedRandom(0)))
                .isEqualTo(new GameAction("DRAW_DISCARD", null, null));
        assertThat(easy.draw(sight(TurnPhase.DRAW, null, null, MINE), new FixedRandom(0)))
                .isEqualTo(new GameAction("DRAW_DECK", null, null));
    }

    @Test
    void R25_덱에서_뽑은_카드는_30퍼센트로_그냥_버리고_아니면_무작위_칸에_넣는다() {
        assertThat(easy.place(sight(TurnPhase.PLACE, null, fromDeck(number(5)), MINE), new FixedRandom(10)))
                .isEqualTo(new GameAction("DISCARD", null, null));
        assertThat(easy.place(sight(TurnPhase.PLACE, null, fromDeck(number(5)), MINE), new FixedRandom(40)))
                .isEqualTo(new GameAction("SWAP", 1, 1));
    }

    @Test
    void R25_타잔과_버린_더미_카드는_버리지_않고_무작위_칸에_넣는다() {
        assertThat(easy.place(sight(TurnPhase.PLACE, null, fromDeck(tarzan()), MINE), new FixedRandom(10)))
                .isEqualTo(new GameAction("SWAP", 1, 1));
        assertThat(easy.place(sight(TurnPhase.PLACE, null, fromDiscard(number(1)), MINE), new FixedRandom(10)))
                .isEqualTo(new GameAction("SWAP", 1, 1));
    }

    @Test
    void R24_R25_처음_뒤집기와_엿보기는_무작위_뒷면_칸이다() {
        assertThat(easy.flip(sight(TurnPhase.SETUP_FLIP, null, null, MINE), new FixedRandom(1)))
                .isEqualTo(new GameAction("FLIP", 2, 1));
        assertThat(easy.peek(sight(TurnPhase.PEEK, null, null, MINE), new FixedRandom(0)))
                .isEqualTo(new GameAction("PEEK", 0, 1));
    }
}
```

`BT/papersafari/bot/MediumSafariTest.java`:

```java
package com.boardgame.papersafari.bot;

import static com.boardgame.papersafari.bot.SafariViews.ME;
import static com.boardgame.papersafari.bot.SafariViews.board;
import static com.boardgame.papersafari.bot.SafariViews.fromDeck;
import static com.boardgame.papersafari.bot.SafariViews.fromDiscard;
import static com.boardgame.papersafari.bot.SafariViews.number;
import static com.boardgame.papersafari.bot.SafariViews.sight;
import static com.boardgame.papersafari.bot.SafariViews.wild;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameAction;
import com.boardgame.papersafari.TurnPhase;
import com.boardgame.papersafari.view.BoardView;
import com.boardgame.support.FixedRandom;
import org.junit.jupiter.api.Test;

class MediumSafariTest {

    private static final BoardView MINE = board(ME, number(9), number(2), number(8), null, number(2), null);
    private static final GameAction FROM_DISCARD = new GameAction("DRAW_DISCARD", null, null);
    private static final GameAction FROM_DECK = new GameAction("DRAW_DECK", null, null);
    private final MediumSafari medium = new MediumSafari();

    @Test
    void R26_버린_더미_카드가_3점_이하이거나_와일드거나_짝을_만들면_가져온다() {
        FixedRandom random = new FixedRandom(0);

        assertThat(medium.draw(sight(TurnPhase.DRAW, number(3), null, MINE), random)).isEqualTo(FROM_DISCARD);
        assertThat(medium.draw(sight(TurnPhase.DRAW, wild(), null, MINE), random)).isEqualTo(FROM_DISCARD);
        assertThat(medium.draw(sight(TurnPhase.DRAW, number(9), null, MINE), random)).isEqualTo(FROM_DISCARD);
        assertThat(medium.draw(sight(TurnPhase.DRAW, number(7), null, MINE), random)).isEqualTo(FROM_DECK);
        assertThat(medium.draw(sight(TurnPhase.DRAW, number(2), null, MINE), random)).isEqualTo(FROM_DISCARD);
        assertThat(medium.draw(sight(TurnPhase.DRAW, null, null, MINE), random)).isEqualTo(FROM_DECK);
    }

    @Test
    void R26_이미_짝인_열과_같은_카드는_짝을_새로_만들지_않는다() {
        BoardView paired = board(ME, number(9), number(6), number(8), null, number(6), null);

        assertThat(medium.draw(sight(TurnPhase.DRAW, number(6), null, paired), new FixedRandom(0))).isEqualTo(FROM_DECK);
    }

    @Test
    void R26_가져온_카드는_점수가_가장_많이_줄어드는_칸에_넣는다() {
        assertThat(medium.place(sight(TurnPhase.PLACE, null, fromDeck(number(1)), MINE), new FixedRandom(0)))
                .isEqualTo(new GameAction("SWAP", 0, 0));
    }

    @Test
    void R26_줄어드는_칸이_없으면_덱_카드는_버리고_버린_더미_카드는_가장_손해가_적은_칸에_넣는다() {
        BoardView low = board(ME, number(1), number(2), number(0), number(1), number(2), number(0));

        assertThat(medium.place(sight(TurnPhase.PLACE, null, fromDeck(number(9)), low), new FixedRandom(0)))
                .isEqualTo(new GameAction("DISCARD", null, null));
        assertThat(medium.place(sight(TurnPhase.PLACE, null, fromDiscard(number(9)), low), new FixedRandom(0)))
                .isEqualTo(new GameAction("SWAP", 2, 0));
    }

    @Test
    void R26_코끼리_엿보기는_같은_열_반대쪽을_아는_뒷면_칸이_먼저다() {
        BoardView mine = board(ME, number(5), null, null, null, null, null);

        assertThat(medium.peek(sight(TurnPhase.PEEK, null, null, mine), new FixedRandom(3)))
                .isEqualTo(new GameAction("PEEK", 0, 1));
    }
}
```

`BT/papersafari/bot/HardSafariTest.java`:

```java
package com.boardgame.papersafari.bot;

import static com.boardgame.papersafari.bot.SafariViews.ME;
import static com.boardgame.papersafari.bot.SafariViews.OTHER;
import static com.boardgame.papersafari.bot.SafariViews.board;
import static com.boardgame.papersafari.bot.SafariViews.fox;
import static com.boardgame.papersafari.bot.SafariViews.fromDeck;
import static com.boardgame.papersafari.bot.SafariViews.number;
import static com.boardgame.papersafari.bot.SafariViews.sight;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;

import com.boardgame.game.GameAction;
import com.boardgame.papersafari.TurnPhase;
import com.boardgame.papersafari.view.BoardView;
import com.boardgame.papersafari.view.CardView;
import com.boardgame.papersafari.view.SlotView;
import com.boardgame.support.FixedRandom;
import java.util.Collections;
import java.util.List;
import org.junit.jupiter.api.Test;

class HardSafariTest {

    // 내 판: 1·1 짝, 2·2 짝, 위 3 / 아래 뒷면 하나만 남음.
    private static final BoardView MINE = board(ME, number(1), number(2), number(3), number(1), number(2), null);
    // 상대 판(모두 앞면): 1+3 = 4점, 0·0 짝, 5·5 짝 → 4점.
    private static final BoardView CLOSE = board(OTHER, number(1), number(0), number(5), number(3), number(0), number(5));
    // 상대 판: 4+6 = 10점.
    private static final BoardView FAR = board(OTHER, number(4), number(0), number(5), number(6), number(0), number(5));

    private HardSafari hard() {
        return new HardSafari(new SeenCards());
    }

    @Test
    void R27_남은_카드_평균은_공개된_카드를_54장에서_뺀_나머지_평균이다() {
        List<CardView> zeros = Collections.nCopies(4, number(0));

        assertThat(CardOdds.DECK_AVERAGE).isCloseTo(252.0 / 54, within(1e-9));
        assertThat(CardOdds.remainingAverage(zeros)).isCloseTo(252.0 / 50, within(1e-9));
    }

    @Test
    void R27_판을_끝내는_수는_다른_사람보다_2점_이상_낮을_때만_둔다() {
        GameAction close = hard().place(sight(TurnPhase.PLACE, null, fromDeck(number(0)), MINE, CLOSE), new FixedRandom(0));
        GameAction far = hard().place(sight(TurnPhase.PLACE, null, fromDeck(number(0)), MINE, FAR), new FixedRandom(0));

        assertThat(close).isEqualTo(new GameAction("SWAP", 2, 0));
        assertThat(far).isEqualTo(new GameAction("SWAP", 2, 1));
    }

    @Test
    void 상끼리_판이_끝나지_않는_것을_막으려고_내_놓기가_20번을_넘으면_지지_않을_때_끝낸다() {
        HardSafari hard = hard();
        SafariSight sight = sight(TurnPhase.PLACE, null, fromDeck(number(0)), MINE, CLOSE);

        for (int placement = 0; placement < 20; placement++) {
            assertThat(hard.place(sight, new FixedRandom(0))).isEqualTo(new GameAction("SWAP", 2, 0));
        }

        assertThat(hard.place(sight, new FixedRandom(0))).isEqualTo(new GameAction("SWAP", 2, 1));
    }

    @Test
    void R27_같은_이득이면_밀려나는_카드_점수가_높은_칸을_먼저_고른다() {
        SlotView low = new SlotView(0, 0, true, false, number(-2));
        SlotView high = new SlotView(1, 0, true, false, number(2));

        List<Choice> ordered = HardSafari.preferPushingHigh(List.of(new Choice(low, -12, -2), new Choice(high, -12, 2),
                new Choice(low, -20, 9)));

        assertThat(ordered).extracting(Choice::slot).containsExactly(high, low, low);
    }

    @Test
    void R27_여우는_짝이_없는_열_중_합이_가장_큰_열의_큰_칸에_넣는다() {
        BoardView mine = board(ME, number(9), number(5), number(4), number(3), number(5), number(2));

        assertThat(hard().place(sight(TurnPhase.PLACE, null, fromDeck(fox()), mine), new FixedRandom(0)))
                .isEqualTo(new GameAction("SWAP", 0, 0));
    }

    @Test
    void R24_처음_뒤집기는_위_아래_줄을_고른_뒤_그_줄의_칸을_고른다() {
        BoardView hidden = board(ME, null, null, null, null, null, null);

        assertThat(hard().flip(sight(TurnPhase.SETUP_FLIP, null, null, hidden), new FixedRandom(1)))
                .isEqualTo(new GameAction("FLIP", 1, 1));
    }

    @Test
    void R27_버린_더미_기억은_맨_위가_바뀔_때_쌓고_누가_가져가면_뺀다() {
        SeenCards seen = new SeenCards();
        BoardView mine = board(ME, null, null, null, null, null, null);

        seen.observe(sight(TurnPhase.DRAW, number(7), null, mine));
        seen.observe(sight(TurnPhase.DRAW, number(3), null, mine));
        seen.observe(sight(TurnPhase.PLACE, number(7), new com.boardgame.papersafari.view.HeldView(OTHER,
                com.boardgame.papersafari.DrawSource.DISCARD, number(3)), mine));

        assertThat(seen.seenWith(sight(TurnPhase.DRAW, number(7), null, mine))).containsExactly(number(7));
    }
}
```

`BT/papersafari/bot/PaperSafariMindTest.java`:

```java
package com.boardgame.papersafari.bot;

import static com.boardgame.papersafari.bot.SafariViews.ME;
import static com.boardgame.papersafari.bot.SafariViews.OTHER;
import static com.boardgame.papersafari.bot.SafariViews.board;
import static com.boardgame.papersafari.bot.SafariViews.number;
import static com.boardgame.papersafari.bot.SafariViews.view;
import static org.assertj.core.api.Assertions.assertThat;

import com.boardgame.game.GameAction;
import com.boardgame.game.GameType;
import com.boardgame.game.PendingKind;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.game.bot.BotMind;
import com.boardgame.game.bot.BotPlan;
import com.boardgame.game.bot.BotSituation;
import com.boardgame.papersafari.PaperSafariSession;
import com.boardgame.papersafari.RoundFactory;
import com.boardgame.papersafari.TurnPhase;
import com.boardgame.papersafari.view.BoardView;
import com.boardgame.papersafari.view.SlotView;
import com.boardgame.support.FixedRandom;
import com.boardgame.support.MutableClock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class PaperSafariMindTest {

    private static final BoardView MINE = board(ME, number(9), number(2), number(8), null, number(2), null);
    private static final BoardView THEIRS = board(OTHER, null, null, null, null, null, null);
    private final PaperSafariBrain brain = new PaperSafariBrain();

    private Optional<BotPlan> plan(BotMind mind, Object view) {
        return mind.plan(new BotSituation(view, PendingKind.TURN, Instant.EPOCH, new FixedRandom(0)));
    }

    @Test
    void 머리는_페이퍼_사파리_것이고_난이도마다_새_마음을_만든다() {
        assertThat(brain.type()).isEqualTo(GameType.PAPER_SAFARI);
        assertThat(brain.mind(BotDifficulty.HARD)).isNotSameAs(brain.mind(BotDifficulty.HARD));
    }

    @Test
    void R19_내_차례면_생각_시간_뒤에_한_번_행동한다() {
        Optional<BotPlan> plan = plan(brain.mind(BotDifficulty.MEDIUM), view(TurnPhase.DRAW, ME, number(3), null, MINE, THEIRS));

        assertThat(plan).contains(BotPlan.act(Duration.ofMillis(800), new GameAction("DRAW_DISCARD", null, null)));
    }

    @Test
    void 내_결정을_기다리지_않으면_아무것도_하지_않는다() {
        BotMind mind = brain.mind(BotDifficulty.EASY);

        assertThat(plan(mind, view(TurnPhase.DRAW, OTHER, number(3), null, MINE, THEIRS))).isEmpty();
        assertThat(plan(mind, view(TurnPhase.ROUND_OVER, ME, number(3), null, MINE, THEIRS))).isEmpty();
        assertThat(plan(mind, view(TurnPhase.SETUP_FLIP, ME, number(3), null, MINE, THEIRS))).isEmpty();
    }

    @Test
    void R21_자동_행동_대체는_기존_autoAct와_같은_결정이다() {
        BotMind mind = brain.mind(BotDifficulty.HARD);

        assertThat(mind.fallback(view(TurnPhase.DRAW, ME, number(9), null, MINE, THEIRS), new FixedRandom(0)))
                .contains(new GameAction("DRAW_DISCARD", null, null));
        assertThat(mind.fallback(view(TurnPhase.DRAW, ME, null, null, MINE, THEIRS), new FixedRandom(0)))
                .contains(new GameAction("DRAW_DECK", null, null));
        assertThat(mind.fallback(view(TurnPhase.DRAW, OTHER, null, null, MINE, THEIRS), new FixedRandom(0))).isEmpty();
    }

    @Test
    void R16_실제_세션의_컴퓨터_시야에는_남의_뒷면_카드가_없고_고른_행동을_세션이_받아_준다() {
        PaperSafariSession session = new PaperSafariSession(List.of(-1L, -2L), RoundFactory.random(),
                new MutableClock(Instant.parse("2026-10-08T00:00:00Z")));
        Object view = session.viewFor(-1L);
        SafariSight sight = SafariSight.of(view);

        assertThat(sight.opponents()).flatExtracting(BoardView::slots)
                .filteredOn(slot -> !slot.faceUp())
                .extracting(SlotView::card)
                .containsOnlyNulls();
        BotPlan plan = brain.mind(BotDifficulty.HARD)
                .plan(new BotSituation(view, PendingKind.TOGETHER, Instant.EPOCH, new FixedRandom(0)))
                .orElseThrow();
        session.act(-1L, plan.first().action());
        assertThat(SafariSight.of(session.viewFor(-1L)).mySlots()).filteredOn(SlotView::faceUp).hasSize(1);
    }
}
```

- [ ] **Step 2: 실패 확인**

Run: `cd backend && mvn -q test -Dtest='BoardGuessTest,EasySafariTest,MediumSafariTest,HardSafariTest,PaperSafariMindTest'`
Expected: 컴파일 실패(`com.boardgame.papersafari.bot` 패키지 없음).

- [ ] **Step 3: 구현**

`B/papersafari/bot/SafariSight.java`:

```java
package com.boardgame.papersafari.bot;

import com.boardgame.papersafari.CardKind;
import com.boardgame.papersafari.DrawSource;
import com.boardgame.papersafari.TurnPhase;
import com.boardgame.papersafari.view.BoardView;
import com.boardgame.papersafari.view.CardView;
import com.boardgame.papersafari.view.HeldView;
import com.boardgame.papersafari.view.PaperSafariSessionView;
import com.boardgame.papersafari.view.PaperSafariView;
import com.boardgame.papersafari.view.RoundView;
import com.boardgame.papersafari.view.SlotView;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.IntStream;
import java.util.stream.Stream;

// R16: 컴퓨터 자리 화면(PaperSafariView)에서 판단에 쓰는 것만 꺼낸다. 남의 뒷면 카드는 화면에 없으므로 여기에도 없다.
public record SafariSight(long me, RoundView round) {

    private static final int COLUMNS = 3;

    public static SafariSight of(Object view) {
        PaperSafariView game = ((PaperSafariSessionView) view).game();
        return new SafariSight(game.viewerId(), game.round());
    }

    public TurnPhase phase() {
        return round.phase();
    }

    public boolean isMyTurn() {
        return round.currentPlayerId() == me;
    }

    // 지금 내 결정을 기다리는지: 처음 뒤집기는 내 판에 앞면이 없을 때, 그 밖에는 내 차례일 때.
    public boolean awaitsMe() {
        if (phase() == TurnPhase.SETUP_FLIP) {
            return mySlots().stream().noneMatch(SlotView::faceUp);
        }
        return phase().isPlaying() && isMyTurn();
    }

    public BoardView myBoard() {
        return round.boards()
                .stream()
                .filter(board -> board.playerId() == me)
                .findFirst()
                .orElseThrow();
    }

    public List<SlotView> mySlots() {
        BoardView board = myBoard();
        return board.slots();
    }

    public List<SlotView> myFaceDown() {
        return mySlots().stream()
                .filter(slot -> !slot.faceUp())
                .toList();
    }

    public SlotView mySlot(int column, int row) {
        return mySlots().stream()
                .filter(slot -> slot.column() == column && slot.row() == row)
                .findFirst()
                .orElseThrow();
    }

    public List<BoardView> opponents() {
        return round.boards()
                .stream()
                .filter(board -> board.playerId() != me)
                .toList();
    }

    public Optional<CardView> discardTop() {
        return Optional.ofNullable(round.discardTop());
    }

    public Optional<HeldView> held() {
        return Optional.ofNullable(round.held());
    }

    public CardView heldCard() {
        HeldView held = round.held();
        return held.card();
    }

    public boolean heldFromDeck() {
        return held().filter(held -> held.source() == DrawSource.DECK).isPresent();
    }

    public boolean heldIs(CardKind kind) {
        return held().map(HeldView::card)
                .filter(card -> card.kind() == kind)
                .isPresent();
    }

    // R26: 이 카드가 내 아는 카드와 같은 열에서 새 짝을 만드는지(이미 짝인 열은 빼고).
    public boolean pairsWithMine(CardView card) {
        return IntStream.range(0, COLUMNS).anyMatch(column -> completesPair(column, card));
    }

    public boolean partnerKnown(SlotView slot) {
        SlotView partner = mySlot(slot.column(), 1 - slot.row());
        return partner.card() != null;
    }

    // R27: 지금 화면에 보이는 카드(모든 앞면, 내가 아는 뒷면, 들고 있는 카드가 보이면 그것).
    public List<CardView> visibleCards() {
        Stream<CardView> boards = round.boards()
                .stream()
                .flatMap(board -> board.slots().stream())
                .map(SlotView::card)
                .filter(Objects::nonNull);
        Stream<CardView> held = held().map(HeldView::card)
                .stream()
                .filter(Objects::nonNull);
        return Stream.concat(boards, held).toList();
    }

    private boolean completesPair(int column, CardView card) {
        Guess top = Guess.of(mySlot(column, 0));
        Guess bottom = Guess.of(mySlot(column, 1));
        if (top.pairs(bottom)) {
            return false;
        }
        return top.matches(card) || bottom.matches(card);
    }
}
```

`B/papersafari/bot/Guess.java`:

```java
package com.boardgame.papersafari.bot;

import com.boardgame.papersafari.CardKind;
import com.boardgame.papersafari.view.CardView;
import com.boardgame.papersafari.view.SlotView;

// 칸 하나의 어림: value가 null이면 모르는 뒷면. wild면 같은 줄 이웃을 복사한다.
record Guess(Integer value, boolean wild) {

    static final Guess UNKNOWN = new Guess(null, false);

    static Guess of(SlotView slot) {
        if (slot.card() == null) {
            return UNKNOWN;
        }
        return of(slot.card());
    }

    static Guess of(CardView card) {
        return new Guess(card.value(), card.kind() == CardKind.WILD);
    }

    boolean known() {
        return value != null;
    }

    double worth(double unknown) {
        if (!known()) {
            return unknown;
        }
        return value;
    }

    boolean pairs(Guess other) {
        return known() && value.equals(other.value());
    }

    boolean matches(CardView card) {
        return known() && value == card.value();
    }

    Guess zeroIfWild() {
        if (!wild) {
            return this;
        }
        return new Guess(0, false);
    }
}
```

`B/papersafari/bot/BoardGuess.java`:

```java
package com.boardgame.papersafari.bot;

import com.boardgame.papersafari.view.BoardView;
import com.boardgame.papersafari.view.CardView;
import com.boardgame.papersafari.view.SlotView;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

// R26·R27: 판 점수 어림. 아는 카드(앞면·엿본 뒷면)는 그 값, 모르는 뒷면은 unknown 평균, 같은 열 같은 값은 0점,
// 와일드는 같은 줄 이웃을 복사하는 해석 중 가장 낮은 합(BoardScore와 같은 규칙).
final class BoardGuess {

    private static final int COLUMNS = 3;

    private final List<Guess> cells;
    private final double unknown;

    private BoardGuess(List<Guess> cells, double unknown) {
        this.cells = cells;
        this.unknown = unknown;
    }

    static BoardGuess of(BoardView board, double unknown) {
        List<Guess> cells = IntStream.range(0, COLUMNS * 2)
                .mapToObj(index -> Guess.of(slotAt(board, index)))
                .toList();
        return new BoardGuess(cells, unknown);
    }

    BoardGuess with(SlotView slot, CardView card) {
        List<Guess> changed = new ArrayList<>(cells);
        changed.set(indexOf(slot.column(), slot.row()), Guess.of(card));
        return new BoardGuess(List.copyOf(changed), unknown);
    }

    double worthAt(SlotView slot) {
        return at(slot.column(), slot.row()).worth(unknown);
    }

    boolean isPaired(int column) {
        return at(column, 0).pairs(at(column, 1));
    }

    double columnSum(int column) {
        return at(column, 0).worth(unknown) + at(column, 1).worth(unknown);
    }

    double total() {
        List<List<Guess>> bottoms = rowsOf(1);
        return rowsOf(0).stream()
                .flatMap(top -> bottoms.stream().map(bottom -> pairUp(top, bottom)))
                .min(Double::compare)
                .orElseThrow();
    }

    private double pairUp(List<Guess> top, List<Guess> bottom) {
        return IntStream.range(0, COLUMNS)
                .mapToDouble(column -> columnScore(top.get(column), bottom.get(column)))
                .sum();
    }

    private double columnScore(Guess top, Guess bottom) {
        if (top.pairs(bottom)) {
            return 0;
        }
        return top.worth(unknown) + bottom.worth(unknown);
    }

    // 한 줄의 와일드 해석들(와일드마다 왼쪽/오른쪽 이웃 복사). 해석이 하나도 없으면 와일드는 0점.
    private List<List<Guess>> rowsOf(int row) {
        List<List<Guess>> resolved = IntStream.range(0, 1 << COLUMNS)
                .mapToObj(mask -> resolve(row, mask))
                .flatMap(Optional::stream)
                .distinct()
                .toList();
        if (resolved.isEmpty()) {
            return List.of(zeroWilds(row));
        }
        return resolved;
    }

    private Optional<List<Guess>> resolve(int row, int mask) {
        List<Optional<Guess>> line = IntStream.range(0, COLUMNS)
                .mapToObj(column -> follow(row, column, mask, 0))
                .toList();
        if (line.stream().anyMatch(Optional::isEmpty)) {
            return Optional.empty();
        }
        return Optional.of(line.stream().map(Optional::orElseThrow).toList());
    }

    private Optional<Guess> follow(int row, int column, int mask, int depth) {
        Guess guess = at(column, row);
        if (!guess.wild()) {
            return Optional.of(guess);
        }
        int next = column + stepOf(mask, column);
        if (next < 0 || next >= COLUMNS || depth >= COLUMNS) {
            return Optional.empty();
        }
        return follow(row, next, mask, depth + 1);
    }

    private static int stepOf(int mask, int column) {
        if ((mask >> column & 1) == 1) {
            return 1;
        }
        return -1;
    }

    private List<Guess> zeroWilds(int row) {
        return IntStream.range(0, COLUMNS)
                .mapToObj(column -> at(column, row))
                .map(Guess::zeroIfWild)
                .toList();
    }

    private Guess at(int column, int row) {
        return cells.get(indexOf(column, row));
    }

    private static int indexOf(int column, int row) {
        return row * COLUMNS + column;
    }

    private static SlotView slotAt(BoardView board, int index) {
        return board.slots()
                .stream()
                .filter(slot -> indexOf(slot.column(), slot.row()) == index)
                .findFirst()
                .orElseThrow();
    }
}
```

`B/papersafari/bot/CardOdds.java`:

```java
package com.boardgame.papersafari.bot;

import com.boardgame.papersafari.Card;
import com.boardgame.papersafari.StandardDeck;
import com.boardgame.papersafari.view.CardView;
import java.util.ArrayList;
import java.util.List;

// R28: 모르는 카드 한 장의 평균 점수. 하·중은 54장 덱 전체 평균(상수 252/54), 상은 공개된 카드를 뺀 나머지 평균(R27).
public final class CardOdds {

    public static final double DECK_AVERAGE = averageOf(deckValues());

    private CardOdds() {
    }

    public static double remainingAverage(List<CardView> seen) {
        List<Integer> pool = new ArrayList<>(deckValues());
        seen.forEach(card -> pool.remove(Integer.valueOf(card.value())));
        if (pool.isEmpty()) {
            return DECK_AVERAGE;
        }
        return averageOf(pool);
    }

    private static List<Integer> deckValues() {
        return StandardDeck.cards()
                .stream()
                .map(Card::faceValue)
                .toList();
    }

    private static double averageOf(List<Integer> values) {
        return values.stream()
                .mapToInt(Integer::intValue)
                .average()
                .orElse(0);
    }
}
```

`B/papersafari/bot/SafariMoves.java`:

```java
package com.boardgame.papersafari.bot;

import com.boardgame.game.GameAction;
import com.boardgame.papersafari.CardKind;
import com.boardgame.papersafari.view.SlotView;

// 페이퍼 사파리 행동 글자(PaperSafariCommand와 같은 이름).
final class SafariMoves {

    private SafariMoves() {
    }

    static GameAction flip(SlotView slot) {
        return at("FLIP", slot);
    }

    static GameAction swap(SlotView slot) {
        return at("SWAP", slot);
    }

    static GameAction peek(SlotView slot) {
        return at("PEEK", slot);
    }

    static GameAction drawDeck() {
        return new GameAction("DRAW_DECK", null, null);
    }

    static GameAction drawDiscard() {
        return new GameAction("DRAW_DISCARD", null, null);
    }

    static GameAction discard() {
        return new GameAction("DISCARD", null, null);
    }

    // 덱에서 뽑은 카드만 버릴 수 있고, 타잔은 반드시 바꿔 넣는다(DrawnCard.validateDiscardable).
    static boolean canDiscard(SafariSight sight) {
        return sight.heldFromDeck() && !sight.heldIs(CardKind.TARZAN);
    }

    private static GameAction at(String type, SlotView slot) {
        return new GameAction(type, slot.column(), slot.row());
    }
}
```

`B/papersafari/bot/SafariAuto.java`:

```java
package com.boardgame.papersafari.bot;

import com.boardgame.game.GameAction;
import com.boardgame.papersafari.view.SlotView;
import java.util.List;
import java.util.Optional;
import java.util.Random;

// R21·R25: 기존 자동 행동(PaperSafariRound.autoAct)과 같은 결정. 하도 이것을 쓴다.
final class SafariAuto {

    private SafariAuto() {
    }

    static GameAction flip(SafariSight sight, Random random) {
        return SafariMoves.flip(pick(sight.myFaceDown(), random));
    }

    static GameAction draw(SafariSight sight) {
        if (sight.discardTop().isPresent()) {
            return SafariMoves.drawDiscard();
        }
        return SafariMoves.drawDeck();
    }

    static GameAction place(SafariSight sight, Random random) {
        return SafariMoves.swap(pick(sight.mySlots(), random));
    }

    static GameAction peek(SafariSight sight, Random random) {
        return SafariMoves.peek(pick(sight.myFaceDown(), random));
    }

    static Optional<GameAction> fallback(SafariSight sight, Random random) {
        if (!sight.awaitsMe()) {
            return Optional.empty();
        }
        return Optional.of(decide(sight, random));
    }

    static SlotView pick(List<SlotView> slots, Random random) {
        return slots.get(random.nextInt(slots.size()));
    }

    private static GameAction decide(SafariSight sight, Random random) {
        return switch (sight.phase()) {
            case SETUP_FLIP -> flip(sight, random);
            case DRAW -> draw(sight);
            case PLACE -> place(sight, random);
            case PEEK, ROUND_OVER -> peek(sight, random);
        };
    }
}
```

`B/papersafari/bot/SafariPlayer.java`:

```java
package com.boardgame.papersafari.bot;

import com.boardgame.game.GameAction;
import java.util.Random;

// 난이도별 페이퍼 사파리 판단. 단계마다 하나씩.
interface SafariPlayer {

    GameAction flip(SafariSight sight, Random random);

    GameAction draw(SafariSight sight, Random random);

    GameAction place(SafariSight sight, Random random);

    GameAction peek(SafariSight sight, Random random);
}
```

`B/papersafari/bot/Choice.java`:

```java
package com.boardgame.papersafari.bot;

import com.boardgame.papersafari.view.SlotView;

// 들고 있는 카드를 slot에 넣을 때: gain = 줄어드는 점수(어림), pushed = 밀려나는 카드의 어림 점수.
record Choice(SlotView slot, double gain, double pushed) {
}
```

`B/papersafari/bot/EasySafari.java`:

```java
package com.boardgame.papersafari.bot;

import com.boardgame.game.GameAction;
import java.util.Random;

// R24·R25: 하 — 기존 자동 행동 그대로(버린 더미가 있으면 가져오고 없으면 덱, 무작위 칸, 무작위 엿보기),
// 단 덱에서 뽑은 카드는 30% 확률로 그냥 버린다.
final class EasySafari implements SafariPlayer {

    private static final int DISCARD_PERCENT = 30;

    @Override
    public GameAction flip(SafariSight sight, Random random) {
        return SafariAuto.flip(sight, random);
    }

    @Override
    public GameAction draw(SafariSight sight, Random random) {
        return SafariAuto.draw(sight);
    }

    @Override
    public GameAction place(SafariSight sight, Random random) {
        if (SafariMoves.canDiscard(sight) && random.nextInt(100) < DISCARD_PERCENT) {
            return SafariMoves.discard();
        }
        return SafariAuto.place(sight, random);
    }

    @Override
    public GameAction peek(SafariSight sight, Random random) {
        return SafariAuto.peek(sight, random);
    }
}
```

`B/papersafari/bot/MediumSafari.java`:

```java
package com.boardgame.papersafari.bot;

import com.boardgame.game.GameAction;
import com.boardgame.papersafari.CardKind;
import com.boardgame.papersafari.view.CardView;
import com.boardgame.papersafari.view.SlotView;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Random;

// R26: 중 — 점수가 낮거나 짝을 만들거나 와일드인 버린 카드를 가져오고, 바꿨을 때 점수가 가장 많이 줄어드는 칸에 넣는다.
class MediumSafari implements SafariPlayer {

    private static final int LOW_SCORE = 3;

    @Override
    public GameAction flip(SafariSight sight, Random random) {
        return SafariAuto.flip(sight, random);
    }

    @Override
    public GameAction draw(SafariSight sight, Random random) {
        boolean take = sight.discardTop()
                .filter(card -> worthTaking(sight, card))
                .isPresent();
        if (take) {
            return SafariMoves.drawDiscard();
        }
        return SafariMoves.drawDeck();
    }

    // 줄어드는 칸이 없으면 덱 카드는 버리고, 버린 더미 카드(와 타잔)는 손해가 가장 적은 칸에 넣는다.
    @Override
    public GameAction place(SafariSight sight, Random random) {
        Choice best = rank(sight, sight.heldCard()).get(0);
        if (best.gain() > 0 || !SafariMoves.canDiscard(sight)) {
            return SafariMoves.swap(best.slot());
        }
        return SafariMoves.discard();
    }

    // 짝 정보가 가장 많이 생기는 뒷면 칸(같은 열 반대쪽을 아는 칸 우선).
    @Override
    public GameAction peek(SafariSight sight, Random random) {
        List<SlotView> unknown = sight.myFaceDown()
                .stream()
                .filter(slot -> !slot.known())
                .toList();
        List<SlotView> informative = unknown.stream()
                .filter(sight::partnerKnown)
                .toList();
        return SafariMoves.peek(SafariAuto.pick(firstNonEmpty(informative, unknown, sight.myFaceDown()), random));
    }

    // R28: 하·중은 덱 전체 평균을 쓴다.
    protected double unknownAverage(SafariSight sight) {
        return CardOdds.DECK_AVERAGE;
    }

    // 이득이 큰 순서(같으면 칸 순서).
    protected List<Choice> rank(SafariSight sight, CardView card) {
        BoardGuess board = BoardGuess.of(sight.myBoard(), unknownAverage(sight));
        double before = board.total();
        return sight.mySlots()
                .stream()
                .map(slot -> new Choice(slot, before - board.with(slot, card).total(), board.worthAt(slot)))
                .sorted(Comparator.comparingDouble(Choice::gain).reversed())
                .toList();
    }

    private boolean worthTaking(SafariSight sight, CardView card) {
        return card.value() <= LOW_SCORE || card.kind() == CardKind.WILD || sight.pairsWithMine(card);
    }

    @SafeVarargs
    private static List<SlotView> firstNonEmpty(List<SlotView>... candidates) {
        return Arrays.stream(candidates)
                .filter(list -> !list.isEmpty())
                .findFirst()
                .orElseThrow();
    }
}
```

`B/papersafari/bot/HardSafari.java`:

```java
package com.boardgame.papersafari.bot;

import com.boardgame.game.GameAction;
import com.boardgame.papersafari.CardKind;
import com.boardgame.papersafari.view.CardView;
import com.boardgame.papersafari.view.SlotView;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.Random;
import java.util.stream.IntStream;

// R24·R27: 상 — 중에 남은 카드 기대값, 판을 끝내는 수의 조건, 타잔 밀어내기, 와일드·여우 자리를 더한다.
final class HardSafari extends MediumSafari {

    private static final double SAFE_MARGIN = 2.0;
    // 모두가 상이면 아무도 판을 끝내지 않을 수 있다. 내 놓기가 PATIENCE번을 넘으면 지지 않을 때 끝내고, LIMIT번을 넘으면 가리지 않는다.
    private static final int PATIENCE = 20;
    private static final int LIMIT = 30;
    private static final int ROWS = 2;
    private static final int COLUMNS = 3;

    private final SeenCards seen;
    private int placements;

    HardSafari(SeenCards seen) {
        this.seen = seen;
    }

    // R24: 위·아래 줄 중 한 줄을 고르게 고른 뒤 그 줄의 뒷면 칸.
    @Override
    public GameAction flip(SafariSight sight, Random random) {
        int row = random.nextInt(ROWS);
        List<SlotView> line = sight.myFaceDown()
                .stream()
                .filter(slot -> slot.row() == row)
                .toList();
        if (line.isEmpty()) {
            return SafariAuto.flip(sight, random);
        }
        return SafariMoves.flip(SafariAuto.pick(line, random));
    }

    @Override
    public GameAction place(SafariSight sight, Random random) {
        placements++;
        return super.place(sight, random);
    }

    @Override
    protected double unknownAverage(SafariSight sight) {
        return CardOdds.remainingAverage(seen.seenWith(sight));
    }

    @Override
    protected List<Choice> rank(SafariSight sight, CardView card) {
        List<Choice> ordered = tarzanFirst(sight, super.rank(sight, card));
        List<Choice> allowed = ordered.stream()
                .filter(choice -> mayEnd(sight, choice, card))
                .toList();
        List<Choice> usable = allowed.isEmpty() ? ordered : allowed;
        return lowCardToBigColumn(sight, card, usable);
    }

    // R27: 같은 이득이면 밀려나는 카드 점수가 높은 칸(타잔으로 왼쪽 사람 판에 간다).
    static List<Choice> preferPushingHigh(List<Choice> choices) {
        return choices.stream()
                .sorted(Comparator.comparingDouble(Choice::gain).reversed()
                        .thenComparing(Comparator.comparingDouble(Choice::pushed).reversed()))
                .toList();
    }

    private List<Choice> tarzanFirst(SafariSight sight, List<Choice> ranked) {
        if (!sight.heldFromDeck() || !sight.heldIs(CardKind.TARZAN)) {
            return ranked;
        }
        return preferPushingHigh(ranked);
    }

    // R27: 마지막 뒷면 칸을 채워 판을 끝내는 수는 다른 사람들(보이는 점수 + 뒷면 기대값)보다 2점 이상 낮을 때만.
    private boolean mayEnd(SafariSight sight, Choice choice, CardView card) {
        if (!endsRound(sight, choice) || placements > LIMIT) {
            return true;
        }
        double margin = placements > PATIENCE ? 0 : SAFE_MARGIN;
        return myFinalScore(sight, choice, card) <= bestOpponentGuess(sight) - margin;
    }

    private boolean endsRound(SafariSight sight, Choice choice) {
        List<SlotView> faceDown = sight.myFaceDown();
        return faceDown.size() == 1 && faceDown.contains(choice.slot());
    }

    private double myFinalScore(SafariSight sight, Choice choice, CardView card) {
        BoardGuess board = BoardGuess.of(sight.myBoard(), unknownAverage(sight));
        return board.with(choice.slot(), card).total();
    }

    private double bestOpponentGuess(SafariSight sight) {
        double unknown = unknownAverage(sight);
        return sight.opponents()
                .stream()
                .mapToDouble(board -> BoardGuess.of(board, unknown).total())
                .min()
                .orElse(Double.MAX_VALUE);
    }

    // R27: 와일드·여우(-2)는 짝이 없는 열 중 합이 가장 큰 열의 더 큰 칸에 넣는다.
    private List<Choice> lowCardToBigColumn(SafariSight sight, CardView card, List<Choice> choices) {
        if (card.kind() != CardKind.WILD && card.kind() != CardKind.FOX) {
            return choices;
        }
        BoardGuess board = BoardGuess.of(sight.myBoard(), unknownAverage(sight));
        return IntStream.range(0, COLUMNS)
                .filter(column -> !board.isPaired(column))
                .boxed()
                .max(Comparator.comparingDouble(board::columnSum))
                .map(column -> withFront(choices, column))
                .orElse(choices);
    }

    private static List<Choice> withFront(List<Choice> choices, int column) {
        Optional<Choice> target = choices.stream()
                .filter(choice -> choice.slot().column() == column)
                .max(Comparator.comparingDouble(Choice::pushed));
        if (target.isEmpty()) {
            return choices;
        }
        List<Choice> reordered = new ArrayList<>();
        reordered.add(target.get());
        choices.stream()
                .filter(choice -> !choice.equals(target.get()))
                .forEach(reordered::add);
        return reordered;
    }
}
```

`B/papersafari/bot/SeenCards.java`:

```java
package com.boardgame.papersafari.bot;

import com.boardgame.papersafari.DrawSource;
import com.boardgame.papersafari.view.CardView;
import com.boardgame.papersafari.view.HeldView;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

// R27: 상이 기억하는 공개된 카드. 버린 더미에 묻힌 카드는 화면에서 사라지므로 맨 위가 바뀔 때마다 쌓아 두고,
// 누가 버린 더미에서 가져가면(들고 있는 카드의 출처가 DISCARD) 맨 위를 뺀다. 모두 자기 화면에서 본 것뿐이다(R16).
final class SeenCards {

    private final List<CardView> pile = new ArrayList<>();
    private HeldView lastHeld;

    void observe(SafariSight sight) {
        noteTaken(sight.held().orElse(null));
        sight.discardTop().ifPresent(this::notePushed);
    }

    List<CardView> seenWith(SafariSight sight) {
        return Stream.concat(pile.stream(), sight.visibleCards().stream()).toList();
    }

    private void noteTaken(HeldView held) {
        boolean fresh = held != null && !held.equals(lastHeld);
        lastHeld = held;
        if (fresh && held.source() == DrawSource.DISCARD && !pile.isEmpty()) {
            pile.remove(pile.size() - 1);
        }
    }

    private void notePushed(CardView top) {
        if (!pile.isEmpty() && pile.get(pile.size() - 1).equals(top)) {
            return;
        }
        pile.add(top);
    }
}
```

`B/papersafari/bot/PaperSafariMind.java`:

```java
package com.boardgame.papersafari.bot;

import com.boardgame.game.GameAction;
import com.boardgame.game.bot.BotMind;
import com.boardgame.game.bot.BotPlan;
import com.boardgame.game.bot.BotSituation;
import com.boardgame.game.bot.ThinkTime;
import java.util.Optional;
import java.util.Random;

// 페이퍼 사파리 컴퓨터 한 명의 한 판. 내 결정을 기다릴 때만 생각 시간(R19) 뒤에 행동 하나를 한다.
final class PaperSafariMind implements BotMind {

    private final SafariPlayer player;
    private final SeenCards seen;

    PaperSafariMind(SafariPlayer player, SeenCards seen) {
        this.player = player;
        this.seen = seen;
    }

    @Override
    public void observe(Object view) {
        seen.observe(SafariSight.of(view));
    }

    @Override
    public Optional<BotPlan> plan(BotSituation situation) {
        SafariSight sight = SafariSight.of(situation.view());
        if (!sight.awaitsMe()) {
            return Optional.empty();
        }
        Random random = situation.random();
        return Optional.of(BotPlan.act(ThinkTime.standard(random), decide(sight, random)));
    }

    @Override
    public Optional<GameAction> fallback(Object view, Random random) {
        return SafariAuto.fallback(SafariSight.of(view), random);
    }

    private GameAction decide(SafariSight sight, Random random) {
        return switch (sight.phase()) {
            case SETUP_FLIP -> player.flip(sight, random);
            case DRAW -> player.draw(sight, random);
            case PLACE -> player.place(sight, random);
            case PEEK, ROUND_OVER -> player.peek(sight, random);
        };
    }
}
```

`B/papersafari/bot/PaperSafariBrain.java`:

```java
package com.boardgame.papersafari.bot;

import com.boardgame.game.GameType;
import com.boardgame.game.bot.BotBrain;
import com.boardgame.game.bot.BotDifficulty;
import com.boardgame.game.bot.BotMind;
import org.springframework.stereotype.Component;

@Component
public class PaperSafariBrain implements BotBrain {

    @Override
    public GameType type() {
        return GameType.PAPER_SAFARI;
    }

    @Override
    public BotMind mind(BotDifficulty difficulty) {
        SeenCards seen = new SeenCards();
        return new PaperSafariMind(playerFor(difficulty, seen), seen);
    }

    private static SafariPlayer playerFor(BotDifficulty difficulty, SeenCards seen) {
        return switch (difficulty) {
            case EASY -> new EasySafari();
            case MEDIUM -> new MediumSafari();
            case HARD -> new HardSafari(seen);
        };
    }
}
```

- [ ] **Step 4: 통과 확인**

Run: `cd backend && mvn -q test -Dtest='BoardGuessTest,EasySafariTest,MediumSafariTest,HardSafariTest,PaperSafariMindTest'`
Expected: PASS. 계산 근거(실패하면 코드를 고친다, 기대값을 바꾸지 않는다): `MediumSafariTest`의 판 `9 2 8 / ? 2 ?`(평균 252/54)에서 1을 넣으면 (0,0) 이득 8, (2,0) 7, (0,1)·(2,1) 3.67, (1,0)·(1,1) −3이라 (0,0). 낮은 판 `1 2 0 / 1 2 0`(합 0)에 9를 넣으면 (2,0)·(2,1) 손해 9가 가장 작고 칸 순서로 (2,0). `HardSafariTest`의 내 판에 0을 (2,1)에 넣으면 내 점수 3이 되어 판이 끝나므로 상대 4점이면(3 > 4−2) 다음 수 (2,0)(이득 3), 상대 10점이면 (2,1)(이득 = 남은 평균 > 3).
Run: `cd backend && mvn -q test`
Expected: PASS(이제 스프링 컨텍스트에 `PaperSafariBrain`이 등록된다).

- [ ] **Step 5: 커밋**

```bash
git add backend/src/main/java/com/boardgame/papersafari/bot backend/src/test/java/com/boardgame/papersafari/bot
git commit -m "$(cat <<'EOF'
feat: 페이퍼 사파리 컴퓨터 하·중·상 - 자기 화면만 보고 버린 카드 고르기·바꿀 칸·엿보기·판 끝내기 조건·타잔·와일드 자리를 정한다

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

> 아래 Task 7~12는 간결하게 적는다: 파일·인터페이스·핵심 테스트 목록·필수 시그니처. 구현자는 Task 6의 구조(시야 record → 난이도별 판단 → `XxxMind implements BotMind` → `@Component XxxBrain`)와 테스트 방식(화면 record를 직접 만드는 도우미 + `FixedRandom`)을 그대로 따른다. 행동은 모두 `GameAction` 글자(각 게임 `*Command` enum 이름)로 만든다.

### Task 7: 우노 컴퓨터 머리(하·중·상, 외치기·잡기·도전)

**Files:**
- Create(`B/uno/bot/`): `UnoSight.java`(public record, `UnoView` 감쌈), `UnoMoves.java`, `UnoAuto.java`, `CatchHabit.java`, `CatchWindow.java`, `UnoMemory.java`, `UnoStyle.java`(abstract), `EasyUno.java`, `MediumUno.java`, `HardUno.java`, `UnoMind.java`, `UnoBrain.java`(@Component)
- Test(`BT/uno/bot/`): `UnoViews.java`(빌더 도우미), `EasyUnoTest`, `MediumUnoTest`, `HardUnoTest`, `UnoMemoryTest`, `UnoMindTest`

**Interfaces:**
- Consumes: Task 5 계약, `UnoSessionView`/`UnoView`(28필드 순서는 `UnoViewAssembler`와 같다), `UnoCardView`, `UnoPlayerView`, `UnoChallengeView`, `UnoCatchView`, `UnoEventView`, `Direction.step()`.
- Produces: `@Component UnoBrain`(`type() == UNO`; EASY→`EasyUno`, MEDIUM→`MediumUno`, HARD→`new HardUno(new UnoMemory())`).
- 필수 시그니처:

```java
public record UnoSight(UnoView game) {
    public static UnoSight of(Object view);           // ((UnoSessionView) view).game()
    boolean myTurn(); UnoStage stage(); List<UnoCardView> hand(); List<UnoCardView> playable(); // hand 중 playableCardIds
    boolean riskyFour(); Optional<UnoCardView> drawn(); boolean canCall(); boolean canCatch();
    Optional<Long> catchTarget(); Optional<UnoChallengeView> challenge(); Optional<UnoColor> currentColor();
    List<UnoEventView> events(); int cardCountOf(long playerId);
    int nextPlayerCards();                             // players(남은 사람, 자리 순) 안 내 위치 + direction.step()
    int countOfColorExcept(UnoColor color, UnoCardView except);
    UnoColor mostHeldColorExcept(UnoCardView except);  // 동점은 enum 순서(RED 먼저) = 자동 색 고르기(R40)
}
final class UnoMoves { play(UnoCardView, UnoColor /*와일드만*/), draw(), keep(), chooseColor(UnoColor), challenge(), accept(), callUno(), catchUno(long target) }
record CatchHabit(int percent, int minMillis, int maxMillis) { boolean tries(Random); Duration delay(Random); }
final class CatchWindow { boolean firstLook(Optional<Long> target); void forgetIfClosed(Optional<Long> target); } // 창(대상)마다 한 번만 정한다
abstract class UnoStyle {
    abstract int callPercent(); abstract Optional<CatchHabit> catchHabit();
    abstract GameAction play(UnoSight, Random); abstract GameAction drawn(UnoSight, UnoCardView, Random);
    abstract UnoColor color(UnoSight, UnoCardView played, Random); abstract boolean challenges(UnoSight, Random);
    void observe(UnoSight sight) {}
    final GameAction turn(UnoSight, Random);  // canCall && myTurn && nextInt(100) < callPercent → CALL_UNO, 아니면 단계별(PLAY/DRAWN/CHOOSE_COLOR/CHALLENGE)
    protected GameAction playCard(UnoSight, UnoCardView, Random); // 와일드일 때만 color()
}
final class UnoMind implements BotMind {
    // observe: style.observe + window.forgetIfClosed
    // plan: 잡기 창(대상 ≠ 나, canCatch)을 처음 보면 catchHabit대로 한 번 정해 CATCH_UNO(habit.delay) → 아니면 kind == TURN일 때 BotPlan.act(ThinkTime.standard, style.turn)
    // fallback: UnoAuto.fallback — 내 차례가 아니면 빈 값, PLAY→DRAW, DRAWN→KEEP, CHOOSE_COLOR→가장 많이 가진 색, CHALLENGE→ACCEPT (R40 autoAct와 같음)
}
final class UnoMemory { void observe(UnoSight); boolean missed(long playerId, UnoColor color); } // 새 seq의 DRAW(actor) → 그때 currentColor를 "못 냄"으로, PENALTY(target)·그 색 PLAY → 지움
```

- 난이도 규칙: 하(R29) 낼 카드 없거나 `nextInt(100)<20`이면 DRAW, 아니면 무작위 낼 카드, 뽑은 카드 `nextInt(100)<50`이면 냄, 색 무작위, 도전 안 함, 외침 50%, 잡기 없음. 중(R30) 숫자 → 기능(SKIP/REVERSE/DRAW_TWO) → WILD → +4 순, 같은 무리에서는 내가 가장 많이 가진 색, 뽑은 카드는 냄, 색은 가장 많이 가진 색, 도전은 낸 사람 5장 이상이고 `nextInt(100)<30`, 외침 90%, 잡기 30%·1000~3000ms. 상(R31) 다음 사람 ≤2장이면 DRAW_TWO→+4(허세 허용)→SKIP→REVERSE 먼저, 손 >3장이면 정당한 +4 먼저, 그 밖에는 허세 아닌 비와일드 중 "내고 나서 그 색이 가장 많이 남는" 카드, 없으면 WILD, 허세 +4는 다음 사람 ≤2장일 때만(뽑은 허세 +4도 그때만 내고 아니면 KEEP), 도전은 `guiltyChance > 0.5`(직전 색 없음 0, 기억에 그 색 못 냄 0.15, 아니면 `1 − 0.75^낸 사람 장수`), 외침 100%, 잡기 100%·800~1500ms.
- 핵심 테스트(`UnoViews` 빌더로 `UnoSight`를 만들고 `FixedRandom` 고정):
  - `EasyUnoTest`: `R29_낼_카드가_없으면_뽑는다`, `R29_낼_수_있어도_20퍼센트는_뽑는다`(FixedRandom(10)), `R29_그_밖에는_무작위_카드를_낸다`(FixedRandom(25), 3장 → 둘째), `R29_뽑은_카드는_50퍼센트만_낸다`(30→PLAY, 70→KEEP), `R29_와일드_색은_무작위`(FixedRandom(26) → GREEN), `R29_도전은_늘_받기`, `R29_두_장일_때_50퍼센트만_외친다`.
  - `MediumUnoTest`: `R30_숫자를_먼저_내고_그중_가장_많이_가진_색`(빨5·파3·파7·파스킵·와일드 → 파3), `R30_와일드는_다른_카드가_없을_때만_색은_가장_많이_가진_색`, `R30_뽑은_카드는_낸다`, `R30_우노를_90퍼센트_외친다`(80 → 외침, 95 → 냄), `R30_도전은_5장_이상일_때_30퍼센트`.
  - `HardUnoTest`: `R31_다음_사람이_2장_이하면_공격_카드를_먼저`, `R31_허세_4는_다음_사람이_2장_이하일_때만`, `R31_정당한_4는_손이_4장_이상이면_먼저_3장이면_아낀다`, `R31_같은_색이_이어지는_카드를_고른다`, `R31_도전은_어림이_50퍼센트를_넘을_때만`(5장 → 도전, 1장 → 받기, 못 냄 기억 → 받기), `R31_우노를_항상_외친다`.
  - `UnoMemoryTest`: DRAW 기억, PENALTY로 잊음, 같은 seq 두 번 봐도 한 번.
  - `UnoMindTest`: `R30_R32_중은_잡기_창을_처음_볼_때만_30퍼센트로_정한다`(FixedRandom(10) → CATCH_UNO 1010ms, 같은 창 두 번째 → 빈 값, 창이 닫혔다 다시 열리면 다시 정함), `R31_상은_0_8_1_5초_안에_반드시_잡는다`, `R29_하는_잡지_않는다`, `R32_나를_잡을_수는_없다`(대상 = 나 → 빈 값), `R21_자동_행동_대체`, `R16_실제_세션의_시야로_고른_행동을_세션이_받아_준다`(`new UnoSessionFactory(clock, new RandomUnoShuffler(), count -> 0).create(List.of(-1L, -2L))`, 차례인 컴퓨터의 계획 행동을 `session.act`가 거절하지 않음).
- 확인: `cd backend && mvn -q test -Dtest='EasyUnoTest,MediumUnoTest,HardUnoTest,UnoMemoryTest,UnoMindTest'` → PASS, 이어 `mvn -q test` → PASS.
- 커밋: `git add backend/src/main/java/com/boardgame/uno/bot backend/src/test/java/com/boardgame/uno/bot` / "feat: 우노 컴퓨터 하·중·상 - 낼 카드·색·외치기·잡기 시점·+4 도전 어림을 자기 화면과 공개 기록만으로 정한다" + 빈 줄 + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

---

### Task 8: 도둑잡기 컴퓨터 머리(하·중·상, 섞기·고르는 카드 신호·DISCARD_ALL)

**Files:**
- Create(`B/oldmaid/bot/`): `OldMaidSight.java`(public record, `OldMaidView` 감쌈), `OldMaidMoves.java`, `OldMaidAuto.java`, `OldMaidPlayer.java`, `EasyOldMaid.java`, `MediumOldMaid.java`, `HardOldMaid.java`, `JokerArrival.java`, `ShuffleMemory.java`, `OldMaidMind.java`, `OldMaidBrain.java`(@Component)
- Test(`BT/oldmaid/bot/`): `OldMaidViews.java`(도우미: `view(me, stage, current, target, turnSeq, hand, players, canShuffle, canDiscard)` → `OldMaidSessionView`, 23필드 순서는 `OldMaidView`), `OldMaidMindTest`, `OldMaidShuffleTest`

**Interfaces:**

```java
public record OldMaidSight(OldMaidView game) {
    public static OldMaidSight of(Object view);
    boolean canDiscard(); boolean canShuffle(); boolean isOpening();
    boolean isDrawing();   // stage == DRAW && currentPlayerId == 나
    boolean isTargeted();  // stage == DRAW && targetId == 나
    int targetCardCount(); boolean holdsJoker(); long turnSeq();
}
final class OldMaidMoves {
    static GameAction discardAll(); static GameAction draw(int index); static GameAction peek(int index); static GameAction shuffle();
    static List<Integer> otherSlots(int count, int chosen, Random random); // chosen 뺀 자리에서 min(남은 수, 1 + nextInt(3))개를 겹치지 않게
    static BotPlan drawPlan(Duration think, List<Integer> lifts, int chosen, Random random);
    // lifts가 비면 act(think, DRAW chosen); 아니면 signal(think, PEEK lifts[0]), signal(gap, PEEK 나머지…), signal(gap, PEEK chosen), act(gap, DRAW chosen), gap = ThinkTime.between(random, 300, 800)
}
interface OldMaidPlayer {
    default void observe(OldMaidSight sight) {}
    Duration discardThink(OldMaidSight sight, Random random); // R33: 하 + 처음 단계면 between(2500, 5000), 그 밖 standard
    List<Integer> lifts(int count, int chosen, Random random); // R23: 하는 List.of(), 중·상은 otherSlots
    Optional<GameAction> shuffle(OldMaidSight sight, Instant at); // R36
}
final class ShuffleMemory { boolean cooled(Instant at) /* 마지막 + 1100ms 지남 */; boolean shuffledIn(long turnSeq); void remember(Instant at, long turnSeq); }
final class JokerArrival { void observe(OldMaidSight s) /* pending = holds && (pending || !held); held = holds */; boolean take(); }
final class OldMaidMind implements BotMind {
    // plan: canDiscard → act(player.discardThink, DISCARD_ALL)(R33, 처음·짝 버리기 모두)
    //       isDrawing → think = standard, chosen = nextInt(targetCardCount), drawPlan(think, player.lifts(...), chosen)
    //       kind == REACTION && canShuffle → think = standard, player.shuffle(sight, now + think).map(a -> act(think, a))
    // fallback: OldMaidAuto — canDiscard → DISCARD_ALL, isDrawing → DRAW nextInt(count), 그 밖 빈 값 (R35·R38 autoAct와 같음)
}
```

- 섞기(R36): 하 없음. 중은 조커가 새로 손에 들어오면(`JokerArrival`) 다음 기회에 쿨다운이 지났으면 한 번. 상은 조커를 든 동안 내가 상대(`isTargeted`)인 차례마다 한 번(`!shuffledIn(turnSeq)`), 쿨다운 1.1초를 지킨다.
- 뽑기(R34·R35): 하·중·상 모두 무작위 자리. 지금 화면은 받은 카드가 끼워진 자리를 알려 주지 않으므로(`OldMaidView`에 없음) 상의 추적 정보는 생기지 않는다 — 숨은 정보를 읽어 강하게 만들지 않는다(R16·D7). 이 이유를 `HardOldMaid` 주석에 쓴다.
- 핵심 테스트:
  - `OldMaidMindTest`: `R33_처음_짝_버리기는_DISCARD_ALL이고_하는_2_5초부터_기다린다`(EASY FixedRandom(0) → 2500ms, MEDIUM → 800ms), `R33_짝_버리기_단계도_DISCARD_ALL`, `R23_하는_신호_없이_바로_뽑는다`(한 걸음 DRAW), `R23_중은_다른_자리를_들었다가_고른_자리를_뽑는다`(FixedRandom(1), 상대 5장 → 걸음 PEEK 2, PEEK 3, PEEK 1, DRAW 1, 첫 지연 801ms·나머지 301ms), `R35_상도_화면에_추적_정보가_없으면_무작위로_뽑는다`(중과 같은 자리), `R21_자동_행동_대체`, `R16_실제_세션의_시야로_고른_행동을_세션이_받아_준다`(`new OldMaidSessionFactory(clock, new RandomOldMaidShuffler(), bound -> 0).create(List.of(-1L, -2L))`, 처음 단계 DISCARD_ALL 또는 첫 차례 DRAW가 거절되지 않음).
  - `OldMaidShuffleTest`: `R36_하는_섞지_않는다`, `R36_중은_조커를_받은_뒤_한_번만_섞는다`(조커 없는 화면 observe → 조커 있는 화면 observe → REACTION 계획 SHUFFLE, 다시 → 빈 값), `R36_상은_조커를_든_동안_내가_뽑힐_차례마다_섞는다`(turnSeq 5 대상 → SHUFFLE, 같은 turnSeq → 빈 값, turnSeq 6·2초 뒤 → SHUFFLE, 조커 없으면 빈 값), `R36_쿨다운_1초_안에는_섞지_않는다`.
- 확인: `cd backend && mvn -q test -Dtest='OldMaidMindTest,OldMaidShuffleTest'` → PASS, `mvn -q test` → PASS.
- 커밋: `git add backend/src/main/java/com/boardgame/oldmaid/bot backend/src/test/java/com/boardgame/oldmaid/bot` / "feat: 도둑잡기 컴퓨터 하·중·상 - 한 번에 짝 버리기, 고르는 카드 들어 올림 신호, 조커 섞기" + 트레일러.

---

### Task 9: 시뮬레이션(컴퓨터만 수백 판)과 STOMP 통합(사람 1 + 컴퓨터 2)

**Files:**
- Create test: `BT/game/bot/BotTable.java`(public), `BT/papersafari/bot/PaperSafariSimulationTest.java`, `BT/uno/bot/UnoSimulationTest.java`, `BT/oldmaid/bot/OldMaidSimulationTest.java`, `BT/room/api/BotStompFlowTest.java`

**Interfaces:**

```java
// 방·예약기 없이 실제 세션 한 판을 컴퓨터만으로 끝까지 돌린다. 매 걸음: 모든 마음에 자기 화면 observe →
// pendingActors 각각의 plan 중 total()이 가장 짧은 것 하나를 고른다(R19 흉내) → 걸음마다 clock.advance(delay),
// SIGNAL은 session.signal, ACT는 session.act. BusinessException이면 rejections++ 후 fallback 한 번(R21).
// 계획이 하나도 없으면 timeouts++ 후 session.autoAct(random). 최대 5000걸음.
public final class BotTable {
    public BotTable(GameSession session, Map<Long, BotMind> minds, MutableClock clock);
    public BotTable play(Random random);
    public int timeouts(); public int rejections(); public GameSession session();
}
```

- `PaperSafariSimulationTest`(`new PaperSafariSessionFactory(clock)`, 승자 = `PaperSafariView.winnerId()`):
  - `상_1명과_하_3명이_400판에서_상의_1등_비율이_하_평균의_1_5배_이상이다`: 자리 순서를 판마다 돌리고, 모든 판 `isFinished`·`timeouts == 0`·`rejections == 0`, `hardWins >= (easyWins / 3.0) * 1.5`(무승부는 빼고 센다).
  - `모든_난이도가_섞인_2_5명_판이_멈추지_않고_끝난다`(인원마다 40판), `상끼리_두어도_판이_끝난다`(2명·4명 각 50판, HardSafari의 PATIENCE/LIMIT가 끝을 보장).
- `UnoSimulationTest`(`new UnoSessionFactory(clock, new RandomUnoShuffler(), count -> random.nextInt(count))`, 승자 `UnoView.winnerId()`): 같은 두 가지(상 1 + 하 3, 400판, 1.5배) + 2~5명 혼합 완주.
- `OldMaidSimulationTest`(`new OldMaidSessionFactory(clock, new RandomOldMaidShuffler(), bound -> random.nextInt(bound))`): 2~6명 혼합 각 40판 완주, `timeouts == 0`, `rejections == 0`(섞기 쿨다운·신호 포함).
- 임계값이 안 나오면 기대값을 낮추지 말고 판단(Task 6·7)을 고친다.
- `BotStompFlowTest`: `@SpringBootTest(webEnvironment = RANDOM_PORT, properties = {"app.bots.real-scheduler=true", "app.bots.pace=0.02"})`, 도우미(가입·로그인·STOMP 연결·구독·`syncUntilView`)는 `UnoStompFlowTest`에서 그대로 옮긴다. `@ParameterizedTest @EnumSource(GameType.class) 사람_1명과_컴퓨터_2명이_게임을_끝까지_두고_기록은_남지_않는다(GameType type)`:
  - 방 만들기 → `POST /bots` EASY·HARD → `POST /start` 응답 `practice == true`.
  - 사람은 받은 화면을 스프링 `ObjectMapper`로 `PaperSafariSessionView`/`UnoSessionView`/`OldMaidSessionView`로 읽어 같은 게임 머리 `mind(EASY).fallback(view, random)`이 주는 행동만 `/app/rooms/{code}/actions`로 보낸다(자기 차례가 아니면 빈 값). 2초 동안 새 화면이 없으면 `/sync`로 다시 받는다.
  - 60초 안에 `/game/status == "GAME_OVER"`, `GameMatchRepository.count()`가 그대로.
- 확인: `cd backend && mvn -q test -Dtest='PaperSafariSimulationTest,UnoSimulationTest,OldMaidSimulationTest,BotStompFlowTest'` → PASS(시뮬레이션 전체가 1분 안), `mvn -q test` → PASS.
- 커밋: 새 테스트 파일 5개만 add / "test: 컴퓨터만 수백 판 시뮬레이션(완주·상 vs 하 승률)과 사람 1 + 컴퓨터 2 STOMP 통합 테스트" + 트레일러.

---

### Task 10: 프론트 대기실 — 컴퓨터 추가·난이도 선택 창·컴퓨터 칩·정보 창·확인 없는 내보내기

**Files:**
- Modify: `F/api/types.ts`, `F/api/rooms.ts`, `F/components/icons.tsx`, `F/room/MemberList.tsx`, `F/room/WaitingRoom.tsx`, `F/room/WaitingActionBar.tsx`, `F/pages/RoomPage.tsx`
- Create: `F/lib/bots.ts`, `F/components/BotChip.tsx`, `F/room/BotDifficultyModal.tsx`, `F/room/BotInfoModal.tsx`
- Test: `F/lib/bots.test.ts`, `F/room/WaitingRoomBots.test.tsx`

**Interfaces:**

```ts
// api/types.ts
export type BotDifficulty = 'EASY' | 'MEDIUM' | 'HARD';
export type RoomMember = { ...기존; bot?: boolean; difficulty?: BotDifficulty | null };
export type Room = { ...기존; practice?: boolean };
// api/rooms.ts
addBot: (code: string, difficulty: BotDifficulty) => request<Room>(`${path(code)}/bots`, { method: 'POST', body: { difficulty } }),
changeBot: (code: string, botId: number, difficulty: BotDifficulty) => request<Room>(`${path(code)}/bots/${botId}`, { method: 'PATCH', body: { difficulty } }),
// lib/bots.ts
export const BOT_DIFFICULTIES: BotDifficulty[];                       // ['EASY','MEDIUM','HARD']
export const DIFFICULTY_SHORT: Record<BotDifficulty, string>;          // 하·중·상
export const DIFFICULTY_BUTTON: Record<BotDifficulty, string>;         // '하 · 쉬움' | '중 · 보통' | '상 · 어려움' (R45)
export const DIFFICULTY_NOTE: Record<BotDifficulty, string>;           // 정보 창 한 줄(~해요)
export function botLabel(d: BotDifficulty): string;                    // `컴퓨터 · ${하}`
export function botOf(member?: RoomMember | null): BotDifficulty | undefined; // bot이면 difficulty ?? 'MEDIUM'
// components/icons.tsx
export const RobotIcon: (props: IconProps) => JSX.Element;             // 인라인 SVG 로봇 얼굴
// components/BotChip.tsx
export function BotChip(props: { difficulty: BotDifficulty; compact?: boolean; onClick?: () => void }): JSX.Element;
// compact: role="img" aria-label="컴퓨터 · 하"(로봇 + 하), onClick 있으면 button aria-label="컴퓨터 · 하, 난이도 바꾸기", 그 밖 span "컴퓨터 · 하"
// room/BotDifficultyModal.tsx
export function BotDifficultyModal(props: { open: boolean; title: string; current?: BotDifficulty | null; onPick: (d: BotDifficulty) => void; onClose: () => void }): JSX.Element; // Modal(배경·Esc 닫힘), 버튼 3개 aria-label=DIFFICULTY_BUTTON
// room/BotInfoModal.tsx
export function BotInfoModal(props: { target: RoomMember | null; onClose: () => void }): JSX.Element; // 그림·이름·BotChip·DIFFICULTY_NOTE, 전적 API 안 부름 (R39)
// room/MemberList.tsx — 새 props
onAddBot?: () => void;                // 있으면 빈자리 = button aria-label="빈자리에 컴퓨터 추가"(RobotIcon), 아래 글자 "컴퓨터 추가" (R40)
gameMaxPlayers?: number;              // export function seatCountOf(members, maxPlayers, gameMaxPlayers, canAdd): 꽉 찼고 maxPlayers < gameMax면 +1 자리
onChangeBot?: (member: RoomMember) => void; // 컴퓨터 상태 칩 자리에 BotChip(onClick) (R41·R42)
// 컴퓨터 자리: 연결 점(data-testid="presence-dot")·"연결 끊김 N초" 없음, 기권 버튼 없음, statsLabelOf → "컴퓨터 1 정보 보기"(R45)
// room/WaitingRoom.tsx — 새 props(선택): onAddBot?: (d: BotDifficulty) => unknown; onChangeBot?: (botId: number, d: BotDifficulty) => unknown
// 방장·대기 중·onAddBot 있을 때만 추가/바꾸기, 컴퓨터 내보내기는 KickConfirmModal 없이 바로 onKick (D5), 컴퓨터 자리를 누르면 BotInfoModal
// WaitingActionBar: startBlocker가 !host && !bot && !ready만 막는다 (R44)
// RoomPage: onAddBot={(d) => run(() => roomsApi.addBot(code, d))}, onChangeBot={(id, d) => run(() => roomsApi.changeBot(code, id, d))}
```

- 핵심 테스트(`WaitingRoomBots.test.tsx`, `setMediaMatches(true)`, `vi.mock('../api/records')`):
  - `방장 화면의 빈자리는 "빈자리에 컴퓨터 추가" 버튼이고 손님 화면은 그대로 빈자리다`
  - `추가 버튼을 누르면 하·중·상 선택 창이 뜨고 고르면 그 난이도로 추가한다`(`'상 · 어려움'` → `onAddBot('HARD')`, 창이 닫힘), `Esc로 닫으면 추가하지 않는다`
  - `정원이 다 찼어도 게임 최대보다 작으면 의자 끝에 추가 자리가 하나 더 있다`(페이퍼 사파리 정원 2·인원 2 → 의자 3), `게임 최대 인원이면 추가 자리가 없다`
  - `컴퓨터 자리는 "컴퓨터 · 하" 칩이고 연결 점·연결 끊김 문구가 없다`, `방장이 칩을 누르면 바꾸기 창이 뜨고 고르면 onChangeBot(-1, 'MEDIUM')`
  - `컴퓨터 자리를 누르면 정보 창이 뜨고 전적을 부르지 않는다`(`'컴퓨터 1 정보 보기'`, `recordsApi.member` 호출 없음)
  - `컴퓨터는 확인 창 없이 바로 내보낸다`, `방장과 컴퓨터만 있어도 게임 시작 버튼이 켜진다`
  - 기존 `WaitingRoom.test.tsx`는 그대로 통과(새 props 없이 렌더하면 예전과 같다).
  - `lib/bots.test.ts`: 라벨·`botOf` 기본값.
- 확인: `cd frontend && npm test -- --run src/room src/lib/bots.test.ts` → PASS, `npm test -- --run && npm run build` → PASS(`noEmoji.test.ts` 포함).
- 커밋: 위 파일만 add / "feat: 대기실 빈자리 컴퓨터 추가·하중상 선택 창·컴퓨터 칩과 정보 창, 컴퓨터는 확인 없이 내보내기" + 트레일러.

---

### Task 11: 프론트 게임 테이블 — 컴퓨터 칩, 연결 표시 숨김, 연습 경기 안내

**Files:**
- Create: `F/components/PresenceMark.tsx`, `F/table/PracticeNote.tsx`
- Modify: `F/games/papersafari/PlayerBoard.tsx`, `layout/Seat.tsx`(`Presence`에 `bot?: BotDifficulty`), `layout/OpponentSeat.tsx`(모달에 `bot` 전달), `PaperSafariTable.tsx`(`presenceOf`가 컴퓨터면 `{ avatar, bot }`만), `GameOverPanel.tsx`; `F/games/uno/UnoSeat.tsx`, `UnoTable.tsx`, `UnoGameOverPanel.tsx`; `F/games/oldmaid/OldMaidSeat.tsx`, `OldMaidTable.tsx`, `OldMaidGameOverPanel.tsx`
- Test: `F/table/botSeats.test.tsx`, `F/table/PracticeNote.test.tsx`

**Interfaces:**

```tsx
// 이름표 줄의 연결 점 자리를 쓴다(높이 그대로, R46): 컴퓨터면 <BotChip compact />, 사람이면 data-testid="presence-dot" 점, 둘 다 없으면 null.
export function PresenceMark(props: { connected?: boolean; bot?: BotDifficulty }): JSX.Element | null;
// PlayerBoard·UnoSeat·OldMaidSeat: 새 prop bot?: BotDifficulty, 점 span을 <PresenceMark>로 바꾸고 "연결 끊김"은 !bot일 때만.
// UnoTable·OldMaidTable: connected={botOf(member) ? undefined : member?.connected} bot={botOf(member)}
// R38: room.practice면 "컴퓨터와 한 연습 경기라 전적에 넣지 않아요"(data-testid="practice-note", RobotIcon). 세 결과 창에서 <ReadyChips> 바로 위.
export function PracticeNote(props: { room: Room }): JSX.Element | null;
```

- 핵심 테스트:
  - `botSeats.test.tsx`: `우노·도둑잡기 자리와 페이퍼 사파리 판에서 컴퓨터는 로봇 칩(이름 "컴퓨터 · 상")을 달고 연결 점·연결 끊김 문구가 없다`, `사람 자리는 예전처럼 연결 점과 끊김 문구가 있다`, `우노 테이블은 방의 컴퓨터 참가자 자리에 칩을 단다`(UnoTable.test의 `room`·`unoSession` 방식, 멤버 2를 `bot: true, difficulty: 'EASY'`로), `칩은 이름표 줄 안에 있어 자리 높이를 늘리지 않는다`(칩이 `seat-tag`와 같은 부모 줄에 있음).
  - `PracticeNote.test.tsx`: `practice가 참이면 안내 한 줄, 아니면 없음`, 세 결과 창(`UnoGameOverPanel`·`OldMaidGameOverPanel`·`GameOverPanel`을 각 기존 테스트의 픽스처로) 모두 `room.practice`일 때 문구가 보임.
- 확인: `cd frontend && npm test -- --run src/table src/games` → PASS, `npm test -- --run && npm run build` → PASS.
- 커밋: 위 파일만 add / "feat: 게임 테이블 컴퓨터 칩·연결 표시 숨김과 결과 창의 연습 경기 안내" + 트레일러.

---

### Task 12: 실제 브라우저 확인(Playwright MCP)

**Files:** 고칠 것이 생기면 해당 파일만(그 수정은 이 태스크 커밋에 넣는다). 스크린샷은 스크래치패드에 저장하고 저장소에 넣지 않는다.

- [ ] **Step 1: 서버 띄우기(내 PID만 기록)** — 8899·5177은 사용자 서버라 건드리지 않는다. `lsof -iTCP:8898 -sTCP:LISTEN`·`lsof -iTCP:5191 -sTCP:LISTEN`이 비었는지 확인(차 있으면 다른 빈 포트).

```bash
cd backend && mvn -q spring-boot:run -Dspring-boot.run.arguments="--server.port=8898 --spring.datasource.url=jdbc:h2:mem:bots;MODE=MySQL;DB_CLOSE_DELAY=-1 --spring.jpa.hibernate.ddl-auto=create-drop" &   # PID 기록
cd frontend && BACKEND_PORT=8898 npx vite --port 5191 --strictPort &                                                                   # PID 기록
```

- [ ] **Step 2: 세 게임 확인**(사람 1 + 컴퓨터 하·중·상 섞어서, 끝까지): 가입·로그인 → 방 만들기 → 빈자리 "컴퓨터 추가" → 선택 창 → 하/중/상 → 칩·그림 겹침 없음·준비 칩 자리 "컴퓨터" → 칩 눌러 난이도 바꾸기 → 컴퓨터 하나 내보내기(확인 창 없음) → 꽉 찬 뒤 추가 자리로 정원 늘리기 → 게임 시작 버튼 켜짐 → 컴퓨터가 0.8~1.8초 뒤 행동, 기록 줄 "컴퓨터 1 …"(자동 행동 문구 아님) → 도둑잡기 고르는 카드 들어 올림·섞기, 우노 외치기·잡기 → 결과 창 "컴퓨터와 한 연습 경기라 전적에 넣지 않아요" → 전적 페이지에 새 경기 없음.
- [ ] **Step 3: 배치 스크린샷**(`browser_resize`): PC 1280×860(대기실·세 게임 각각, 스크롤 없음), 휴대폰 세로 390×844, 휴대폰 가로 844×390(도둑잡기 사람 1 + 컴퓨터 5 = 6인 포함, 한 화면), 테마 하나 이상 바꿔서. 칩 때문에 자리 높이가 늘거나 겹치면 고친다.
- [ ] **Step 4: 정리** — 내가 띄운 두 PID만 `kill`, 포트가 비었는지 다시 확인. 수정이 있었으면 `cd backend && mvn -q test`, `cd frontend && npm test -- --run && npm run build` 후 그 파일만 add / "fix: 컴퓨터 플레이어 브라우저 확인에서 찾은 …" + 트레일러로 커밋. 수정이 없으면 커밋하지 않는다.

---

## 자체 점검(작성자 기록)

- 스펙 대응: R1·R2·R3·R5·R7·R8~R14 → Task 1·2, R4·R6·R15 → Task 2, R16 → Task 5(`R16_…`)·6~8(실제 세션 시야 테스트), R17~R21 → Task 5, R22 → Task 5(`BotAutoActorLogTest`), R23 → Task 8, R24~R28 → Task 6, R29~R32 → Task 7, R33~R36 → Task 8, R37·R38(서버) → Task 3, R38(화면) → Task 11, R39~R45 → Task 10, R41·R46(테이블) → Task 11, 8장 시뮬레이션·STOMP → Task 9, 브라우저 → Task 12, 7장 오류 코드 → Task 1·2.
- 이름 일관성: `BotDifficulty`(game.bot), `Participant.bot()`/`BotProfile`, `Room.humanIds/humanOccupantIds/bots/isBot/host/isPractice/pendingActors`, `PendingActor.turn/together/reaction`, `BotMind.observe/plan/fallback`, `BotPlan.act/of/first/rest/total`, `BotStep.act/signal/isSignal`, `ThinkTime.standard/between`, `BotDriver.afterChange/isCurrent/continueWith/fallback/forget/idle`, 프론트 `botOf`·`BotChip`·`PresenceMark`·`PracticeNote`.
- 결정한 해석(스펙 모호·충돌):
  - `ROOM_FULL` 문구는 기존 "방이 가득 찼습니다."를 그대로 둔다(스펙 R9의 "자리가 꽉 찼어요."는 기존 코드 재사용 지시와 충돌하고, 사람끼리 하는 방의 문구를 바꾸지 않기 위해).
  - 잘못된 난이도는 방장·대기 검사보다 먼저 `INVALID_INPUT`(기존 `reconfigure`의 "본문 형식 먼저" 순서).
  - 컴퓨터를 손으로 기권시키려 하면 `INVALID_INPUT`(R6, 스펙에 코드 없음).
  - R24 상의 처음 뒤집기: 한 사람이 한 장만 뒤집는 규칙이라 "줄을 고른 뒤 그 줄의 칸"으로 구현.
  - R27 상끼리 판이 끝나지 않는 것을 막는 안전장치(내 놓기 20번 뒤 지지 않으면 끝냄, 30번 뒤 무조건) — 스펙에 없는 종료 보장.
  - R35 상의 조커 추적: 지금 화면이 끼운 자리를 알려 주지 않으므로 추적 정보가 생기지 않아 무작위 뽑기와 같다(R16 우선).
  - R41 테이블 칩은 이름표 줄 공간 때문에 "로봇 + 하/중/상"(접근 이름 "컴퓨터 · 하"), 대기실은 준비 칩 자리에 "컴퓨터 · 하" 칩 하나(R41의 두 칩을 R46에 맞춰 합침).
  - 연습 경기 안내는 결과 창에만 넣고 `GameEndBanner`는 그대로 둔다(R38 "결과 패널/배너" 중 결과 패널).
