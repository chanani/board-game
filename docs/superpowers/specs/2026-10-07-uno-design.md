# 우노(UNO) 게임 추가 설계

- 작성일: 2026-10-07
- 기반: feature/uno a1b1d34
- 조사 문서: `docs/superpowers/research/uno-rules.md`(공식 규칙), `docs/superpowers/research/game-integration.md`(페이퍼 사파리 통합 구조와 필요한 이음매)
- 사용자 요청: "우노 게임을 만들어 줘. 지금 UX를 최대한 유지하고, 채팅·방·테마 등은 모두 똑같이 동작해야 해." 사용자가 설계 결정을 모두 맡겼다. 질문 없이 정했고, 모든 결정과 이유는 10장에 모았다(본문의 `D#`).

## 0. 공통 원칙

- 화면에 이모지 금지. 아이콘·카드 기호는 모두 인라인 SVG(`currentColor`, 장식은 `aria-hidden`). `F/noEmoji.test.ts`가 지킨다.
- 화면 문구는 한국어, 기존 말투("~해요", "~하세요")를 따른다.
- 휴대폰 세로(360px부터)·휴대폰 가로(눕힌 화면)·PC 세 배치를 모두 지원한다(`useTableLayout`: `portrait | landscape | pc`).
- 동작 줄이기(`MotionConfig reducedMotion="user"`)면 새 애니메이션은 색·투명도 변화만 남긴다.
- 백엔드 Java는 `/Users/ichanhan/CLAUDE.md` 객체지향 생활 체조(들여쓰기 1단계, else 금지, 원시값 VO, 일급 컬렉션, 도메인에 로직, 필드 3개 이하)와 `BusinessException` + 통일 오류 응답(`{status, code, message}`)을 지킨다. 화면용 view record(DTO)는 기존 `PaperSafariView`처럼 필드 수 제한의 예외로 둔다.
- 페이퍼 사파리 동작은 바꾸지 않는다. 공통 부품을 옮기거나 일반화할 때는 기존 테스트가 그대로 통과해야 한다.
- 표기: 백엔드 루트 `B/` = `backend/src/main/java/com/boardgame/`, 프론트 루트 `F/` = `frontend/src/`.

## 1. 개요와 목표

- 플랫폼(오, 유니버스)에 두 번째 게임 "우노"를 추가한다. 게임 선반·로비·방·대기실·준비·채팅·관전·테마·효과음·차례 타이머·자동 기권·전적·순위가 페이퍼 사파리와 똑같이 동작한다.
- 한 게임 = 한 판(손패를 먼저 비운 사람이 승리). 방당 2~5명.
- 규칙은 Mattel 공식 규칙(108장, 7장씩, 스태킹 없음, 와일드 +4 도전, 우노 외치기·잡기)을 따른다.
- 숨은 정보는 서버가 지킨다: 각자 자기 손패만 보고, 남의 손패는 장수만 받는다.
- 카드 그림은 우리가 직접 그린 SVG다. Mattel 로고·상표 디자인(검은 뒷면의 빨간 타원 로고, 45도 기운 타원 등)을 베끼지 않는다. 화면 이름은 "우노".

## 2. 규칙(구현 기준)

규칙 번호 `R#`은 테스트 이름과 코드 주석에서 그대로 쓴다.

### 2.1 카드와 덱

- **R1 덱**: 108장. 색 4가지(`RED` 빨강, `YELLOW` 노랑, `GREEN` 초록, `BLUE` 파랑)마다 0 한 장, 1~9 두 장씩, 건너뛰기(`SKIP`) 두 장, 방향 바꾸기(`REVERSE`) 두 장, +2(`DRAW_TWO`) 두 장 = 색마다 25장. 색 없는 와일드(`WILD`) 4장, 와일드 +4(`WILD_DRAW_FOUR`) 4장.
- **R2 카드 번호**: 덱을 만들 때 카드마다 게임 내내 바뀌지 않는 `id`(0~107)를 매긴다. 순서: 색 순서(RED, YELLOW, GREEN, BLUE)마다 0, 1, 1, 2, 2, …, 9, 9, SKIP×2, REVERSE×2, DRAW_TWO×2 → WILD×4 → WILD_DRAW_FOUR×4. 즉 RED 0 = id 0, BLUE 마지막 +2 = id 99, WILD = 100~103, WILD_DRAW_FOUR = 104~107. 같은 그림 두 장도 id로 구분한다.
- **R3 점수**: 숫자 카드는 숫자 그대로(0~9), SKIP·REVERSE·DRAW_TWO는 20점, WILD·WILD_DRAW_FOUR는 50점.

### 2.2 준비

- **R4 자리 순서**: 참가자 순서는 방의 `memberIds` 순서(= 자리 번호 seat 0..n-1). 시계 방향(`CLOCKWISE`)은 seat +1 방향이다. 화면에서는 `seatOrder`가 내 다음 사람을 왼쪽에 앉히므로 나 → 왼쪽 → 위 → 오른쪽으로 도는 시계 방향과 일치한다.
- **R5 시작 사람**: 시작 사람(starter)을 무작위로 고른다(`StarterPicker`, 테스트는 고정). "딜러"는 starter 바로 앞 자리(시계 반대 방향 한 칸) 사람이다. 첫 방향은 `CLOCKWISE`. (D5)
- **R6 나눠 주기**: 섞은 덱에서 seat 0부터 한 장씩 7바퀴 돌려 각자 7장을 준다. 다음 한 장을 뒤집어 버린 카드 더미의 첫 카드로 둔다. 나머지가 뽑을 더미다.
- **R7 첫 카드 처리**(공식):
  - 숫자: 그대로. starter부터 시작, 현재 색 = 그 카드 색.
  - SKIP: starter가 차례를 잃는다. starter 다음 사람부터 시작.
  - REVERSE: 방향을 `COUNTER_CLOCKWISE`로 바꾸고 딜러부터 시작한다. 2명이면 딜러 = starter의 상대이므로 "starter가 차례를 잃는다"와 같다.
  - DRAW_TWO: starter가 2장을 뽑고 차례를 잃는다. starter 다음 사람부터 시작.
  - WILD: starter가 색을 고른다(`CHOOSE_COLOR` 단계). 고른 뒤 같은 사람이 이어서 `PLAY` 단계를 한다. 현재 색은 고르기 전까지 없음(`null`).
  - WILD_DRAW_FOUR: 그 카드를 뽑을 더미에 다시 넣고 섞어 새 카드를 뒤집는다. 숫자/기능/WILD가 나올 때까지 되풀이한다.
  - 첫 카드 효과로 시작 사람이 바뀌어도 그 다음 사람의 첫 단계 마감은 15초부터 잰다.

### 2.3 차례

- **R8 낼 수 있는 카드**: 버린 카드 더미 맨 위 카드에 대해 (a) 카드 색 = 현재 색(`currentColor`), (b) 둘 다 숫자이고 숫자가 같음, (c) 둘 다 같은 기능(SKIP/REVERSE/DRAW_TWO, 색 무관), (d) WILD 또는 WILD_DRAW_FOUR 중 하나면 낼 수 있다. 맨 위가 와일드면 (a)만(선언된 색) 본다.
- **R9 한 장만**: 한 차례에 카드는 한 장만 낸다. 같은 숫자 여러 장 내기, 끼어들기(jump-in), 스태킹(+2 위에 +2, +4 위에 +4)은 없다.
- **R10 와일드 색**: WILD/WILD_DRAW_FOUR를 낼 때는 같은 행동 안에 색을 함께 보낸다(`color`). 색이 없으면 `UNO_COLOR_REQUIRED`. 색은 네 가지 중 하나. (D7)
- **R11 와일드 +4 조건**: 와일드 +4는 "손에 현재 색과 같은 색의 카드가 없을 때만" 낼 수 있다. 숫자·기호가 맞는 카드나 다른 와일드가 있어도, 현재 색 카드가 없으면 합법이다. 서버는 조건을 어긴 +4도 받아 준다(허세). 조건은 도전(R18~R21)으로만 지켜진다. 서버는 낼 때의 합법 여부와 그때의 손패를 기억한다. (D8)
- **R12 뽑기**: 낼 수 있는 카드가 있어도 뽑을 수 있다. 차례마다 뽑기는 1장. 뽑은 카드가 R8로 낼 수 있으면 `DRAWN` 단계로 가서 "그 카드 내기" 또는 "갖고 넘기기"를 고른다. 낼 수 없으면 바로 차례가 넘어간다. `DRAWN`에서는 방금 뽑은 카드만 낼 수 있다(`UNO_ONLY_DRAWN_CARD`).
- **R13 넘기기 없음**: `PLAY` 단계에서 그냥 넘기기는 없다. 항상 내거나 뽑는다.
- **R14 더미 다시 만들기**: 뽑을 더미가 비면 버린 카드 더미 맨 위 한 장을 남기고 나머지를 섞어 새 뽑을 더미로 만든다(현재 색은 그대로). 여러 장을 뽑는 도중 비어도 그 자리에서 다시 만들고 이어 뽑는다. 다시 만들어도 모자라면 있는 만큼만 뽑는다. 자발적 뽑기에서 한 장도 못 뽑으면 차례를 넘긴다(`PASS`, 이유 `EMPTY_PILE`).

### 2.4 기능 카드 효과

- **R15 SKIP**: 다음 사람이 차례를 잃는다.
- **R16 REVERSE**: 3명 이상이면 방향이 바뀐다. 2명이면 SKIP과 같다(낸 사람이 다시 한다, 방향 값은 바꾸지 않는다).
- **R17 DRAW_TWO**: 다음 사람이 2장을 뽑고 차례를 잃는다(되받아치기 없음).
- **R18 WILD_DRAW_FOUR**: 다음 사람(도전 대상자, "받는 사람")이 `CHALLENGE` 단계에서 "도전하기" 또는 "4장 받기"를 고른다.
- **R19 4장 받기**: 받는 사람이 4장을 뽑고 차례를 잃는다.
- **R20 도전 성공(불법 +4)**: 낸 사람이 4장을 뽑는다. +4 카드는 버린 카드 더미에 그대로, 고른 색도 그대로다(규칙서가 말하지 않는 부분이라 대부분 구현의 관례를 따른다, D9). 받는 사람은 뽑지 않고 자기 차례를 정상으로 한다(같은 사람의 `PLAY` 단계).
- **R21 도전 실패(합법 +4)**: 받는 사람이 6장(4 + 벌칙 2)을 뽑고 차례를 잃는다.
- **R22 도전 공개**: 도전하면 받는 사람(도전자)만 낸 사람의 손패(+4를 낸 직후의 손패)를 본다. 다른 사람·관전자에게는 성공/실패만 알린다. (D10)

### 2.5 우노 외치기와 잡기

- **R23 외치기**: 자기 차례(`PLAY` 또는 `DRAWN` 단계)에 손패가 정확히 2장이면 "우노!"(`CALL_UNO`)를 누를 수 있다. 카드를 내기 전에 누른다. 외친 상태는 그 차례가 끝나면 사라진다(외치고 뽑아서 3장이 되면 의미 없음).
- **R24 우노 선언**: 외친 상태에서 카드를 내 1장이 남으면 "우노 선언"이 된다(자리에 우노 배지). 1장인 사람이 카드를 뽑아 2장 이상이 되면 선언이 풀린다.
- **R25 잡기 창**: 외치지 않고 카드를 내 1장이 남으면 그 사람이 "잡을 수 있는 사람"(`unoCatch.playerId`)이 된다. 잡기 창은 다음 차례 행동(`PLAY`/`DRAW`/`KEEP`/`CHOOSE_COLOR`/`CHALLENGE`/`ACCEPT`, 사람 행동이든 시간 초과 자동 행동이든)이 서버에 받아들여지는 순간 닫힌다. 2명에서 SKIP 등으로 같은 사람 차례가 다시 와도 그 사람의 다음 차례 행동에서 닫힌다. 잡기 창을 연 그 행동 자체는 닫지 않는다. 다른 사람의 `CALL_UNO`·`CATCH_UNO`는 차례 행동이 아니다.
- **R26 잡기**: 창이 열려 있는 동안 그 사람이 아닌 남은 참가자 누구나 "우노 안 외쳤어요!"(`CATCH_UNO`, `targetId` 포함)를 누를 수 있다. 서버에 먼저 도착한 한 명만 성공한다. 잡힌 사람은 2장을 뽑는다. 창이 닫힌다. 잡기는 차례·마감에 영향이 없다.
- **R27 늦은 외치기**: 잡기 창이 열려 있는 동안 그 사람 본인이 "우노!"를 누르면 안전하다(공식: 다른 사람이 잡기 전에 스스로 외치면 벌칙 없음). 우노 선언이 되고 창이 닫힌다. (D11)
- **R28 끝난 뒤**: 손패가 0장이 되어 게임이 끝나면 잡기는 없다.

### 2.6 게임 끝과 점수

- **R29 승리**: 손패를 먼저 다 낸 사람이 이긴다. 마지막 카드의 효과는 적용한 뒤 끝낸다: DRAW_TWO면 다음 사람이 2장, WILD_DRAW_FOUR면 다음 사람이 4장을 뽑는다(그 카드도 점수에 들어간다). SKIP/REVERSE/WILD는 효과 없이 끝.
- **R30 마지막 +4는 도전 없음**: 마지막 카드가 WILD_DRAW_FOUR면 낼 때 손에 다른 카드가 없었으므로 언제나 합법이다. 도전 단계를 건너뛰고 받는 사람이 4장을 뽑은 뒤 바로 끝난다. (D12)
- **R31 점수**: 이긴 사람은 다른 남은 참가자 손패 점수(R3)의 합을 얻는다. 기권해 나간 사람의 카드는 세지 않는다.
- **R32 기록**: 이긴 사람 `WIN`, 나머지(기권자 포함) 모두 `LOSE`. 무승부 없음. 라운드 기록 1개(`roundNumber = 1`): 이긴 사람 `score = 얻은 점수`, 진 사람 `score = 0`. `tokens = 0`. (D6)
- **R33 기권으로 끝남**: 기권·자동 기권으로 남은 참가자가 1명이 되면 그 사람이 `WIN`, 나머지 `LOSE`로 끝난다. 이때는 라운드 기록 없이 `GameCompleted`만 낸다(페이퍼 사파리와 같다). 점수 없음.
- **R34 다음 게임**: 끝나면 방은 대기 상태로 돌아가고 기존 "다음 게임 준비"/준비 흐름으로 새 게임을 시작한다. 새 게임은 새 덱·새 무작위 시작 사람.

### 2.7 기권(게임 중 나가기)

- **R35 손패 처리**: 기권한 사람의 손패는 섞어서 뽑을 더미 맨 아래에 넣는다. 우노 선언·잡기 대상이었다면 지운다.
- **R36 차례 중 기권**: 차례인 사람이 기권하면 그 단계는 버리고 진행 방향의 다음 사람이 `PLAY` 단계를 시작한다. 단, 첫 카드 WILD의 `CHOOSE_COLOR` 중이었다면 먼저 R40의 자동 색(기권자의 손패 기준)을 정하고 넘어간다.
- **R37 +4 도전 대기 중 기권**: 받는 사람이 기권하면 +4 효과는 사라지고 그 다음 사람이 `PLAY`를 시작한다. +4를 낸 사람이 기권하면 +4 벌칙은 사라지고 받는 사람이 정상 `PLAY` 차례를 시작한다. (D13)
- **R38 남은 사람 1명**: R33.
- **R39 다른 사람 기권**: 차례인 사람이 아닌 사람이 기권하면 지금 단계와 마감은 그대로다.

### 2.8 시간 초과 자동 행동(15초)

- **R40** 모든 결정 단계는 15초. 단계가 바뀌거나 차례 사람이 바뀌면 15초를 다시 잰다. 시간이 지나면 서버가 대신 한다:
  - `PLAY`: 1장 뽑는다. 낼 수 있어도 내지 않고 갖고 차례를 넘긴다. 더미가 비어 못 뽑으면 그냥 넘긴다.
  - `DRAWN`: 뽑은 카드를 갖고 넘긴다(`KEEP`).
  - `CHOOSE_COLOR`: 손패에 가장 많은 색(와일드 제외). 같으면 빨강 > 노랑 > 초록 > 파랑. 색 카드가 없으면 빨강.
  - `CHALLENGE`: 도전하지 않고 4장 받기(`ACCEPT`).
- 우노 외치기·잡기는 자동으로 하지 않는다. 자동 행동은 늘 게임을 한 걸음 진행시키므로 재시도 고리가 생기지 않는다.

## 3. 상태 기계

### 3.1 상태

- 게임 상태 `status`: `IN_PROGRESS` | `GAME_OVER`.
- 단계 `stage`(게임 중에만, 끝나면 `null`):

| 단계 | 행동하는 사람 | 받는 행동 | 시간 초과 |
|---|---|---|---|
| `PLAY` | 차례인 사람 | `PLAY(cardId, color?)`, `DRAW`, `CALL_UNO` | 1장 뽑고 넘기기 |
| `DRAWN` | 방금 뽑은 사람 | `PLAY(cardId = 뽑은 카드, color?)`, `KEEP`, `CALL_UNO` | `KEEP` |
| `CHOOSE_COLOR` | starter(첫 카드가 WILD일 때만) | `CHOOSE_COLOR(color)` | 가장 많은 색 |
| `CHALLENGE` | +4를 받은 사람 | `CHALLENGE`, `ACCEPT` | `ACCEPT` |

- 어느 단계에서든 잡기 창이 열려 있으면 남은 참가자(잡힐 사람 제외)는 `CATCH_UNO(targetId)`, 잡힐 사람 본인은 `CALL_UNO`(늦은 외치기)를 할 수 있다.

### 3.2 전이

```
시작 ─ 첫 카드 처리(R7) ─┬─ WILD → CHOOSE_COLOR(starter) ─ 색 고름 → PLAY(starter)
                        └─ 그 밖 → PLAY(첫 차례 사람)

PLAY(p)
 ├─ PLAY 카드 c (R8 통과, 와일드는 color 필수)
 │    ├─ p 손패 0장 → 마지막 효과 적용(R29, R30) → GAME_OVER
 │    ├─ c = WILD_DRAW_FOUR → CHALLENGE(다음 사람 q)
 │    └─ 그 밖 → 효과 적용(R15~R17) → PLAY(그 다음 차례 사람)
 └─ DRAW 1장
      ├─ 못 뽑음(더미 비어 있음) → PASS → PLAY(다음 사람)
      ├─ 뽑은 카드 낼 수 있음 → DRAWN(p)
      └─ 낼 수 없음 → PASS → PLAY(다음 사람)

DRAWN(p)
 ├─ PLAY 뽑은 카드 → PLAY와 같은 처리
 └─ KEEP → PASS → PLAY(다음 사람)

CHALLENGE(q)  (+4를 낸 사람 = w)
 ├─ ACCEPT → q 4장, 건너뜀 → PLAY(q 다음 사람)
 └─ CHALLENGE
      ├─ w 불법 → w 4장 → PLAY(q)
      └─ w 합법 → q 6장, 건너뜀 → PLAY(q 다음 사람)
```

- "다음 사람"은 현재 방향으로 남은 참가자 중 한 칸. "건너뜀"은 두 칸.
- 잡기 창(R25)은 위 전이와 따로 열리고 닫힌다.

### 3.3 마감(stage key)

- 서버는 단계가 시작될 때마다 1씩 오르는 `stageSeq`를 둔다. 마감 = 그 단계가 시작된 시각 + 15초.
- `stageSeq`가 바뀌는 경우: 차례 사람이 바뀜, 같은 사람이라도 단계가 바뀜(`CHOOSE_COLOR → PLAY`, `PLAY → DRAWN`, 도전 성공 후 `CHALLENGE → PLAY`), 2명 게임에서 SKIP/REVERSE/+2/+4로 같은 사람이 다시 `PLAY`.
- `stageSeq`가 바뀌지 않는 경우: `CALL_UNO`, `CATCH_UNO`, 차례 아닌 사람의 기권.
- 게임이 끝나면 `deadline()`은 비어 있다. 게임 중에는 늘 값이 있다.

## 4. 백엔드 설계

### 4.1 게임 종류

- `GameType`에 `UNO("우노", 2, 5)`를 `PAPER_SAFARI` **뒤에** 추가한다(`GameLobbyApiTest`가 `$[0] == PAPER_SAFARI`를 본다). `game_type` 칸은 `VARCHAR(30)`이라 DB 변경 없음.
- 프론트 경로 slug는 `uno`(프론트 카탈로그에서 정한다).

### 4.2 `GameAction` 넓히기

```java
public record GameAction(String type, Integer column, Integer row, Integer cardId, String color, Long targetId) {
    public GameAction(String type, Integer column, Integer row) {
        this(type, column, row, null, null, null);
    }
}
```

- 페이퍼 사파리와 `FakeGameSession`, 기존 테스트는 3인자 생성자로 그대로 동작한다. JSON에 새 칸이 없으면 `null`.
- 우노 행동 JSON(클라이언트 SEND `/app/rooms/{code}/actions`):

| type | 필드 | 설명 |
|---|---|---|
| `PLAY` | `cardId`(필수), `color`(와일드면 필수, `RED`/`YELLOW`/`GREEN`/`BLUE`) | 카드 내기(DRAWN이면 뽑은 카드만) |
| `DRAW` | - | 1장 뽑기 |
| `KEEP` | - | 뽑은 카드 갖고 넘기기 |
| `CHOOSE_COLOR` | `color`(필수) | 첫 카드 WILD 색 고르기 |
| `CHALLENGE` | - | +4 도전 |
| `ACCEPT` | - | +4 받기 |
| `CALL_UNO` | - | 우노 외치기(차례 중 2장, 또는 늦은 외치기) |
| `CATCH_UNO` | `targetId`(필수) | 우노 안 외친 사람 잡기 |

예: `{"type":"PLAY","cardId":104,"color":"GREEN"}`, `{"type":"CATCH_UNO","targetId":12}`.

### 4.3 패키지 `com.boardgame.uno`

필드 3개 이하, 원시값 VO, 일급 컬렉션, 규칙은 도메인 안. 아래는 권장 구성이다(이름·묶음은 구현 중 다듬어도 되지만 책임은 지킨다).

| 클래스 | 책임 |
|---|---|
| `UnoColor` (enum) | `RED, YELLOW, GREEN, BLUE`(선언 순서 = 자동 색 동점 우선순위), `of(String)`은 모르는 값이면 `UNO_INVALID_COLOR` |
| `CardKind` (enum) | `NUMBER, SKIP, REVERSE, DRAW_TWO, WILD, WILD_DRAW_FOUR`, `isWild()`, 점수 규칙 일부 |
| `CardNumber` (VO) | 0~9 |
| `CardId` (VO) | 0~107 |
| `CardFace` (record) | `kind, color(와일드는 null), number(숫자 카드만)`, `matches(CardFace top, UnoColor current)`(R8), `points()`(R3) |
| `UnoCard` (record) | `CardId id, CardFace face` |
| `StandardUnoDeck` | R1·R2 순서로 108장 생성 |
| `UnoShuffler` (interface) / `RandomUnoShuffler` | 섞기. 테스트는 `StackedUnoShuffler` |
| `StarterPicker` (interface) | `int pick(int playerCount)`. 운영은 `Random`, 테스트는 `count -> 0` |
| `DrawPile` (일급 컬렉션) | `draw(DiscardPile)`, `draw(count, DiscardPile)`(R14 다시 만들기 포함, 다시 만들었는지 이벤트로 알림), `putUnder(List<UnoCard>)`(R35), `size()` |
| `DiscardPile` (일급 컬렉션) | `top()`, `place(UnoCard)`, `takeAllButTop()`, `size()` |
| `ActiveColor` | 현재 색. 첫 카드 WILD 직후에는 비어 있음 |
| `Hand` (일급 컬렉션) | `has(CardId)`, `take(CardId)`, `add(List<UnoCard>)`, `size()`, `holdsColor(UnoColor)`(R11, 와일드는 색 카드로 치지 않음), `mostHeldColor()`(R40), `points()`, `playable(CardFace top, ActiveColor)` |
| `Hands` (일급 컬렉션) | `PlayerId → Hand` |
| `PlayerId` (VO) | 우노 패키지 전용(페이퍼 사파리 것을 건드리지 않는다) |
| `Direction` (enum) | `CLOCKWISE(+1)`, `COUNTER_CLOCKWISE(-1)`, `reversed()` |
| `TurnOrder` | 남은 참가자 순서 + 방향 + 현재 사람. `next()`, `afterNext()`, `advance(steps)`, `reverse()`, `remove(PlayerId)`, `size()` |
| `UnoStage` (enum) | `PLAY, DRAWN, CHOOSE_COLOR, CHALLENGE` |
| `Turn` (record) | `PlayerId actor, UnoStage stage, CardId drawn(DRAWN에서만)` |
| `FourCharge` | +4 도전 대기: `PlayerId by, boolean legal, List<UnoCard> handSnapshot` |
| `UnoCalls` | 이번 차례 외침 여부, 우노 선언한 사람들, 잡기 창 대상. `call`, `declareIfCalled`, `openCatch`, `closeCatch`, `catchBy` |
| `ChallengeReveal` | 도전자에게 보여 줄 공개 정보: `PlayerId challenger, PlayerId charged, ...` (다음 상태 변화 때 지운다) |
| `UnoEvents` (일급 컬렉션) | 마지막 상태 변화에서 생긴 이벤트들 + 전역 순번 |
| `UnoTable` | `DrawPile, DiscardPile, ActiveColor` 묶음 |
| `UnoPlayers` | `Hands, TurnOrder, UnoCalls` 묶음 |
| `UnoRound` | 한 판의 애그리거트: `UnoTable table, UnoPlayers players, UnoProgress progress(Turn·FourCharge·ChallengeReveal)`. 모든 규칙 메서드(`play`, `draw`, `keep`, `chooseColor`, `challenge`, `accept`, `callUno`, `catchUno`, `forfeit`, `autoAct`)가 여기에 있다 |
| `UnoRoundFactory` | 섞기·나눠 주기·첫 카드 처리(R5~R7) |
| `UnoGame` | `UnoRound`, 상태(`IN_PROGRESS`/`GAME_OVER`), 결과(`UnoResult`: 승자·점수·끝난 이유) |
| `UnoCommand` (enum) | 행동 type → 도메인 메서드 디스패치. 모르는 type은 `INVALID_INPUT`, 필수 필드가 없으면 `INVALID_INPUT` |
| `UnoCountdown` | `stageSeq`가 바뀔 때 다시 재는 15초 마감(`LIMIT = Duration.ofSeconds(15)`), `timing(waiting)` |
| `UnoAutoActors` | 자동 행동 대상 + `autoActSeq`(페이퍼 사파리 `AutoActors`와 같은 계약) |
| `UnoSession implements GameSession` | 아래 4.4 |
| `UnoSessionFactory` (`@Component`) | `type() = GameType.UNO`, `Clock` 주입, 운영 섞기·시작 사람 |
| `view/*` | 4.5의 JSON record들 |

- 페이퍼 사파리의 `TurnCountdown`/`AutoActors`/`TurnTiming`은 옮기지 않고 우노 패키지에 작은 짝을 만든다(페이퍼 사파리 회귀 위험 0, D14).
- 오류는 도메인에서 `BusinessException(ErrorCode.X)`로 던진다. 검사 순서: 게임 끝남(`GAME_ALREADY_OVER`) → 참가자 아님(`NOT_A_PLAYER`) → 차례 아님(`NOT_YOUR_TURN`, 잡기·늦은 외치기 제외) → 단계 아님(`INVALID_PHASE`) → 카드/색/대상 검사.

### 4.4 `UnoSession` 계약

- `act(memberId, action)`: 단계 전(`stageSeq`) 기억 → `UnoCommand` 실행 → 자동 행동 대상 비우기 → 마감 따라가기 → 끝났으면 결과 반환.
- `autoAct(random)`: 현재 단계 행동 사람을 대신해 R40 행동, `UnoAutoActors.replaceWith([actor])`. 이벤트에 `auto: true`.
- `forfeit(memberId)`: R35~R39.
- `deadline()`: 게임 중이면 `UnoCountdown.deadline()`, 끝나면 비어 있음.
- `isPlaying(memberId)`: 남은 참가자이고 게임 중일 때만 true.
- `isFinished()`, `roundNumber()` = 1.
- 결과(끝나는 행동에서 딱 한 번): 손패를 다 내서 끝나면 `[RoundCompleted(1, entries), GameCompleted(entries)]`, 기권으로 끝나면 `[GameCompleted]`. `RoundEntry(memberId, WIN|LOSE, score)`는 R32, `MatchEntry(memberId, result, 0, seat)`는 **처음 참가자 모두**(기권자는 `LOSE`), `seat` = 처음 `memberIds`에서의 순서.
- `viewFor(memberId)`: `new UnoSessionView("UNO", game.viewFor(viewer, timing))`. 참가자가 아니어도(관전자, 끝난 뒤 앉은 사람) 공개 화면을 준다.

### 4.5 화면 JSON(사람마다 다름)

- 세션 화면에 게임 종류 구분자를 둔다: 우노 `{"gameType":"UNO","game":{...}}`. 페이퍼 사파리 `PaperSafariSessionView`에도 `gameType: "PAPER_SAFARI"` 칸을 **추가**한다(기존 `game`은 그대로, 칸이 늘기만 함). 프론트는 이 값으로 기록 해설·화면을 고른다(D3).
- `UnoView`(`game`):

```json
{
  "viewerId": 7,
  "status": "IN_PROGRESS",
  "startedAt": 1791400000000,
  "stage": "PLAY",
  "currentPlayerId": 7,
  "direction": "CLOCKWISE",
  "currentColor": "GREEN",
  "discardTop": { "id": 57, "kind": "NUMBER", "color": "GREEN", "number": 4 },
  "discardCount": 12,
  "drawPileCount": 61,
  "participantIds": [7, 12, 15],
  "players": [
    { "playerId": 7, "cardCount": 5, "unoDeclared": false },
    { "playerId": 12, "cardCount": 1, "unoDeclared": true },
    { "playerId": 15, "cardCount": 9, "unoDeclared": false }
  ],
  "hand": [ { "id": 3, "kind": "NUMBER", "color": "RED", "number": 2 }, { "id": 104, "kind": "WILD_DRAW_FOUR", "color": null, "number": null } ],
  "playableCardIds": [104],
  "wildDrawFourRisky": false,
  "drawnCardId": null,
  "canCallUno": false,
  "unoCatch": null,
  "canCatch": false,
  "challenge": null,
  "reveal": null,
  "result": null,
  "winnerId": null,
  "deadline": 1791400015000,
  "serverNow": 1791400003120,
  "lastAutoActorIds": [],
  "autoActSeq": 0,
  "events": [ { "seq": 31, "type": "PLAY", "actorId": 15, "targetId": null, "card": { "id": 57, "kind": "NUMBER", "color": "GREEN", "number": 4 }, "color": null, "count": null, "reason": null, "auto": false } ]
}
```

칸 설명:

| 칸 | 값 |
|---|---|
| `status` | `IN_PROGRESS` / `GAME_OVER` |
| `startedAt` | 게임 시작 시각(epoch ms). 결과 창 닫음 기억 키에 쓴다 |
| `stage` | `PLAY`/`DRAWN`/`CHOOSE_COLOR`/`CHALLENGE`, 끝나면 `null` |
| `currentPlayerId` | 지금 단계에서 행동할 사람. 끝나면 `null` |
| `currentColor` | 현재 색. 첫 카드 WILD 색 고르기 전에는 `null` |
| `players` | 남은 참가자만, 자리 순서. 장수와 우노 선언 여부만 |
| `participantIds` | 처음 참가자 전체(기권자 포함), 자리 순서 |
| `hand` | 보는 사람이 남은 참가자면 자기 손패(서버 정렬 없음, 받은 순서), 아니면 `null` |
| `playableCardIds` | 보는 사람이 지금 낼 수 있는 카드 id(`PLAY` 단계면 R8, `DRAWN`이면 뽑은 카드만, 그 밖·남의 차례는 `[]`). 불법 +4도 들어간다(R11) |
| `wildDrawFourRisky` | 보는 사람이 지금 +4를 내면 불법인지(현재 색 카드를 갖고 있음). 내 차례에만 의미 있고 그 밖은 `false` |
| `drawnCardId` | `DRAWN` 단계의 그 사람에게만 뽑은 카드 id, 그 밖 `null` |
| `canCallUno` | 보는 사람이 지금 `CALL_UNO`를 할 수 있는지(R23, R27) |
| `unoCatch` | 잡기 창이 열려 있으면 `{ "playerId": 12 }`, 아니면 `null`(모두에게 공개) |
| `canCatch` | 보는 사람이 지금 잡을 수 있는지(남은 참가자이고 대상이 아님) |
| `challenge` | `CHALLENGE` 단계면 `{ "byId": 15, "targetId": 7 }`(합법 여부는 넣지 않는다) |
| `reveal` | 도전자 본인 화면에만, 도전 처리 직후 상태에서만: `{ "playerId": 15, "cards": [CardView...], "guilty": true }`. 다음 상태 변화 때 지워진다 |
| `result` | 끝났을 때만: `{ "reason": "EMPTY_HAND" \| "FORFEIT", "winnerId": 7, "points": 47, "players": [ { "playerId": 12, "cards": [CardView...], "points": 30 } ] }`. `players`는 이긴 사람을 뺀 남은 참가자이며, 끝난 뒤에는 모두에게 손패를 공개한다. `FORFEIT`면 `points = 0`, `players = []` |
| `winnerId` | 끝났을 때 이긴 사람, 아니면 `null` |
| `deadline`, `serverNow` | epoch ms. 끝나면 `deadline = null` |
| `lastAutoActorIds`, `autoActSeq` | 페이퍼 사파리와 같은 계약(자동 행동마다 `autoActSeq` +1) |
| `events` | 마지막 상태 변화에서 생긴 이벤트(모두에게 같음). `seq`는 게임 안에서 계속 오른다 |

- `CardView`: `{ "id": int, "kind": "NUMBER"|"SKIP"|"REVERSE"|"DRAW_TWO"|"WILD"|"WILD_DRAW_FOUR", "color": "RED"|"YELLOW"|"GREEN"|"BLUE"|null, "number": 0..9|null }`.
- `UnoEventView`: `{ seq, type, actorId, targetId, card, color, count, reason, auto }`. 쓰지 않는 칸은 `null`(`auto`는 boolean).

| type | 뜻 | 쓰는 칸 |
|---|---|---|
| `START` | 시작 | `actorId`(첫 차례 사람), `card`(첫 카드) |
| `FIRST_CARD_REDRAWN` | 첫 카드가 +4라 다시 뒤집음 | `card` |
| `PLAY` | 카드를 냄 | `actorId`, `card`, `color`(와일드일 때 고른 색) |
| `COLOR` | 첫 카드 WILD 색을 고름 | `actorId`, `color` |
| `DRAW` | 자발적으로 1장 뽑음 | `actorId`, `count`=1 |
| `PASS` | 차례를 넘김 | `actorId`, `reason`=`KEEP`/`NO_PLAYABLE`/`EMPTY_PILE` |
| `SKIP` | 차례를 잃음(SKIP, 2인 REVERSE) | `targetId` |
| `REVERSE` | 방향이 바뀜(3인 이상) | `actorId` |
| `PENALTY` | 벌칙으로 뽑고(필요하면 건너뜀) | `targetId`, `count`, `reason`=`DRAW_TWO`/`WILD_DRAW_FOUR`/`CHALLENGE_FAILED`/`CHALLENGE_GUILTY`/`UNO_CAUGHT` |
| `CHALLENGE` | 도전함 | `actorId`(도전자), `targetId`(+4 낸 사람), `reason`=`GUILTY`/`INNOCENT` |
| `UNO_CALL` | 우노를 외침(선언됨) | `actorId` |
| `UNO_CAUGHT` | 우노를 잡음 | `actorId`(잡은 사람), `targetId` |
| `RESHUFFLE` | 뽑을 더미를 다시 만듦 | `count`(새 더미 장수) |
| `GAME_END` | 끝 | `actorId`(승자, 기권으로 끝나도), `count`(점수) |

- 실제 뽑은 카드 얼굴은 이벤트에 넣지 않는다(뽑은 사람은 `hand`로 안다).
- 숨은 정보 점검: 남의 `hand`, 뽑을 더미 순서, 남의 `drawnCardId`, +4 합법 여부(`reveal` 받는 도전자 외), 남의 `wildDrawFourRisky`는 절대 보내지 않는다.

### 4.6 시간 초과 연결

- `RoomService.rearm`은 바뀌지 않는다. 세션이 `deadline()`을 늘 채우고(게임 중), `autoAct`가 늘 진행하므로 기존 `TurnTimer`·재시도 흐름에 그대로 올라탄다.
- 연결 끊김 60초 자동 기권(`DisconnectForfeitScheduler`)은 `isPlaying`·`forfeit`만 쓰므로 그대로 동작한다.

### 4.7 오류 코드(새로 추가)

| 코드 | 상태 | 메시지 |
|---|---|---|
| `UNO_INVALID_PLAYER_COUNT` | 400 | 우노는 2~5명이 플레이할 수 있습니다. |
| `UNO_CARD_NOT_IN_HAND` | 400 | 내 손에 없는 카드예요. |
| `UNO_CARD_NOT_PLAYABLE` | 409 | 지금 낼 수 없는 카드예요. |
| `UNO_ONLY_DRAWN_CARD` | 409 | 방금 뽑은 카드만 낼 수 있어요. |
| `UNO_COLOR_REQUIRED` | 400 | 와일드 카드는 색을 골라야 해요. |
| `UNO_INVALID_COLOR` | 400 | 고를 수 없는 색이에요. |
| `UNO_CALL_NOT_ALLOWED` | 409 | 지금은 우노를 외칠 수 없어요. |
| `UNO_CATCH_CLOSED` | 409 | 지금은 우노를 잡을 수 없어요. |

- 그대로 쓰는 코드: `INVALID_INPUT`(모르는 type, `cardId`/`targetId` 빠짐), `NOT_A_PLAYER`, `NOT_YOUR_TURN`, `INVALID_PHASE`, `GAME_ALREADY_OVER`.
- `INVALID_CAPACITY`("2~5명")는 두 게임 모두 2~5명이라 그대로 둔다.
- 화면은 오류가 오면 기존처럼 오류 토스트(`errorSeq`)와 보내기 잠금 해제를 한다. `UNO_CATCH_CLOSED`는 경쟁에서 진 흔한 경우라 토스트 대신 잡기 버튼만 사라지게 하고 조용히 넘긴다.

## 5. 프론트엔드: 게임별 이음매

### 5.1 공통 부품 옮기기(동작 변화 없음)

- `F/games/papersafari/layout/`의 `TurnBar`, `LogList`, `LogModal`, `GameEndBanner`, `seats.ts`(+테스트)를 `F/table/`로 옮긴다. import만 바뀐다.
- `GameOverPanel`에서 `ReadyChips`, `FooterButton`, `useResultSound`, `HeadlineIcon`을 `F/table/gameOver.tsx`로 꺼낸다.
- `RulesCarousel`을 `F/table/RulesCarousel.tsx`로 옮기고 `({ title, slides, renderArt, open, onClose })`로 일반화한다. 페이퍼 사파리는 `renderArt = slide => <CardFace…/>`를 넘긴다.

### 5.2 게임 등록부 `F/games/registry.ts`

```ts
export type TableProps<V> = {
  view: V; room: Room; meId: number; log: LogEntry[]; receivedAt: number; now: number; errorSeq: number;
  nicknameOf: (id: number) => string; send: (action: GameAction) => void;
  onCloseGameOver: () => void; onReadyNext: () => void; transition?: ViewTransition<V> | null;
  aside?: ReactNode; asideFooter?: ReactNode;
};
export type GameModule<V> = {
  gameType: GameType; name: string; slug: string; tagline: string; minPlayers: number; maxPlayers: number;
  Table: ComponentType<TableProps<V>>;
  describeChanges: (prev: V | null, next: V, nicknameOf: (id: number) => string) => LogDraft[];
  isGameOver: (view: V) => boolean;
  wasParticipant: (view: V, meId: number) => boolean;
  gameOverKey: (code: string, view: V) => string;
  rules: { title: string; summary: string[]; slides: RuleSlideBase[]; renderArt: (slide: RuleSlideBase) => ReactNode };
  BoxArt: ComponentType;
  averageScoreLabel: string;
};
export const GAMES: Record<GameType, GameModule<any>>;
export function gameOf(type: GameType): GameModule<any>;
```

- `F/games/papersafari/module.ts`: 지금 동작 그대로 감싼다(`describeChanges` = 기존 `eventLog.describeChanges`, `gameOverKey` = 기존 키, `averageScoreLabel = '평균 점수'`).
- `F/games/uno/module.ts`: 우노(아래 6장). `averageScoreLabel = '평균 획득 점수'`, `gameOverKey = `${code}:UNO:${view.game.startedAt}``.
- `catalog.ts`의 `CATALOG`는 등록부에서 만든다: `{ gameType: 'UNO', slug: 'uno', tagline: '2~5인 · 손패를 먼저 비워라!' }`를 페이퍼 사파리 뒤에. `COMING_SOON_SLOTS = 1` 유지(선반에 "곧 나와요" 한 칸이 남는다).

### 5.3 등록부를 쓰는 곳

| 파일 | 바꿀 점 |
|---|---|
| `api/types.ts` | `GameType = 'PAPER_SAFARI' \| 'UNO'`. 우노 타입 추가(6.1). `GameAction`에 `cardId?`, `color?`, `targetId?`. `PaperSafariSessionView`에 `gameType?: 'PAPER_SAFARI'`. `SessionView = PaperSafariSessionView \| UnoSessionView` |
| `room/useRoomChannel.ts` | `view: SessionView`, `ViewTransition<V>` 일반화. 받은 화면의 `gameType`(없으면 `'PAPER_SAFARI'`)으로 `gameOf(...).describeChanges`를 고른다. 이전 화면과 `gameType`이 다르면 이전 것을 `null`로 보고 비교한다 |
| `pages/RoomPage.tsx` | `const game = gameOf(room.gameType)`. `<game.Table …/>`, `game.isGameOver`, `game.wasParticipant`, `useGameOverDismissal(code, key, playing)`(키를 받도록 바꿈). 화면 `gameType`이 방과 다르면 그리지 않는다 |
| `room/useGameOverDismissal.ts` | 두 번째 인자를 `key: string \| null`로 |
| `room/WaitingRoom.tsx` | 규칙 요약·캐러셀·제목(`{name} 규칙`)을 등록부에서 |
| `pages/GameShelfPage.tsx` | 이름·규칙 보기 캐러셀을 항목별로. `DEFAULT_NAMES`에 `UNO: '우노'` |
| `games/GameBox.tsx`, `pages/GameLobbyPage.tsx` | `BoxArt`, 제목을 등록부에서. `'PAPER_SAFARI'` 기본값 제거 |
| `room/SeatPicker.tsx`, `CreateRoomModal`, `RoomSettingsModal` | 인원 범위를 `minPlayers..maxPlayers`로(두 게임 모두 2~5) |
| `pages/RecordsPage.tsx` | 최근 게임·순위표 위에 게임 탭(페이퍼 사파리 / 우노, `role="tablist"`). 제목 `{name} 순위표 (5판 이상)` |
| `records/StatSummary.tsx` | "평균 점수" 대신 `gameOf(stat.gameType).averageScoreLabel` |
| `lib/eventLog.ts` | `LogKind`에 `'play' \| 'skip' \| 'reverse' \| 'color' \| 'challenge' \| 'uno' \| 'catch' \| 'reshuffle'` 추가. 페이퍼 사파리 해설은 `games/papersafari/describe.ts`로 옮긴다(`prependLog` 등 공통은 남김) |
| `table/LogList.tsx` | 새 종류마다 `KIND_STYLE` 아이콘·바탕색 |

## 6. 프론트엔드: 우노 화면

### 6.1 타입(`api/types.ts`)

`UnoColor`, `UnoCardKind`, `UnoCard { id; kind; color: UnoColor | null; number: number | null }`, `UnoStage`, `UnoPlayerView`, `UnoEvent`, `UnoResult`, `UnoView`(4.5의 칸 그대로), `UnoSessionView = { gameType: 'UNO'; game: UnoView }`.

### 6.2 파일(`F/games/uno/`)

`module.ts`, `UnoTable.tsx`, `UnoCardFace.tsx`(앞면·뒷면 SVG), `UnoHand.tsx`, `UnoSeat.tsx`, `UnoCenter.tsx`(뽑을 더미·버린 더미·색 고리·방향), `UnoActionBar.tsx`, `ColorPicker.tsx`, `ChallengePrompt.tsx`, `ChallengeReveal.tsx`, `UnoGameOverPanel.tsx`, `describe.ts`, `cards.ts`(이름·정렬·색 이름), `rules.ts`, `UnoBoxArt.tsx`, `motion/useUnoMotion.ts`, 각 테스트.

### 6.3 카드 그림

- 비율 2:3, 둥근 모서리(폭의 10%), 흰 테두리(폭의 6%).
- 색: 빨강 `#D93A3A`, 노랑 `#F2B705`, 초록 `#2E9E4F`, 파랑 `#2B6CD4`, 와일드 바탕 `#1F2430`. 테마와 상관없이 고정(카드 색은 규칙 정보다).
- 앞면 가운데: **똑바로 선 흰 타원**(가로 70%, 세로 82%, 기울이지 않음) 안에 큰 기호를 카드 색으로. 왼쪽 위·오른쪽 아래(180도 회전)에 작은 기호를 흰색으로.
- 기호(모두 SVG path): 숫자는 굵은 숫자 글꼴(시스템 굵은 산세리프, `font-weight: 900`), 6과 9는 밑줄. SKIP = 사선 그은 원. REVERSE = 서로 반대로 도는 굽은 화살표 두 개. DRAW_TWO = "+2" 글자. WILD = 네 색으로 나뉜 원(가운데 타원 대신). WILD_DRAW_FOUR = 네 색 원 + 그 위 "+4".
- 색맹 보조: 왼쪽 아래 구석에 색마다 작은 모양(빨강 원, 노랑 삼각형, 초록 사각형, 파랑 마름모, 흰색 60% 투명).
- 뒷면: 방 테마의 카드 뒷면 변수(`--card-back-from`, `--card-back-to`, 없으면 남색 `#23305A`→`#3B4C8C` 그라데이션) 위에 둥근 고리 무늬와 가운데 "우노" 글자(흰색, 기울이지 않은 둥근 굵은 글꼴). 검은 바탕에 빨간 타원 로고는 쓰지 않는다.
- 이름(접근성·기록 공통, `cards.ts`의 `cardName`): 숫자 `빨강 7`, `파랑 건너뛰기`, `초록 방향 바꾸기`, `노랑 +2`, `와일드`, `와일드 +4`. 색 이름: 빨강·노랑·초록·파랑.

### 6.4 배치

공통: 기존 `Felt` 타원 테이블과 테마 CSS 변수, `RoomStatusBar`, `TurnBar`(위), 채팅(PC 오른쪽 칸 260px / 세로 휴대폰은 테이블 아래 채팅 줄 / 눕힌 화면은 왼쪽 칸 아래), 닉네임 메뉴, 효과음을 그대로 쓴다. 상대 자리는 `seatOrder` + `seatRows`(최대 4명)로 페이퍼 사파리와 같은 위치에 앉힌다.

| 요소 | PC (`pc`) | 휴대폰 가로 (`landscape`) | 휴대폰 세로 (`portrait`, 360px 기준) |
|---|---|---|---|
| 내 손패 카드 | 88×132 | 56×84 | 60×90 |
| 손패 겹침 최소 보이는 폭 | 32px | 24px | 24px |
| 상대 뒷면 카드 | 36×54 | 24×36 | 22×33 |
| 가운데 더미 카드 | 96×144 | 64×96 | 64×96 |
| 손패 모양 | 부채꼴(카드마다 최대 ±12° 안에서 고르게 기울임, 가운데가 높음) | 평평한 한 줄 | 평평한 한 줄 |

- **상대 자리**(`UnoSeat`): 이름표(기존 자리 이름표 모양, 연결 끊김 표시 같음) + 뒷면 카드 부채(장수만큼, 최대 7장까지 겹쳐 그리고 나머지는 생략) + 장수 숫자 배지("N장") + 우노 배지(선언 시, 노랑 바탕 "우노" 글자와 별 아이콘) + 차례면 이름표 빛 테두리와 5초 이하 작은 카운트다운(페이퍼 사파리와 같은 규칙). 잡기 창 대상이면 이름표 옆에 빨간 느낌표 배지.
- **가운데**(`UnoCenter`): 왼쪽 뽑을 더미(뒷면 3장 겹친 모양 + 장수 "61장", 내 `PLAY` 단계면 눌러서 뽑기, `aria-label="카드 뽑기"`), 오른쪽 버린 더미(맨 위 카드 + 그 아래 2장을 −8°/+6°로 살짝 비틀어). 버린 더미 둘레에 **현재 색 고리**(두께 6px, 현재 색) + 고리 아래 색 이름 글자("지금 색: 초록"). 두 더미를 감싸는 **방향 표시**: 테이블 가운데 큰 원을 따라 도는 화살표 두 개(시계 방향/반대), 20초에 한 바퀴 천천히 돎(동작 줄이기면 멈춤). 방향이 바뀌면 화살표가 좌우 반전되며 0.4초 동안 커졌다 돌아온다. `aria-label="진행 방향: 시계 방향"` / `"진행 방향: 시계 반대 방향"`.
- **내 손패**(`UnoHand`): 색(빨강·노랑·초록·파랑·와일드) → 종류(숫자 작은 순 → 건너뛰기 → 방향 바꾸기 → +2 → 와일드 → 와일드 +4) 순으로 정렬해 보여 준다. 화면 폭에 맞춰 겹침을 줄이다가 최소 보이는 폭 아래로 내려가면 가로 스크롤(스크롤 끝 흐림, 스냅 없음). 손패 줄 높이는 고정(카드를 가져와도 줄 높이가 변하지 않는다).
  - 내 `PLAY` 단계: 낼 수 있는 카드는 10px 들리고 흰 빛 테두리, 낼 수 없는 카드는 투명도 0.55. `DRAWN` 단계: 뽑은 카드만 들리고 나머지는 흐림.
  - 남의 차례: 모두 보통 밝기, 들림 없음.
  - 방금 뽑은 카드는 1.2초 동안 노란 테두리로 표시.
- **행동 바**(`UnoActionBar`, 손패 바로 위, 높이 고정): 상황에 따라 버튼을 보인다.
  - 내 `PLAY`: "카드 뽑기"(보조 버튼).
  - 내 `DRAWN`: "뽑은 카드 내기"(주 버튼), "갖고 넘기기"(보조).
  - "우노!": `canCallUno`면 노랑 큰 버튼, 0.9↔1.05배로 숨 쉬듯 커졌다 작아짐(동작 줄이기면 빛만). 누르면 외침 상태로 바뀌어 "우노 외침"(체크 아이콘, 비활성)으로 보인다.
  - "우노 안 외쳤어요!": `canCatch`면 빨강 큰 버튼(`aria-label="{닉네임}님 우노 안 외친 것 잡기"`). 남은 시간 표시 없음(다음 행동까지).
- **세로 휴대폰 순서**: 상태 바 → TurnBar → 테이블(상대 위 줄, 가운데 더미) → 행동 바 → 손패 → 채팅 줄. 상대가 3~4명이면 위 줄에 한 줄로(이름표 줄임, 뒷면 부채는 4장까지).
- **휴대폰 가로**: 왼쪽 칸(상태 바·TurnBar·채팅 줄) | 오른쪽 테이블(상대 위 줄, 가운데, 행동 바와 손패 아래). 페이퍼 사파리 가로 배치와 같은 나눔.
- **관전자**: 손패 자리에 기존 `SpectatorNotice`("관전 중이에요" 안내) 모양을 쓰고, 행동 바 없음. 잡기·외치기 없음.

### 6.5 상호작용

- 카드 내기: 마우스 등 정밀 포인터(`(pointer: fine)`)는 낼 수 있는 카드를 한 번 클릭하면 바로 낸다. 터치(`(pointer: coarse)`)는 한 번 누르면 카드가 24px 더 들리고 위에 "내기" 알약 버튼이 뜨며, 같은 카드나 "내기"를 다시 누르면 낸다(실수 방지). 다른 곳을 누르면 선택 취소. 키보드: 카드는 `button`, Enter/Space로 냄(터치 규칙과 상관없이 바로).
- 와일드 내기: 카드를 고르면 색 고르기 창(`ColorPicker`)이 뜨고, 색을 누르면 `PLAY {cardId, color}`를 보낸다. "취소"로 닫으면 아무것도 보내지 않는다. 창이 떠 있는 동안에도 차례 시간은 흐른다.
- 보내기 중복 방지: 페이퍼 사파리 `PENDING_MS = 3000` 패턴(보내고 화면이 바뀌거나 오류가 오거나 3초가 지나기 전에는 다시 보내지 않음). 잡기·외치기도 같은 잠금을 쓴다.
- **색 고르기 창**(`Modal`): 제목 "색을 골라 주세요". 2×2 큰 버튼(색 바탕, 흰 글자 "빨강"·"노랑"·"초록"·"파랑", 아래 작게 "내 카드 N장"). 와일드 +4이고 `wildDrawFourRisky`면 버튼 위 경고 한 줄: "지금 색 카드가 있어서, 도전받으면 내가 4장을 뽑아요." 버튼 "취소". 첫 카드 WILD의 `CHOOSE_COLOR` 단계에서는 같은 창을 취소 버튼 없이, 제목 "첫 카드가 와일드예요. 색을 골라 주세요"로 띄운다.
- **도전 창**(`ChallengePrompt`, 닫기 없음, 내가 `CHALLENGE` 단계일 때): 제목 "와일드 +4를 받았어요", 본문 "{닉네임}님이 지금 색 카드를 갖고 있었다고 생각하면 도전하세요. 맞으면 {닉네임}님이 4장, 틀리면 내가 6장을 뽑아요.", 카운트다운, 버튼 "4장 받기"(보조) / "도전하기"(주, 빨강).
- **도전 결과 공개**(`ChallengeReveal`, `reveal`이 있을 때 도전자에게만): 제목 "{닉네임}님의 카드", 그 손패를 작은 카드로 한 줄(현재 색 카드에 노란 테두리), 판정 "지금 색 카드가 있었어요. 도전 성공!" / "지금 색 카드가 없었어요. 도전 실패…". 버튼 "확인". 5초 뒤 저절로 닫힘. 같은 공개는 한 번만(이벤트 `seq` 기준) 띄운다.
- 다른 사람에게는 도전 결과가 기록 줄과 토스트(info)로만 보인다.

### 6.6 차례 안내 문구(TurnBar `instruction`)

| 상황 | PC(`wide`) | 좁은 화면 |
|---|---|---|
| 내 `PLAY` | 낼 카드를 고르거나 카드를 뽑으세요. | 카드를 내거나 뽑으세요 |
| 내 `DRAWN` | 뽑은 카드를 낼까요? 아니면 갖고 넘기세요. | 뽑은 카드를 낼까요? |
| 내 `CHOOSE_COLOR` | 첫 카드가 와일드예요. 색을 골라 주세요. | 색을 골라 주세요 |
| 내 `CHALLENGE` | 와일드 +4에 도전할지 골라 주세요. | 도전할지 골라 주세요 |
| 남의 `CHALLENGE` | {닉네임}님이 도전할지 고르는 중… | 같음 |
| 남의 그 밖 | {닉네임}님의 차례예요. | 같음 |
| 끝남 | 게임이 끝났어요. | 같음 |

### 6.7 진행 기록 문구(`describe.ts`)

- 처음 받은 화면(`prev = null`)은 기록하지 않는다. 그 밖에는 `next.events` 중 `seq > max(prev.events.seq)`인 것만 순서대로 쓴다(동기화로 같은 화면이 다시 와도 중복 없음).
- `auto: true` 이벤트는 따로 쓰지 않고, `autoActSeq`가 늘었을 때 아래 "시간 초과" 한 줄로 대신한다(`RESHUFFLE`, `PENALTY`처럼 자동 행동의 결과로 생긴 비-행동 이벤트는 쓴다).

| 이벤트 | 기록 종류 | 문구 |
|---|---|---|
| `START` | start | {닉네임}님부터 시작해요 · 첫 카드: {카드} |
| `FIRST_CARD_REDRAWN` | other | 첫 카드가 와일드 +4라 다시 뒤집었어요 |
| `PLAY`(와일드 아님) | play | {닉네임}님이 {카드} 카드를 냈어요 |
| `PLAY`(와일드) | play | {닉네임}님이 {카드} 카드를 내고 {색}으로 정했어요 |
| `COLOR` | color | {닉네임}님이 {색}으로 정했어요 |
| `DRAW` | draw-deck | {닉네임}님이 카드를 1장 뽑았어요 |
| `PASS` `KEEP` | other | {닉네임}님이 뽑은 카드를 갖고 차례를 넘겼어요 |
| `PASS` `NO_PLAYABLE` | other | {닉네임}님이 뽑은 카드를 낼 수 없어 차례를 넘겼어요 |
| `PASS` `EMPTY_PILE` | other | 뽑을 카드가 없어 {닉네임}님의 차례를 넘겼어요 |
| `SKIP` | skip | {닉네임}님의 차례를 건너뛰어요 |
| `REVERSE` | reverse | 진행 방향이 바뀌었어요 |
| `PENALTY` `DRAW_TWO` | draw-deck | {닉네임}님이 2장을 뽑고 차례를 건너뛰어요 |
| `PENALTY` `WILD_DRAW_FOUR` | draw-deck | {닉네임}님이 4장을 받고 차례를 건너뛰어요 |
| `CHALLENGE` `GUILTY` | challenge | {도전자}님이 도전에 성공했어요! {낸 사람}님이 4장을 뽑아요 |
| `CHALLENGE` `INNOCENT` | challenge | {도전자}님이 도전에 실패해 6장을 뽑고 차례를 건너뛰어요 |
| `PENALTY` `CHALLENGE_*` | (쓰지 않음, 위 줄에 포함) | |
| `UNO_CALL` | uno | {닉네임}님이 우노를 외쳤어요! |
| `UNO_CAUGHT` | catch | {잡은 사람}님이 {닉네임}님의 우노를 잡았어요! {닉네임}님이 2장을 뽑아요 |
| `PENALTY` `UNO_CAUGHT` | (쓰지 않음) | |
| `RESHUFFLE` | reshuffle | 버린 카드를 섞어 뽑을 더미를 다시 만들었어요 |
| `GAME_END`(손패 비움) | result | {닉네임}님이 게임에서 승리했어요! ({점수}점) |
| `GAME_END`(기권) | result | {닉네임}님이 게임에서 승리했어요! |
| 새 게임(끝남 → 진행) | other | 새 게임을 시작해요 |

- 시간 초과(`autoActSeq` 증가, 직전 화면의 `stage` 기준): `PLAY` "시간이 지나 {닉네임}님 대신 카드를 1장 뽑고 차례를 넘겼어요", `DRAWN` "시간이 지나 {닉네임}님 대신 뽑은 카드를 갖고 차례를 넘겼어요", `CHOOSE_COLOR` "시간이 지나 {닉네임}님 대신 {색}을 골랐어요"(색은 같은 화면의 `COLOR` 이벤트), `CHALLENGE` "시간이 지나 {닉네임}님 대신 도전하지 않고 4장을 받았어요".
- 기권 알림(`leave`)은 기존 방 단위 흐름 그대로.
- 새 기록 종류 아이콘(인라인 SVG): play = 카드 한 장, skip = 사선 원, reverse = 굽은 화살표 둘, color = 네 칸 원, challenge = 저울, uno = 별 말풍선, catch = 손바닥, reshuffle = 섞기 화살표.

### 6.8 애니메이션

- 카드 날아가기(기존 GhostLayer 방식, `useUnoMotion`): 이벤트를 보고 손패/상대 자리 → 버린 더미(낼 때, 0.35초, 상대 카드는 날아가며 앞면으로 뒤집힘), 뽑을 더미 → 손패/상대 자리(뽑을 때, 장당 0.25초, 0.08초 간격, 최대 6장까지 날리고 나머지는 바로 반영). 동작 줄이기면 날아가기 없이 0.2초 투명도 변화만.
- 버린 더미 맨 위 카드는 놓일 때 0.9배 → 1배, 무작위 아닌 카드 id 기반 각도(−6°~+6°)로 놓인다(다시 그려도 같은 각도).
- 현재 색 고리: 색이 바뀌면 0.3초 동안 색이 바뀐다.
- 우노 외침: 그 사람 자리에 "우노!" 말풍선이 0.6배 → 1배로 튀어나와 1.5초 머문다(기존 자리 말풍선 위치 재사용). 잡힘: 대상 자리가 좌우로 6px 두 번 흔들린다.
- SKIP 대상: 이름표 위에 사선 원 아이콘이 0.8초 동안 떴다 사라진다.
- 게임 끝: 마지막 카드가 날아간 뒤 기존 `GameEndBanner`("게임 끝!") → 결과 창. 남은 손패는 결과 창에서 펼친다.

### 6.9 효과음

- 그대로 사용: 카드 내기 `place`, 뽑기 `draw`(여러 장이면 0.12초 간격 최대 4번), 내 차례 시작 `myTurn`(내 `stageSeq` 단계가 새로 시작할 때, 단 `DRAWN`은 제외), 5초 경고 `tick`(Countdown `onWarn`), 결과 `roundWin`/`roundLose`, 버튼 `click`.
- 새 소리 하나: `uno`(밝은 두 음, 0.25초, 상승 C6→G6 삼각파). 우노 외침과 잡힘 때 모두에게 울린다. `SoundName`과 `RECIPES`에 추가.

### 6.10 결과 창(`UnoGameOverPanel`)

- 기존 결과 창 `Modal`("게임 결과") 틀, `Confetti`(이긴 사람 본인 화면), `useResultSound`, `ReadyChips`, `FooterButton`("다음 게임 준비" / 방장 "대기실로")을 재사용한다.
- 머리말: 내가 이기면 "내가 이겼어요!", 아니면 "{닉네임}님이 이겼어요!". 그 아래 큰 숫자 "+{점수}점"(`RollingNumber`로 0에서 올라감).
- 표: 진 사람마다 한 줄 — 이름, 남은 카드(작은 카드 최대 10장, 넘치면 "+N"), "N장", "{점}점". 점수 큰 순.
- 기권으로 끝나면(`result.reason = 'FORFEIT'`): 머리말 아래 "상대가 모두 나가서 게임이 끝났어요", 점수·표 없음.
- 관전자도 같은 창(지켜본 경우, 기존 조건).

### 6.11 규칙 캐러셀(`rules.ts`)

제목 "우노 규칙". 슬라이드(그림은 우노 카드):

1. **목표** — "손에 든 카드를 가장 먼저 모두 내면 이겨요.", "한 판으로 승부가 나요." (카드: 빨강 1, 노랑 2, 초록 3)
2. **준비** — "각자 카드 7장을 받아요.", "더미에서 1장을 뒤집어 시작 카드로 놓아요. 시작 카드가 기능 카드면 그 효과부터 적용해요." (뒷면 3장)
3. **내 차례** — "맨 위 카드와 색·숫자·기호 중 하나가 같은 카드 1장을 내요.", "와일드는 언제든 낼 수 있어요." (파랑 5 → 파랑 8, 빨강 8)
4. **카드 뽑기** — "낼 카드가 없거나 내고 싶지 않으면 1장을 뽑아요.", "뽑은 카드를 낼 수 있으면 바로 낼 수 있어요. 아니면 차례가 넘어가요.", "한 번에 1장만 내요. +2 위에 +2를 겹쳐 낼 수 없어요."
5. **기능 카드** — "건너뛰기: 다음 사람은 차례를 쉬어요.", "방향 바꾸기: 도는 방향이 반대가 돼요. 둘이서 할 때는 건너뛰기와 같아요.", "+2: 다음 사람은 2장을 뽑고 차례를 쉬어요." (건너뛰기, 방향 바꾸기, +2)
6. **와일드** — "와일드: 낼 때 다음 색을 골라요.", "와일드 +4: 색을 고르고, 다음 사람은 4장을 뽑고 차례를 쉬어요.", "와일드 +4는 지금 색과 같은 색 카드가 없을 때만 낼 수 있어요." (와일드, 와일드 +4)
7. **도전** — "와일드 +4를 받은 사람은 도전할 수 있어요.", "낸 사람이 지금 색 카드를 갖고 있었다면 도전 성공: 낸 사람이 4장을 뽑아요.", "아니었다면 도전 실패: 도전한 사람이 6장을 뽑고 차례를 쉬어요."
8. **우노!** — "카드가 2장일 때 1장을 내기 전에 '우노!' 버튼을 눌러요.", "안 누르고 1장이 되면, 다음 사람이 행동하기 전에 다른 사람이 '우노 안 외쳤어요!'로 잡을 수 있어요. 잡히면 2장을 뽑아요."
9. **점수** — "이긴 사람은 다른 사람들이 남긴 카드 점수를 모두 얻어요.", "숫자 카드는 숫자만큼, 건너뛰기·방향 바꾸기·+2는 20점, 와일드는 50점이에요."
10. **시간** — "결정마다 15초가 있어요.", "시간이 지나면 대신 1장을 뽑고 넘기거나, 뽑은 카드를 갖고 넘기거나, 가장 많은 색을 고르거나, 도전 없이 4장을 받아요."

대기실 요약(`summary`): "같은 색·숫자·기호의 카드를 1장씩 내요.", "낼 카드가 없으면 1장을 뽑아요.", "2장일 때 '우노!'를 누르고 내요.", "손패를 먼저 비우면 이겨요."

### 6.12 상자 그림(`UnoBoxArt`)

- 선반·로비용 SVG: 둥근 상자 위에 네 색 카드(빨강 7, 노랑 건너뛰기, 초록 방향 바꾸기, 파랑 +2)를 부채꼴로 펼치고 맨 앞에 와일드. 아래 "우노" 글자(굵은 둥근 글꼴, 흰 글자에 남색 테두리). Mattel 로고·글자 모양을 쓰지 않는다.

### 6.13 접근성

- 카드 버튼 `aria-label`: `{카드 이름}`, 낼 수 있으면 `, 낼 수 있어요`, 흐린 카드는 `aria-disabled="true"`(내 차례일 때만).
- 손패 영역 `role="group"` `aria-label="내 카드 {N}장"`. 상대 자리 `aria-label="{닉네임}, 카드 {N}장{, 우노}"`.
- 현재 색은 색만이 아니라 글자("지금 색: 초록")와 카드 구석 모양으로도 알린다.
- 도전 결과·우노 잡힘·차례 시작은 `aria-live="polite"` 영역(TurnBar 최근 기록)에 들어간다.
- 색 고르기·도전 창은 기존 `Modal`(포커스 가둠, 첫 버튼 포커스). 도전 창은 Esc로 닫히지 않는다.

## 7. 테스트

### 7.1 백엔드 엔진 단위(`uno/`, 결정적 섞기 `StackedUnoShuffler` + 시작 사람 고정)

- 덱: 108장, 종류·색별 장수, id 0~107 순서(R1, R2), 점수(R3).
- 나눠 주기: seat 0부터 7장씩, 다음 장이 첫 카드(R6).
- 첫 카드 R7 여섯 경우 모두(2명·3명에서 REVERSE, 연속 +4 다시 뒤집기, WILD → CHOOSE_COLOR → 같은 사람 PLAY, DRAW_TWO 뽑기 장수).
- 매칭 R8: 색·숫자·기호 각각, 다른 색 같은 기호, 와일드 위 선언 색만, 숫자 6 vs 9 구분.
- 와일드 색 필수·잘못된 색(R10), 손에 없는 카드, 낼 수 없는 카드, 남의 차례, 단계 오류.
- +4: 합법(현재 색 없음, 같은 숫자·다른 와일드만 있음), 불법인데도 받아 줌(R11), 받기(R19), 도전 성공(R20: 낸 사람 4장, 받는 사람 같은 사람 PLAY, 색 유지), 도전 실패(R21: 6장, 건너뜀), 공개는 도전자 화면에만(R22).
- 뽑기 R12: 낼 수 있어도 뽑기, 뽑은 카드 낼 수 있음 → DRAWN, 다른 카드 내기 거절, 낼 수 없음 → 바로 넘김, KEEP.
- 다시 만들기 R14: 빈 더미에서 뽑기, +4 도중 소진, 다시 만들어도 모자람, 한 장도 없음 → `EMPTY_PILE`.
- 효과: SKIP, REVERSE(3명 방향, 2명 건너뛰기), DRAW_TWO, 방향 반대일 때 다음 사람.
- 우노: 2장일 때만 외침, 외치고 내면 선언, 안 외치면 잡기 창, 잡기 성공 2장, 늦은 잡기 거절(다음 차례 행동·자동 행동 뒤), 본인 잡기 거절, 대상 불일치 거절, 늦은 외치기(R27), 2명 SKIP 상황 창 닫힘, 뽑아서 선언 풀림, 다른 사람 CALL_UNO/CATCH_UNO는 창을 닫지 않음.
- 끝: 마지막 숫자/SKIP/REVERSE/WILD, 마지막 DRAW_TWO(다음 사람 2장 뽑고 점수 포함), 마지막 +4(도전 없이 4장, R30), 점수 합(R31), 결과 목록이 정확히 한 번(R32), 끝난 뒤 행동 `GAME_ALREADY_OVER`.
- 기권 R35~R39: 손패가 더미 아래로, 차례 중 기권, DRAWN 중 기권, CHOOSE_COLOR 중 기권, 받는 사람/낸 사람 기권(R37), 남은 1명 → `GameCompleted`만, 기권자 `LOSE`, `isPlaying` false.
- 자동 행동 R40: 네 단계 각각, 동점 색 우선순위, 색 카드 없음 → 빨강, 자동 뽑기가 낼 수 있어도 넘김, 자동 행동이 잡기 창을 닫음, `autoActSeq`·`lastAutoActorIds`.
- 마감(`UnoSessionTimerTest`, `MutableClock`): 단계·사람이 바뀌면 다시 15초, 외치기·잡기·남의 기권은 그대로, 2명 SKIP 후 같은 사람 다시 15초, 끝나면 비어 있음.
- 화면(`UnoViewTest`, `ObjectMapper.valueToTree`): `gameType = "UNO"`, 남의 손패·뽑을 더미·남의 `drawnCardId`·`wildDrawFourRisky`·`reveal`이 JSON에 없음, 관전자 `hand = null`, `playableCardIds`, 끝난 뒤 `result.players[].cards` 공개, 이벤트 `seq` 증가.

### 7.2 백엔드 통합

- `UnoStompFlowTest`(`StompGameFlowTest` 복제): 두 사람이 `gameType: "UNO"` 방을 만들고 준비·시작, 각자 7장·상대는 장수만, 차례 사람 `DRAW` 성공 → 두 사람 화면 갱신, 남의 차례 행동은 `/user/queue/errors`로 `NOT_YOUR_TURN`, 잘못된 색은 `UNO_INVALID_COLOR`, 관전자 화면에 손패 없음.
- 시간 초과: `FakeTaskScheduler`로 마감 실행 → 자동 뽑기·넘김·방송.
- 전적: 우노 게임 끝 → `game_match.game_type = 'UNO'`, 이긴 사람 `WIN` + 라운드 점수, 나머지 `LOSE` 0점, `member_game_stat` UNO 줄. 기권 끝 → 라운드 없음.
- 로비: `/api/games`가 2개(`[0] PAPER_SAFARI`, `[1] UNO`, 이름 "우노", 2~5). UNO 방 만들기·인원 범위 검사. `GameAction` 3인자 생성자 회귀(페이퍼 사파리 STOMP 흐름 그대로).
- 페이퍼 사파리 세션 화면 JSON에 `gameType: "PAPER_SAFARI"`가 붙었는지(칸 집합을 정확히 비교하는 테스트가 있으면 갱신).

### 7.3 프론트

- 등록부: `RoomPage`가 UNO 방이면 `UnoTable`, 페이퍼 사파리 방이면 `PaperSafariTable`. 화면 `gameType`과 방이 다르면 그리지 않음.
- `useRoomChannel`: UNO 화면이 오면 우노 해설 사용, 페이퍼 사파리 회귀 테스트 그대로.
- `describe.ts`: 6.7 표의 모든 문구, `seq` 중복 제거, 자동 행동 한 줄 대체, 처음 화면 무기록.
- `UnoCardFace`: 종류별 접근성 이름, 이모지 없음(`noEmoji.test.ts`).
- `UnoHand`: 정렬 순서, 낼 수 있는 카드 들림·흐림, 터치 두 번 눌러 내기·정밀 포인터 한 번, 키보드 Enter.
- `UnoTable`: 단계별 안내 문구(6.6), 행동 바 버튼, 색 고르기 창(취소·경고 문구·첫 카드 모드), 도전 창, 공개 창(한 번만, 5초 닫힘), 우노·잡기 버튼 표시 조건, 관전자 모드, 보내기 잠금.
- `UnoGameOverPanel`: 승/패 머리말, 점수, 표 정렬, 기권 끝 문구, 준비 칩·버튼.
- 공통 이동 회귀: `TurnBar`/`LogList`/`seats`/`RulesCarousel` 테스트가 새 위치에서 통과, `PaperSafariTable`·`GameOverPanel`·`WaitingRoom` 기존 테스트 통과.
- 선반·로비·전적: 우노 상자 그림·이름, 규칙 보기는 각 게임 규칙, 인원 선택 범위, 전적 게임 탭, "평균 획득 점수" 이름.
- 최종: 실제 브라우저로 두 계정(PC + 휴대폰 세로 360px, 휴대폰 가로)에서 한 판 끝까지(와일드 색, +4 도전 성공·실패, 우노 외침·잡기, 시간 초과, 기권, 다음 게임) 확인하고, 페이퍼 사파리 한 판도 다시 확인.

## 8. 범위 밖

- 500점 누적 여러 판 방식, 남은 카드 벌점 방식.
- 스태킹, 끼어들기(jump-in), 7-0 교환 등 하우스 룰과 방 옵션.
- 6~10명(자리 배치가 5명까지라서).
- 112장 확장 덱(특수 와일드).
- 컴퓨터 플레이어, 관전자의 손패 보기, 다시 보기.
- 카드 종류마다 다른 효과음(새 소리는 `uno` 하나).
- 페이퍼 사파리 세션 화면을 공통 감싸개(`{gameType, matchKey, game}`)로 바꾸는 일(칸 추가만 한다).

## 9. 구현 순서 제안

1. 공통 이동(5.1)과 등록부(5.2·5.3)를 페이퍼 사파리만으로 먼저 넣고 전체 테스트 통과(동작 변화 없음).
2. 백엔드 `GameAction`·`GameType.UNO`·오류 코드·엔진·세션·화면(+단위 테스트).
3. 백엔드 통합 테스트(STOMP·전적·로비).
4. 프론트 우노 타입·카드 그림·해설·테이블·결과 창·규칙·상자 그림(+테스트).
5. 실제 브라우저 확인.

## 10. 결정과 이유

| ID | 결정 | 이유 |
|---|---|---|
| D1 | 방당 2~5명 | 자리 배치(`seatRows`, `MemberList.SEAT_POSITIONS`, `SeatPicker`)가 5명까지 만들어져 있다. 공식은 10명까지지만 배치 작업 없이 지금 UX를 그대로 쓰는 쪽을 골랐다. |
| D2 | Mattel 공식 규칙(108장, 7장, 첫 카드 카드별 처리, 스태킹 없음, 도전, 우노 외치기) | 사용자가 "우노"를 요청했고, 하우스 룰은 사람마다 달라 기본은 공식이 가장 덜 놀랍다. 첫 카드는 "숫자 나올 때까지"(비공식 요약) 대신 공식 카드별 처리를 택했다. |
| D3 | 세션 화면에 `gameType` 구분자 추가(두 게임 모두, 칸 추가만) | 화면이 방 정보보다 먼저 도착할 수 있어서, 받은 화면만 보고 해설을 고를 수 있어야 오래된/다른 게임 화면으로 화면이 깨지지 않는다. 페이퍼 사파리 JSON은 칸이 늘기만 해 호환된다. |
| D4 | 한 게임 = 한 판 | 플랫폼의 짧은 세션 흐름(페이퍼 사파리도 한 판), 기존 "다음 게임" 준비 흐름을 그대로 쓴다. 500점 방식은 한 시간 넘게 걸릴 수 있다. |
| D5 | 시작 사람 무작위, 딜러 = 그 앞 사람 | 딜러 개념이 화면에 없다. 페이퍼 사파리도 무작위 시작. 첫 카드 REVERSE 처리를 공식 문구("딜러부터, 반대 방향")대로 하려면 딜러 정의가 필요해 "starter 앞 사람"으로 정했다. |
| D6 | 이긴 사람 `WIN`·라운드 점수 = 얻은 점수, 나머지 `LOSE`·0점, `tokens = 0` | 기록 표는 결과와 라운드 점수만 가진다. 진 사람에게 0을 넣으면 평균 = "게임당 평균 획득 점수"라는 한 가지 뜻이 되어 전적에 "평균 획득 점수"로 보여 줄 수 있다(페이퍼 사파리는 "평균 점수" 그대로). 순위는 승률만 보므로 영향 없음. |
| D7 | 와일드 색은 `PLAY` 행동에 함께 보낸다. `CHOOSE_COLOR` 단계는 첫 카드 WILD에만 | 카드를 낸 뒤 색이 없는 중간 상태가 사라져 단계·마감·잡기 창 경우의 수가 줄고, 색 고르기 창은 화면 안에서 끝난다. 첫 카드 WILD는 카드를 "내는" 행동이 없으므로 단계가 필요하다. 그 단계의 시간 초과 규칙은 지시대로(가장 많은 색). |
| D8 | 불법 +4도 서버가 받아 준다 | 서버가 막으면 도전은 늘 실패해 도전 규칙이 의미가 없어진다. 공식 규칙에서 +4 조건은 도전으로 지켜진다. 내 화면에서는 `wildDrawFourRisky` 경고 문구로 위험을 알려 실수를 줄인다. |
| D9 | 도전 성공 시 +4 카드·고른 색 유지, 낸 사람 4장, 도전자는 정상 차례 | 규칙서가 카드 반환을 말하지 않는다. 대부분 구현의 관례이고 상태를 되돌리지 않아 단순하다. 도전자가 차례를 이어서 하는 것은 조사 문서의 공식 해석이다. |
| D10 | 도전 공개는 도전자에게만, 서버가 그 사람 화면에만 `reveal`을 넣는다 | 공식은 "도전자에게 손패를 보여 준다". 서버가 사람마다 화면을 만들므로 숨은 정보를 지키면서 공식대로 할 수 있다. 결과 판정을 눈으로 확인할 수 있어 신뢰도 생긴다. 다음 상태 변화에서 지워 오래 남지 않는다. |
| D11 | 잡기 창 동안 본인 늦은 외치기 허용 | 공식 규칙이 "다른 사람이 잡기 전에 스스로 외치면 안전"을 허용한다. 온라인에서 버튼 하나 누르는 것이라 공정하다. |
| D12 | 마지막 +4는 도전 단계를 건너뜀 | 마지막 카드였다면 손에 다른 카드가 없었으므로 늘 합법이다. 반드시 지는 선택에 15초를 쓰게 할 이유가 없다. |
| D13 | +4 도전 대기 중 낸 사람이 기권하면 벌칙 없이 받는 사람 차례 | 상대가 사라진 판정을 이어 가면 경우의 수가 늘고 "나간 사람 대신 누가 뽑나"가 모호하다. 받는 사람에게 불리하지 않은 쪽을 골랐다. 받는 사람이 기권하면 효과만 사라진다. |
| D14 | 우노 타이머·자동 행동 부품은 우노 패키지에 따로 만든다 | 페이퍼 사파리의 `TurnCountdown`은 되돌리기 예외 규칙과 묶여 있다. 옮기면 회귀 위험이 생기고, 우노는 "단계가 바뀌면 다시 잰다" 하나라 작게 따로 두는 편이 안전하다. |
| D15 | 마감은 모든 단계 15초, 단계가 바뀌면 다시 잼(`DRAWN`도 새 15초) | 지시대로 결정마다 15초. 뽑기 후 결정도 별개 결정이라 새로 잰다. 한 차례 최대 30초로 제한된다. |
| D16 | 시간 초과 `PLAY`는 뽑기만 하고 낼 수 있어도 넘김 | 예측하기 쉽고(사람이 다시 와서 놀랄 일이 없다), 자동 행동이 대신 전략을 고르지 않는다. 늘 진행하므로 재시도 고리가 없다. |
| D17 | 기권자 손패는 섞어서 뽑을 더미 맨 아래 | 카드가 사라지지 않아 108장 불변이 유지되고(테스트하기 쉬움), 맨 아래라 바로 다시 나오지 않는다. |
| D18 | 행동마다 이벤트 목록(`events`, 전역 `seq`)을 화면에 싣는다 | 손패 장수 차이만으로는 "+2로 뽑음"과 "직접 뽑음", 도전 결과를 구분할 수 없다. 이벤트로 기록 문구·애니메이션·효과음을 정확히 만들고, `seq`로 동기화 중복을 거른다. 뽑은 카드 얼굴은 넣지 않아 숨은 정보가 새지 않는다. |
| D19 | 낼 수 있는 카드 목록(`playableCardIds`)을 서버가 계산 | 규칙을 프론트에 두 번 구현하지 않아 어긋날 일이 없다. 프론트는 표시만 한다. |
| D20 | 터치는 두 번 눌러 내기, 정밀 포인터는 한 번 | 휴대폰에서 겹친 카드를 스크롤하다 잘못 내는 일을 막는다. PC는 빠른 조작이 더 중요하다. |
| D21 | 카드 그림은 똑바로 선 타원·자체 뒷면·색맹 보조 모양 | 지시의 "가운데 타원"은 지키되 Mattel의 기운 타원·검은 뒷면 로고 같은 상표 디자인과 구분한다. 색만으로 정보를 주지 않도록 구석 모양과 색 이름 글자를 더했다. |
| D22 | 카드 색은 테마와 상관없이 고정, 뒷면만 테마 변수 | 색은 규칙 정보라 테마마다 바뀌면 헷갈린다. 뒷면과 테이블은 테마를 따라 "테마가 똑같이 동작"한다. |
| D23 | 새 효과음은 `uno` 하나 | 지금 소리 체계를 그대로 쓰고, 우노 외침·잡힘처럼 모두가 알아야 하는 순간만 새 소리를 준다. |
| D24 | 공통 부품을 `F/table/`로 옮기고 등록부를 먼저 페이퍼 사파리로만 넣는다 | 우노 모듈이 페이퍼 사파리 폴더에 기대지 않게 하고, 이동이 동작을 바꾸지 않음을 기존 테스트로 먼저 확인한 뒤 우노를 얹는다. |
| D25 | 잡기 경쟁에서 진 `UNO_CATCH_CLOSED`는 토스트 없이 조용히 | 여러 명이 동시에 누르는 것이 흔한 정상 상황이라 오류처럼 보이면 안 된다. |
| D26 | 결과 창 닫음 기억 키 = 방 코드 + `startedAt` | 서버가 경기 id를 화면에 주지 않는다. 시작 시각은 게임마다 다르고 화면에 넣기 쉽다. |
| D27 | 끝난 뒤에는 모든 남은 손패를 공개 | 점수 계산 근거를 보여 주는 공식 관행이고, 끝난 뒤에는 숨길 정보가 아니다. |
