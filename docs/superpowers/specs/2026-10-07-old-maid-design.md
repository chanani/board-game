# 도둑잡기(Old Maid, 조커 1장) 게임 추가 설계

- 작성일: 2026-10-07
- 기반: feature/old-maid 3f434e0
- 참고: `docs/superpowers/research/game-integration.md`(게임이 플랫폼에 붙는 구조), `docs/superpowers/specs/2026-10-07-uno-design.md`(우노 설계, 구조·번호 체계의 본보기)
- 사용자 승인 설계(바꿀 수 없음): 게임 종류 `OLD_MAID`, 이름 "도둑잡기", 2~6명, 한 게임 = 한 판, 52장 + 조커 1장, 같은 랭크 두 장이 짝, 나눠 줄 때 짝 자동 버림, 시계 방향 다음 사람(카드를 가진 사람)에게서 뒷면 카드를 자리 번호로 1장 뽑음, 15초 결정 시간(시간 초과면 서버가 무작위로 뽑음), 고르는 카드 들어 올림 신호(초당 10번 이하, 중복 무시), 내 손패 섞기(내 뽑기 차례가 아닐 때, 약 1초 쿨다운), 조커 위치 힌트 없음, 기권 시 손패를 다음 사람에게 넘김, 1등만 승리로 기록. 승인 설계가 열어 둔 세부는 이 문서에서 정했고, 결정과 이유는 11장(`D#`)에 모았다.

## 0. 공통 원칙

- 화면에 이모지 금지. 아이콘·카드 무늬·도둑 가면은 모두 인라인 SVG(`currentColor`, 장식은 `aria-hidden`). `F/noEmoji.test.ts`가 지킨다.
- 화면 문구는 한국어, 기존 말투("~해요", "~하세요").
- 휴대폰 세로(360px부터)·휴대폰 가로(눕힌 화면)·PC 세 배치(`useTableLayout`: `portrait | landscape | pc`). PC 1280×860에서 스크롤 없이 한 화면에 들어간다.
- 동작 줄이기(`MotionConfig reducedMotion="user"`)면 새 애니메이션은 색·투명도 변화만 남긴다.
- 백엔드 Java는 `/Users/ichanhan/CLAUDE.md` 객체지향 생활 체조(들여쓰기 1단계, else 금지, 원시값 VO, 일급 컬렉션, 도메인에 로직, 필드 3개 이하)와 `BusinessException` + 통일 오류 응답(`{status, code, message}`)을 지킨다. 화면으로 나가는 record(`view/*`, `OldMaidEvent`)는 `UnoView`처럼 필드 수 제한의 예외다.
- 페이퍼 사파리·우노 동작은 바꾸지 않는다. 공통 부품으로 옮기거나 일반화할 때 기존 테스트가 그대로 통과해야 한다.
- 표기: 백엔드 루트 `B/` = `backend/src/main/java/com/boardgame/`, 프론트 루트 `F/` = `frontend/src/`.

## 1. 개요와 목표

- 플랫폼에 세 번째 게임 "도둑잡기"를 더한다. 게임 선반·로비·방·대기실·준비·채팅·관전·테마(5가지)·프로필 그림·효과음·알림·차례 타이머·자동 기권·기권 알림·전적·순위·전적 창이 우노와 똑같이 동작한다.
- 한 게임 = 한 판. 방당 2~6명(이 게임에서 처음 6명 자리를 연다, D1).
- 손패를 비운 순서로 1등, 2등…이 정해지고, 마지막까지 조커를 쥔 사람이 "도둑"(꼴찌)이다.
- 숨은 정보는 서버가 지킨다: 각자 자기 카드만 보고, 남의 손패는 장수와 자리 번호만 받는다. 버린 짝은 앞면으로 모두에게 공개한다.
- 조커가 누구에게 있는지 서버는 어떤 화면에도 알리지 않는다. 조커는 그 주인의 손패에만 보인다.
- 카드 그림(앞면 52장, 조커, 뒷면)은 우리가 직접 그린 SVG다. 상표가 있는 조커·코트 카드 그림을 베끼지 않는다.

## 2. 규칙(구현 기준)

규칙 번호 `R#`은 테스트 이름과 코드 주석에서 그대로 쓴다.

### 2.1 카드와 덱

- **R1 덱**: 53장 = 무늬 4가지(`SPADES` 스페이드, `HEARTS` 하트, `DIAMONDS` 다이아몬드, `CLUBS` 클로버) × 랭크 13가지(`ACE`, `TWO`…`TEN`, `JACK`, `QUEEN`, `KING`) + 조커(`JOKER`) 1장.
- **R2 카드 번호**: 카드마다 게임 내내 바뀌지 않는 `id`(0~52). `id = 무늬 순서 × 13 + 랭크 순서`(무늬 순서 SPADES 0, HEARTS 1, DIAMONDS 2, CLUBS 3, 랭크 순서 ACE 0 … KING 12). 조커는 52. 예: 스페이드 A = 0, 하트 10 = 22, 클로버 K = 51.
- **R3 짝**: 랭크가 같은 두 장은 무늬·색과 상관없이 짝이다. 조커는 짝이 없다.

### 2.2 준비

- **R4 자리 순서**: 참가자 순서는 방의 `memberIds` 순서(= 자리 0..n-1). 시계 방향 = 자리 +1. 화면의 `seatOrder`가 내 다음 사람을 왼쪽에 앉히므로, 내가 뽑는 상대는 늘 내 왼쪽 자리다(우노 R4와 같다).
- **R5 나눠 주기**: 덱을 섞고, 무작위로 고른 첫 사람(`first`)부터 시계 방향으로 한 장씩 53장을 모두 나눈다. 첫 사람부터 몇 명이 한 장씩 더 받는다.
- **R6 처음 짝 버리기**: 나눈 직후 서버가 사람마다 짝을 모두 버린다. 손패 순서로 앞에서부터 같은 랭크 두 장씩 짝 짓는다. 3장이면 앞의 두 장을 버리고 세 번째를 남기고, 4장이면 두 짝을 모두 버린다. 버린 카드는 앞면으로 버린 더미에 간다.
- **R7 다시 나누기**: 짝을 버린 뒤 카드를 가진 사람이 2명보다 적으면(2명 게임에서 드물게 생긴다) 새로 섞어 R5부터 다시 한다. 화면에는 마지막 나눔만 보인다. (D4)
- **R8 처음부터 빈 손**: 짝을 버리고 손패가 0장인 사람은 곧바로 끝낸 사람이 된다. 여럿이면 첫 사람부터 시계 방향 순서로 1등, 2등…을 받는다.
- **R9 첫 차례**: 첫 사람이 카드를 갖고 있으면 그 사람이, 아니면 첫 사람 다음으로 카드를 가진 사람이 처음 뽑는 사람(`drawer`)이다.
- **R10 손패 크기 상한**: 짝을 모두 버린 손패는 랭크마다 많아야 1장이므로 어느 때든 손패는 최대 14장(13 + 조커)이다. 배치는 이 상한에 맞춘다.

### 2.3 차례

- **R11 뽑을 상대**: 뽑는 사람의 상대(`target`)는 뽑는 사람 다음 자리부터 시계 방향으로 돌아 처음 만나는, 카드를 가진 사람이다(끝낸 사람·기권한 사람은 건너뛴다).
- **R12 뽑기**: 뽑는 사람은 상대 손패의 자리 번호(`index`, 0부터, 상대 손패의 서버 순서)를 골라 그 카드 1장을 가져온다. 범위 밖이면 `OLD_MAID_INVALID_SLOT`.
- **R13 짝 맞추기**: 가져온 카드와 같은 랭크 카드가 손에 있으면 그 두 장을 곧바로 버린다(앞면 공개). 없으면 가져온 카드를 내 손패의 무작위 자리에 끼운다. (D6)
- **R14 끝내기**: 손패가 0장이 된 사람은 끝낸 순서대로 다음 등수를 받는다. 한 번의 뽑기로 두 사람이 함께 비면 **카드를 뺏긴 상대가 먼저**, 뽑은 사람이 그다음이다. (D5)
- **R15 차례 넘김**: 다음 뽑는 사람은 방금 뽑은 사람 다음 자리부터 시계 방향으로 처음 만나는, 카드를 가진 사람이다(보통은 방금 카드를 뺏긴 상대). 그 사람의 상대는 R11로 다시 정한다.
- **R16 게임 끝**: 카드를 가진 사람이 1명만 남으면 끝난다. 53장은 홀수이고 짝은 2장씩 빠지므로 남은 카드는 늘 홀수이고 1명 이상이 카드를 쥐고 있다. 마지막 한 사람은 반드시 조커를 쥐고 있고, 그 사람이 도둑이다.

### 2.4 고르는 카드 신호(들어 올림)

- **R17 신호**: 뽑는 사람이 지금 가리키거나(마우스 올림) 고른(터치 첫 탭) 상대 카드의 자리 번호를 서버에 보낸다(`PEEK`, 행동이 아니라 가벼운 신호, 4.3). 자리 없음(`index = null`)은 "가리키지 않음"이다.
- **R18 받아 주는 조건**: 게임 중이고, 보낸 사람이 지금 뽑는 사람이고, 자리 번호가 상대 손패 범위 안이거나 `null`일 때만 받는다. 그 밖(남의 차례, 범위 밖, 음수, 끝난 게임, 참가자 아님)은 오류 없이 조용히 버린다.
- **R19 중복·속도**: 지금 값과 같은 자리면 버린다. 마지막으로 받아 준 신호에서 50ms가 지나지 않았으면 버린다(서버 상한 초당 20번, 화면은 초당 10번 이하로 보낸다).
- **R20 방송**: 받아 준 신호는 방의 모두(참가자·관전자)에게 작은 메시지로 보낸다. 모두가 그 자리 카드를 살짝 들어 올려 본다. 상대(카드 주인)는 앞면으로 보이는 자기 손패에서 그 카드가 들린 것을 본다.
- **R21 지우기**: 차례가 바뀌거나(상대가 바뀌는 것 포함) 누군가 기권하면(손패 장수가 바뀔 수 있다) 서버가 신호를 지운다(`index = null`, 순번 +1). 섞기는 신호를 지우지 않는다(같은 자리를 계속 가리킨다).

### 2.5 손패 섞기

- **R22 섞기 조건**: 카드를 가진 참가자는 자기가 뽑는 사람이 아닐 때 언제든 손패 순서를 섞을 수 있다(`SHUFFLE`). 지금 내가 뽑을 차례면 `OLD_MAID_SHUFFLE_NOT_ALLOWED`, 손패를 이미 비웠으면(끝낸 사람) 같은 오류.
- **R23 쿨다운**: 같은 사람이 마지막으로 섞은 지 1초가 안 되었으면 `OLD_MAID_SHUFFLE_TOO_FAST`(429). 화면은 버튼을 1초 잠그고 이 오류는 알림 없이 조용히 넘긴다.
- **R24 섞기 공개**: 서버가 그 사람 손패를 무작위로 다시 늘어놓는다. 다른 사람에게는 "누가 섞었다"(`SHUFFLE` 이벤트)만 간다. 화면은 그 사람의 뒷면 부채가 섞이는 애니메이션만 보여 준다. 마감·고르는 카드 신호는 그대로다.

### 2.6 기권(게임 중 나가기)·자동 기권

- **R25 손패 넘기기**: 카드를 가진 사람이 나가거나(기권) 연결이 60초 끊겨 자동 기권되면, 그 손패를 그 사람 다음 자리부터 시계 방향으로 처음 만나는 카드를 가진 사람(받는 사람)에게 모두 넘긴다. 받는 사람은 짝을 자동으로 버리고(R6과 같은 방식), 서버가 받는 사람 손패를 섞는다. (D7)
- **R26 받은 사람이 비면**: 받는 사람의 손패가 짝을 버린 뒤 0장이 되면 그 사람이 다음 등수로 끝낸다.
- **R27 차례 다시 정하기**: 기권 뒤 지금 뽑는 사람이 아직 카드를 갖고 있으면 그 사람이 계속 뽑고 상대만 R11로 다시 정한다. 상대가 그대로면 마감은 그대로, 바뀌면 15초를 새로 잰다. 뽑는 사람이 기권했거나 카드가 없어졌으면 R15처럼 그 자리 다음 사람에게 차례를 넘긴다.
- **R28 이미 끝낸 사람**: 손패를 비워 등수를 받은 사람은 더 이상 "게임 중"이 아니다(`isPlaying = false`). 나가도 기권이 아니고 받은 등수를 그대로 지닌다. 연결이 끊겨도 자동 기권하지 않는다. (D8)
- **R29 기권으로 끝남**: 기권 처리 뒤 카드를 가진 사람이 1명만 남으면 게임이 끝난다(끝난 이유 `FORFEIT`). 남은 그 사람은 보통 규칙대로 기권하지 않은 사람 가운데 꼴찌 등수를 받는다. 다른 모두가 기권해 그 사람이 1등이 되면 도둑이 아니라 "남은 승자"(`LAST_STANDING`)다. (D9)

### 2.7 등수와 기록

- **R30 등수**: 1등부터 손패를 비운 순서 → 마지막까지 카드를 쥔 사람(도둑) → 기권한 사람들(늦게 나간 사람이 위, 가장 먼저 나간 사람이 맨 아래). 등수는 1..n이 하나씩이다.
- **R31 자리 구분(`placement`)**: `FINISHED`(손패를 비움), `THIEF`(마지막까지 조커를 쥠, 등수 2 이상), `LAST_STANDING`(모두 기권해 혼자 남은 1등), `FORFEITED`(기권).
- **R32 기록**: 1등만 `WIN`, 나머지는 모두 `LOSE`. 무승부 없음. 끝날 때마다(기권으로 끝나도) `RoundCompleted(1, entries)`와 `GameCompleted(entries)`를 낸다. 라운드 `score = 등수`, 경기 `tokens = 등수`(자리 기록용 칸을 등수로 쓴다), `seat` = 처음 `memberIds` 순서. 참가자 모두(기권자 포함)가 들어간다. (D10)
- **R33 다음 게임**: 끝나면 방은 대기 상태로 돌아가고 기존 "다음 게임 준비" 흐름으로 새 게임을 연다. 새 게임은 새 덱·새 무작위 첫 사람.

### 2.8 시간 초과(15초)

- **R34**: 뽑기 결정마다 15초. 뽑는 사람이 바뀌거나 상대가 바뀌면 15초를 다시 잰다. 신호·섞기·남의 기권(상대가 그대로일 때)은 마감을 바꾸지 않는다.
- **R35 자동 뽑기**: 시간이 지나면 서버가 뽑는 사람 대신 상대 손패에서 무작위 자리(`Random.nextInt(장수)`) 1장을 뽑는다. 그 뒤는 R13~R16과 같다. 이벤트에 `auto: true`.

## 3. 상태 기계

- 게임 상태 `status`: `IN_PROGRESS` | `GAME_OVER`.
- 게임 중에는 늘 차례(`Turn`) = 뽑는 사람(`drawer`) + 상대(`target`) + 차례 순번(`turnSeq`, 차례가 새로 시작할 때마다 +1).

```
시작 ─ 나눔(R5) ─ 짝 버림(R6) ─ 2명 미만이면 다시 나눔(R7)
     ─ 빈 손 등수(R8) ─ 첫 차례(R9): DRAW(drawer, target)

DRAW(d, t)
 ├─ DRAW index (d만) → t에서 1장 → 짝이면 버림 → t 비면 끝냄 → d 비면 끝냄
 │     ├─ 카드 가진 사람 1명 → GAME_OVER(NORMAL)
 │     └─ 아니면 → DRAW(d 다음 카드 가진 사람, 그 다음 카드 가진 사람)  [turnSeq+1]
 ├─ PEEK index (d만, 신호) → 상태 그대로, 신호 순번만 +1
 ├─ SHUFFLE (d 아닌 카드 가진 사람) → 그 사람 손패 순서만 바뀜
 ├─ 기권 x → x 손패를 다음 카드 가진 사람에게 → 짝 버림 → 섞음
 │     ├─ 카드 가진 사람 1명 → GAME_OVER(FORFEIT)
 │     ├─ d가 카드를 갖고 있음 → DRAW(d, 새 상대)  [상대가 바뀔 때만 turnSeq+1]
 │     └─ 아니면 → DRAW(d 다음 카드 가진 사람, …)  [turnSeq+1]
 └─ 시간 초과 → 무작위 index로 DRAW(위와 같음)
```

- 마감은 `turnSeq`가 바뀔 때만 다시 잰다(우노의 `stageSeq`와 같은 계약). 게임이 끝나면 `deadline()`은 비어 있다.

## 4. 백엔드 설계

### 4.1 게임 종류

- `GameType`에 `OLD_MAID("도둑잡기", 2, 6)`를 `UNO` **뒤에** 추가한다. `game_type` 칸은 `VARCHAR(30)`이라 DB 변경 없음.
- 방 정원 검사(`Capacity.of`)는 이미 게임별 범위를 본다. `INVALID_CAPACITY` 문구가 "2~5명"으로 굳어 있어 "이 게임에서 고를 수 없는 최대 인원이에요."로 바꾼다.

### 4.2 `GameAction` 넓히기

```java
public record GameAction(String type, Integer column, Integer row, Integer cardId, String color, Long targetId, Integer index) {
    public GameAction(String type, Integer column, Integer row) { this(type, column, row, null, null, null, null); }
    public GameAction(String type, Integer column, Integer row, Integer cardId, String color, Long targetId) { this(type, column, row, cardId, color, targetId, null); }
}
```

| 경로 | type | 필드 | 설명 |
|---|---|---|---|
| `/app/rooms/{code}/actions` | `DRAW` | `index`(필수) | 상대 손패 `index`번 카드 뽑기 |
| `/app/rooms/{code}/actions` | `SHUFFLE` | - | 내 손패 섞기 |
| `/app/rooms/{code}/signals` | `PEEK` | `index`(없으면 `null` = 가리키지 않음) | 고르는 카드 신호 |

- 모르는 type, `DRAW`의 `index` 없음은 `INVALID_INPUT`. `DRAW`의 음수 `index`는 `OLD_MAID_INVALID_SLOT`.

### 4.3 가벼운 신호 이음매(새 공통 경로, D3)

- `GameSession`에 기본 메서드 `Optional<Object> signal(long memberId, GameAction action)`을 더한다. 기본 구현은 `INVALID_INPUT`을 던진다(페이퍼 사파리·우노는 그대로).
- `RoomGame.signal`, `Room.signal`(게임 중이 아니거나 참가자가 아니면 빈 값), `RoomService.signal(code, memberId, action)`: 받은 값이 있으면 방의 모든 사람(`occupantIds`)에게 `RoomNotifier.gameSignal(memberId, payload)`로 보낸다. 방 정보·화면 방송, 타이머 다시 걸기, 기록은 하지 않는다.
- `StompRoomNotifier.gameSignal` → `/user/queue/signal`. `GameMessageController`에 `@MessageMapping("/rooms/{code}/signals")`.
- 기존 STOMP 가드: `/app/...` 보내기와 `/user/queue/...` 구독은 이미 허용된다. 바꿀 것 없음.
- 신호 메시지(`OldMaidPeekSignal`):

```json
{ "gameType": "OLD_MAID", "type": "PEEK", "startedAt": 1791400000000, "turnSeq": 4, "drawerId": 7, "targetId": 12, "index": 3, "seq": 18 }
```

### 4.4 공통 차례 부품(`com.boardgame.game.turn`, D11)

- `StageCountdown<K>`: 키(`K`)가 바뀔 때만 다시 재는 마감. 생성자 `(Clock, Duration limit, K start)`, `follow(K)`, `deadline()`, `timing(boolean waiting)`, `now()`.
- `StageTiming(Long deadline, long serverNow)`.
- `AutoActorLog`: 마지막 자동 행동 대상 회원 id와 자동 행동 순번(`replaceWith(List<Long>)`, `clear()`, `ids()`, `sequence()`).
- 우노의 `UnoCountdown`·`UnoTiming`·`UnoAutoActors`를 이 셋으로 바꾸고 지운다(`UnoTimer`, `UnoViewContext`만 고친다, 우노 테스트는 그대로 통과).

### 4.5 패키지 `com.boardgame.oldmaid`

| 클래스 | 책임 |
|---|---|
| `Suit`, `Rank`(enum, `Rank.JOKER`, `Rank.STANDARD`) | 무늬·랭크 |
| `CardId`(VO 0~52), `PlayingCard`(record: id·suit·rank, `of`, `joker`, `pairsWith`) | 카드(R1~R3) |
| `StandardOldMaidDeck` | R2 순서 53장 |
| `PlayerId`, `SlotIndex`(VO, 음수면 `OLD_MAID_INVALID_SLOT`), `FinishRank`(VO ≥ 1), `TurnSeq` | 원시값 VO |
| `OldMaidShuffler`/`RandomOldMaidShuffler`, `SlotPicker`, `OldMaidDice` | 섞기·무작위 자리 고르기(첫 사람, 끼울 자리). 테스트는 고정 |
| `CardPair`, `Hand`(일급 컬렉션: 짝 버리기·자리로 꺼내기·받아서 짝 짓거나 끼우기·섞기), `Hands`(`PlayerId → Hand`, 나눠 주기) | 손패 |
| `Deal` | 나눈 직후(첫 사람, 손패, 사람마다 버린 짝), `isPlayable()` |
| `DiscardPile` | 버린 짝(공개), 최근 n쌍 |
| `Seats` | 자리 순서, `inOrderFrom`, `nextAfter(from, 조건)` |
| `Standings` | 끝낸 순서·기권 순서, 최종 `Ranking` 만들기(R30·R31) |
| `Placement`, `RankedPlayer`, `Ranking` | 최종 등수 |
| `Turn`, `PeekState`(신호: 자리·순번·마지막 시각), `ShuffleCooldowns`, `TurnState` | 차례·신호·섞기 쿨다운 |
| `OldMaidTable`(Hands·DiscardPile·Dice), `OldMaidPlayers`(Seats·Standings) | 묶음 |
| `OldMaidRound` | 한 판 애그리거트: `begin`, `draw`, `autoDraw`, `shuffle`, `peek`, `forfeit`, 질의 |
| `OldMaidRoundFactory` | 섞기·나눔·다시 나눔(R5~R9) |
| `OldMaidEventType`, `OldMaidEndReason`, `OldMaidEvent`, `EventBatch`, `OldMaidEvents` | 이벤트(전역 seq) |
| `OldMaidResult` | 끝난 이유 + `Ranking` |
| `OldMaidGame` | 게임: 행동 검사 순서, 끝 판정(R16·R29) |
| `OldMaidCommand`(enum `DRAW`, `SHUFFLE`), `OldMaidSignal`(enum `PEEK`) | type → 게임 메서드 |
| `OldMaidMatch`, `OldMaidTimer`, `OldMaidViewContext`, `OldMaidViewAssembler` | 처음 참가자·마감·화면 조립 |
| `OldMaidSession implements GameSession`, `OldMaidSessionFactory`(`@Component`), `OldMaidConfig` | 세션·등록 |
| `view/*` | 4.7의 JSON record |

- 검사 순서: 게임 끝남(`GAME_ALREADY_OVER`) → 참가자 아님·기권함(`NOT_A_PLAYER`) → `DRAW`: 차례 아님(`NOT_YOUR_TURN`) → 자리(`OLD_MAID_INVALID_SLOT`); `SHUFFLE`: 끝냈거나 내 차례(`OLD_MAID_SHUFFLE_NOT_ALLOWED`) → 쿨다운(`OLD_MAID_SHUFFLE_TOO_FAST`).

### 4.6 `OldMaidSession` 계약

- `act`: `OldMaidCommand` 실행 → `timer.humanActed(turnSeq)` → 끝났으면 결과.
- `signal`: `OldMaidSignal.PEEK` → 받아 주면 `OldMaidPeekSignal`, 아니면 빈 값.
- `autoAct(random)`: R35, `timer.autoActed(drawer, turnSeq)`.
- `forfeit`: R25~R29, `timer.follow(turnSeq)`.
- `deadline()`: 게임 중이면 마감, 끝나면 빈 값. `isPlaying(id)`: 게임 중이고 카드를 가진 사람만 true. `roundNumber()` = 1.
- 결과(끝나는 행동에서 딱 한 번): `[RoundCompleted(1, 등수 순 RoundEntry), GameCompleted(자리 순 MatchEntry)]`(R32).
- `viewFor(id)`: `new OldMaidSessionView(view)`. 참가자가 아니어도(관전자) 공개 화면.

### 4.7 화면 JSON(사람마다 다름)

`{"gameType":"OLD_MAID","game":{...}}`. `OldMaidView`(`game`):

```json
{
  "viewerId": 7,
  "status": "IN_PROGRESS",
  "startedAt": 1791400000000,
  "currentPlayerId": 7,
  "targetId": 12,
  "turnSeq": 4,
  "participantIds": [7, 12, 15],
  "players": [
    { "playerId": 7, "cardCount": 5, "rank": null, "forfeited": false },
    { "playerId": 12, "cardCount": 4, "rank": null, "forfeited": false },
    { "playerId": 15, "cardCount": 0, "rank": 1, "forfeited": false }
  ],
  "hand": [ { "id": 0, "suit": "SPADES", "rank": "ACE" }, { "id": 52, "suit": null, "rank": "JOKER" } ],
  "peek": { "index": 3, "seq": 18 },
  "canShuffle": false,
  "discardCount": 40,
  "recentPairs": [ [ { "id": 9, "suit": "SPADES", "rank": "TEN" }, { "id": 35, "suit": "DIAMONDS", "rank": "TEN" } ] ],
  "result": null,
  "winnerId": null,
  "deadline": 1791400015000,
  "serverNow": 1791400003120,
  "lastAutoActorIds": [],
  "autoActSeq": 0,
  "events": [ { "seq": 31, "type": "DRAW", "actorId": 15, "targetId": 7, "cards": [], "count": 1, "reason": null, "auto": false } ]
}
```

| 칸 | 값 |
|---|---|
| `currentPlayerId`, `targetId` | 지금 뽑는 사람과 그 상대. 끝나면 `null` |
| `turnSeq` | 차례 순번. 신호를 이 차례 것인지 가릴 때 쓴다 |
| `players` | 처음 참가자 전체(자리 순서). 장수, 등수(끝냈으면, 게임이 끝나면 모두), 기권 여부. 조커 여부는 없다 |
| `hand` | 보는 사람이 기권하지 않은 참가자면 자기 손패(서버 순서 = 남이 고르는 순서, 끝냈으면 `[]`), 아니면 `null` |
| `peek` | 게임 중이면 `{ index: int \| null, seq }`, 끝나면 `null` |
| `canShuffle` | 보는 사람이 지금 섞을 수 있는지(R22, 쿨다운은 넣지 않는다) |
| `discardCount`, `recentPairs` | 버린 카드 장수와 최근 6쌍(오래된 것부터) |
| `result` | 끝났을 때만: `{ "reason": "NORMAL" \| "FORFEIT", "ranking": [ { "playerId", "rank", "placement" } ], "thiefId": 12 \| null }` |
| `winnerId` | 끝났을 때 1등 |
| `deadline`, `serverNow`, `lastAutoActorIds`, `autoActSeq` | 우노와 같은 계약 |
| `events` | 마지막 상태 변화의 이벤트(모두에게 같음), `seq`는 게임 안에서 계속 오른다 |

- `CardView`: `{ id, suit: "SPADES"|"HEARTS"|"DIAMONDS"|"CLUBS"|null, rank: "ACE".."KING"|"JOKER" }`.
- `OldMaidEventView`: `{ seq, type, actorId, targetId, cards, count, reason, auto }`.

| type | 뜻 | 쓰는 칸 |
|---|---|---|
| `START` | 시작 | `actorId`(처음 뽑는 사람), `targetId`(그 상대) |
| `DEAL_PAIRS` | 나눈 직후 버린 짝 | `actorId`, `cards`(버린 카드), `count`(짝 수) |
| `DRAW` | 1장 뽑음 | `actorId`(뽑은 사람), `targetId`(뺏긴 사람), `count` = 1 |
| `PAIR` | 짝을 버림 | `actorId`, `cards`(2장) |
| `FINISH` | 손패를 비워 등수를 받음 | `actorId`, `count`(등수) |
| `SHUFFLE` | 손패를 섞음 | `actorId` |
| `FORFEIT` | 기권, 손패를 넘김 | `actorId`(나간 사람), `targetId`(받는 사람), `count`(넘긴 장수) |
| `GAME_END` | 끝 | `actorId`(마지막까지 카드를 쥔 사람), `count`(그 등수), `reason`(`NORMAL`/`FORFEIT`) |

- 숨은 정보 점검: 뽑은 카드 얼굴은 `DRAW`에 넣지 않는다(짝이 되면 `PAIR`로 공개되는 것은 실제 놀이와 같다). 남의 `hand`, 덱 순서, 끼운 자리, 조커 주인은 어떤 화면·이벤트·신호에도 없다. 게임이 끝나면 도둑(`thiefId`)만 알린다.

### 4.8 시간 초과·자동 기권 연결

- `RoomService.rearm`·`TurnTimer`·`DisconnectForfeitScheduler`는 바꾸지 않는다. 세션이 `deadline()`을 늘 채우고 `autoAct`가 늘 진행하므로 그대로 올라탄다.
- 나갔다 다시 들어온 사람에게 끝난 게임 결과를 보내지 않는 `RoomGame` `Departures` 규칙은 공통이라 그대로 적용된다(통합 테스트로 확인).

### 4.9 오류 코드(새로 추가)

| 코드 | 상태 | 메시지 |
|---|---|---|
| `OLD_MAID_INVALID_PLAYER_COUNT` | 400 | 도둑잡기는 2~6명이 플레이할 수 있습니다. |
| `OLD_MAID_INVALID_SLOT` | 400 | 고를 수 없는 카드 자리예요. |
| `OLD_MAID_SHUFFLE_NOT_ALLOWED` | 409 | 지금은 손패를 섞을 수 없어요. |
| `OLD_MAID_SHUFFLE_TOO_FAST` | 429 | 조금 뒤에 다시 섞을 수 있어요. |

- 바꾸는 코드: `INVALID_CAPACITY` 문구 → "이 게임에서 고를 수 없는 최대 인원이에요."
- 그대로 쓰는 코드: `INVALID_INPUT`, `NOT_A_PLAYER`, `NOT_YOUR_TURN`, `GAME_ALREADY_OVER`, `GAME_NOT_STARTED`.
- 화면: `OLD_MAID_SHUFFLE_TOO_FAST`는 `QUIET_ERROR_CODES`에 넣어 알림 없이 넘긴다.

## 5. 프론트엔드: 공통 이음매

| 파일 | 바꿀 점 |
|---|---|
| `api/types.ts` | `GameType`에 `'OLD_MAID'`. `GameAction`에 `index?: number \| null`, type에 `'SHUFFLE' \| 'PEEK'`. 도둑잡기 타입(6.1). `SessionView`에 `OldMaidSessionView`. `GameSignal = OldMaidPeekSignal` |
| `room/useRoomChannel.ts` | `/user/queue/signal` 구독 → `signal` 상태, `sendSignal(action)`(`/app/rooms/{code}/signals`, 끊겨 있으면 조용히 버림). `QUIET_ERROR_CODES`에 `OLD_MAID_SHUFFLE_TOO_FAST` |
| `games/gameModule.ts` | `TableProps`에 `signal?: GameSignal \| null`, `sendSignal?: (action) => void`. `GameModule`에 `roundScoreText?: (score: number) => string` |
| `pages/RoomPage.tsx` | `signal`, `sendSignal`를 테이블에 넘긴다 |
| `records/RecentMatches.tsx` | 라운드 점수 글자를 `findGame(match.gameType)?.roundScoreText ?? (score => `${score}점`)`로 |
| `table/seats.ts` | 상대 5명 배치 `['left','top-left','top','top-right','right']` |
| `room/MemberList.tsx` | `SEAT_POSITIONS[6]`(대기실 6자리) |
| `table/TurnRibbon.tsx` | 우노 `UnoTurnRibbon`을 옮겨 `TurnRibbon`으로(우노가 import) |
| `table/fan.ts` | 우노 `layout.ts`의 부채꼴 계산(`fanAngle`, `fanDrop`, `fanUnderhang`, `fanRoom`, `fanOverhang`, `handHeadroom`, `HAND_GLOW`)을 옮긴다(우노 `layout.ts`는 다시 내보낸다) |
| `table/useElementWidth.ts` | 우노 `UnoHand`의 `useWidth`를 옮긴다 |
| `table/ghostGeometry.ts` | 우노 `motion/ghostGeometry.ts`를 옮긴다(우노 파일은 다시 내보낸다) |
| `table/useFinalePhase.ts` | 우노 `useUnoFinale`의 시간 흐름을 일반화(`useFinalePhase(game, transition, instant)`), `useUnoFinale`은 이를 부른다 |
| `table/useFreshIds.ts` | 우노 `UnoHand`의 새 카드 표시 훅을 옮긴다 |
| `table/useGhostFlights.ts` | 우노 `useUnoMotion`의 카드 비행 몸통을 꺼내 두 게임이 함께 쓴다(`useUnoMotion`은 감싸기만) |
| `lib/eventLog.ts`, `table/LogList.tsx` | `LogKind`에 `'pair' \| 'shuffle' \| 'finish' \| 'thief'`와 아이콘 |
| `components/icons.tsx` | `ThiefMaskIcon`(도둑 가면), `PairIcon`(겹친 두 장) |

- 게임 선반·로비·전적 탭·전적 창 줄·대기실 규칙·인원 선택(`seatOptions(min, max)`)은 등록부(`GAME_ORDER`, `GAMES`)에서 만들어지므로 모듈을 등록하면 따라온다.

## 6. 프론트엔드: 도둑잡기 화면

### 6.1 타입

`Suit`, `PlayingRank`, `PlayingCard { id; suit: Suit | null; rank: PlayingRank }`, `OldMaidPlayerView`, `OldMaidPlacement`, `OldMaidRankEntry`, `OldMaidResult`, `OldMaidEventType`, `OldMaidEvent`, `OldMaidView`(4.7 그대로), `OldMaidSessionView = { gameType: 'OLD_MAID'; game: OldMaidView }`, `OldMaidPeekSignal`(4.3).

### 6.2 파일(`F/games/oldmaid/`)

`cards.ts`(이름·색·글자), `PlayingCardFace.tsx`(앞면·조커·뒷면), `describe.ts`, `oldMaidFixtures.ts`, `layout.ts`(크기·안내 문구), `OldMaidSeat.tsx`, `TargetFan.tsx`(가운데 큰 뒷면 부채와 고르기), `MyHand.tsx`, `DiscardPairs.tsx`, `OldMaidTable.tsx`, `usePeek.ts`(보내기 조절·받은 신호 합치기), `motion/planOldMaidMotion.ts`, `motion/useOldMaidMotion.ts`, `motion/OldMaidGhostLayer.tsx`, `useShuffleEffects.ts`, `OldMaidGameOverPanel.tsx`, `rules.ts`, `OldMaidBoxArt.tsx`, `module.tsx`, 각 테스트.

### 6.3 카드 그림

- 비율 2:3(viewBox 200×300), 둥근 모서리, 흰 바탕, 얇은 회색 테두리.
- 색: 스페이드·클로버 `#1F2430`, 하트·다이아몬드 `#C8283C`. 테마와 상관없이 고정(규칙 정보).
- 무늬 4가지는 모두 SVG path(`SuitGlyph`). 글자 무늬(♠ 등 문자)를 쓰지 않는다.
- **모서리 표시**: 왼쪽 위에 큰 랭크 글자(A, 2~10, J, Q, K, 굵게, "10"은 같은 폭으로 줄임) + 그 아래 무늬. 오른쪽 아래에 180도 돌려 한 번 더. 카드가 겹쳐 왼쪽 60/200만 보여도 읽힌다(`CORNER_EXTENT = 60`). 가운데 그림(무늬·틀·조커 그림)은 이 폭 밖(가로 58 이후)에 두고, 겹친 띠 끝에 조각이 비치지 않도록 실제로는 x 61 이후에서 시작한다: 무늬 줄 `L = 74`·`R = 126`(무늬 크기 26), A의 큰 무늬 크기 84, J·Q·K 틀 x 64~136, 조커 모자 x 62~138. `PlayingCardFace.test`가 이 띠를 검사한다.
- 가운데: A는 큰 무늬 하나, 2~10은 표준 무늬 배치(`PIPS` 표), J·Q·K는 테두리 틀 안에 큰 랭크 글자(안쪽 판 폭 58 안에 들어가는 크기 80)와 무늬(인물 그림 없음).
- **조커**: 우리 디자인. 보라 `#5B3FA8`·금색 `#E8B931` 광대 모자(세 갈래, 끝에 방울) 아래 눈 감고 웃는 얼굴과 지그재그 깃, 모서리에는 겹친 손패에서도 알아보도록 "조"·"커"를 세로로 크게 쌓고(굵게, 보라) 그 아래 작은 금색 별.
- **뒷면**: 테마 변수(`--card-back-from`, `--card-back-to`, 없으면 남색 `#23305A`→`#3B4C8C`) 그라데이션 위에 마름모 격자 무늬와 가운데 작은 원 문양. 흰 테두리 6%.
- 이름(접근성·기록): `스페이드 A`, `하트 10`, `다이아몬드 K`, `클로버 7`, `조커`.

### 6.4 배치

- 공통: `Felt` 타원 테이블, 테마 변수, `RoomStatusBar`, `TurnBar`(위, "내 차례" 배지 포함), 채팅 자리, 닉네임 메뉴, 효과음을 우노와 똑같이 쓴다. 상대 자리는 `seatOrder` + `seatRows`(최대 5명).

| 요소 | PC | PC 낮은 화면(높이 900 미만) | 휴대폰 가로 | 휴대폰 세로 |
|---|---|---|---|---|
| 내 손패 카드 폭 | 84 | 68 | 46 | 56 |
| 가운데 상대 부채 카드 폭 | 76 | 62 | 44 | 48 |
| 상대 자리 뒷면 폭 | 30 | 24 | 20 | 20 |
| 버린 짝 카드 폭 | 44 | 36 | 30 | 32 |
| 겹침 최소 보이는 폭(손패/가운데) | 34/30 | 28/24 | 20/18 | 22/18 |

- 14장(R10)까지 가로 스크롤 없이 들어가는 크기다(세로 360px: 가운데 13×18 + 48 = 282px).
- **상대 자리**(`OldMaidSeat`): 프로필 그림이 붙은 이름표(연결 끊김 표시), 뒷면 부채(장수만큼, 최대 7장 그리고 나머지 생략), "N장" 배지, 차례면 `turn-ring` 강조 테두리와 "차례" 배지와 5초 이하 작은 카운트다운, 그 사람이 지금 뽑히는 상대면 "뽑히는 중" 배지. 끝냈으면 뒷면 대신 등수 배지("1등", 메달 아이콘). 기권했으면 흐리게 "기권". 게임이 끝나 도둑이면 도둑 가면 배지. 섞으면 부채가 섞이는 애니메이션.
- **가운데**(게임 중): 위에 "{뽑는 사람}님이 {상대}님의 카드를 고르는 중"(내가 뽑는 사람이면 "{상대}님의 카드를 1장 고르세요") 한 줄, 그 아래 상대 손패를 크게 펼친 뒷면 부채(`TargetFan`, 상대 장수만큼). 내가 상대이면 가운데 부채 대신 "내 카드를 고르고 있어요"만 쓰고 들림은 내 손패에서 본다. 옆에 버린 더미(`DiscardPairs`: 맨 위 짝 2장을 엇갈려 겹치고 그 아래 "버린 카드 N장").
- **고르는 카드 들림**: 가운데 부채·상대 자리 작은 부채·내 손패 모두, 신호 자리의 카드를 카드 높이의 18% 들어 올리고 강조 테두리(`--accent`). 0.15초 전환(동작 줄이기면 테두리만).
- **내 손패**(`MyHand`): 앞면 부채꼴(우노와 같은 부채 계산), **서버 순서 그대로**(남이 고르는 순서, 정렬하지 않는다). 새로 받은 카드 1.2초 노란 테두리. 손패 줄 높이 고정. 손패 위 오른쪽에 "섞기" 버튼(`ShuffleIcon`, `canShuffle`일 때만 보이고 누른 뒤 1초 잠김). 섞으면 카드가 새 순서로 미끄러진다(`layout` 애니메이션).
- **내 차례 리본**: 내가 뽑는 사람이면 손패 칸 위에 공통 `TurnRibbon`("내 차례 · N초").
- **세로 휴대폰**: 상태 바 → TurnBar → 테이블(상대 한 줄, 가운데) → 손패 → 채팅 줄. **가로 휴대폰**: 왼쪽 칸(상태 바·TurnBar·채팅) | 오른쪽(테이블, 손패). 우노와 같은 나눔.
- **관전자**: 손패 자리에 `SpectatorNotice`, 섞기 없음. 가운데 부채는 보인다(들림 포함).

### 6.5 상호작용

- **정밀 포인터**(`(pointer: fine)`): 가운데 부채 카드에 마우스를 올리면 그 자리를 신호로 보내고(들림), 부채 밖으로 나가면 `null`을 보낸다. 누르면 `DRAW {index}`.
- **터치**: 첫 탭은 그 카드를 고르고(들림 + 신호), 위에 "뽑기" 알약 버튼을 띄운다. 같은 카드를 다시 탭하거나 "뽑기"를 누르면 `DRAW`. 다른 카드를 탭하면 고른 카드를 옮긴다. 부채 밖을 누르면 고르기 취소(`null` 신호). 우노 손패의 터치 고르기와 같은 모양.
- **키보드**: 가운데 카드는 `button`. 초점이 가면 신호, Enter/Space로 뽑기.
- **신호 보내기 조절**(`usePeekSender`): 같은 자리는 다시 보내지 않고, 100ms에 한 번까지(마지막 값은 반드시 보낸다, trailing). 차례가 바뀌면 기억을 지운다.
- **받은 신호 합치기**: 화면의 `peek`과 받은 신호 가운데 `startedAt`·`turnSeq`가 지금 화면과 같고 `seq`가 큰 것을 쓴다.
- **보내기 중복 방지**: `DRAW`는 우노의 `PENDING_MS = 3000` 잠금. `SHUFFLE`은 이 잠금을 쓰지 않고 자기 1초 잠금만 쓴다.
- 카드·섞기 버튼은 자기 소리가 있으므로 `data-no-click-sound`.

### 6.6 차례 안내 문구(TurnBar)

| 상황 | PC | 좁은 화면 |
|---|---|---|
| 내가 뽑는 사람 | {상대}님의 카드를 1장 고르세요. | 카드를 1장 고르세요 |
| 내가 상대 | {뽑는 사람}님이 내 카드를 고르는 중… | 내 카드를 고르는 중… |
| 남의 차례 | {뽑는 사람}님이 {상대}님의 카드를 고르는 중… | {뽑는 사람}님의 차례예요 |
| 내가 끝냄(게임 중) | {N}등으로 끝냈어요. 끝까지 지켜보세요. | {N}등으로 끝냈어요 |
| 끝남 | 게임이 끝났어요. | 같음 |

### 6.7 진행 기록 문구(`describe.ts`)

- 처음 받은 화면은 `START`가 있을 때만 쓴다. 그 밖에는 `seq`가 이전 화면보다 큰 이벤트만. 새 게임이면 "새 게임을 시작해요" 다음 줄들.
- `auto: true`인 `DRAW`는 따로 쓰지 않고 `autoActSeq`가 늘면 "시간이 지나 {닉네임}님 대신 카드를 뽑았어요" 한 줄로 대신한다(뒤따르는 `PAIR`·`FINISH`는 쓴다).

| 이벤트 | 기록 종류 | 문구 |
|---|---|---|
| `START` | start | {닉네임}님부터 {상대}님의 카드를 뽑아요 |
| `DEAL_PAIRS` | pair | {닉네임}님이 처음 짝 {N}쌍을 버렸어요 (0쌍이면 쓰지 않음) |
| `DRAW` | draw-deck | {닉네임}님이 {상대}님의 카드를 1장 뽑았어요 |
| `PAIR` | pair | {닉네임}님이 {랭크 글자} 짝을 버렸어요 |
| `FINISH` | finish | {닉네임}님이 {N}등으로 끝냈어요! |
| `SHUFFLE` | shuffle | {닉네임}님이 손패를 섞었어요 |
| `FORFEIT` | leave | {닉네임}님의 카드 {N}장이 {받는 사람}님에게 넘어갔어요 |
| `GAME_END` 도둑 | thief | {닉네임}님이 도둑이에요! |
| `GAME_END` 남은 승자 | result | 모두 나가서 {닉네임}님이 1등이에요 |

### 6.8 애니메이션

- 뽑기: 뒷면 카드 한 장이 상대 자리(또는 가운데 부채의 그 자리)에서 뽑은 사람 자리(내 손패)로 0.35초 날아간다. 내가 뽑았으면 날아오며 앞면으로 뒤집히지 않는다(어떤 카드인지는 손패에 새 카드로 보인다).
- 짝 버리기: 두 장이 손패/자리에서 버린 더미로 0.3초, 앞면으로 날아가 엇갈려 놓인다.
- 기권 넘기기: 뒷면 카드 묶음(최대 4장)이 나간 자리에서 받는 자리로.
- 섞기: 그 사람 자리의 뒷면 부채가 0.6초 동안 좌우로 엇갈려 섞이는 모양(동작 줄이기면 투명도 깜박임). 섞은 사람 본인은 손패 카드가 새 자리로 미끄러진다.
- 끝냄: 그 자리 등수 배지가 0.6배 → 1배로 튀어나온다.
- 게임 끝: 마지막 비행 뒤 공통 `GameEndBanner` → 결과 창. 공통 `useGameOverCue`로 모두에게 게임 끝 소리 한 번(1등은 밝은 소리).

### 6.9 효과음

- 뽑기 `draw`(사용자가 고른 소리), 짝 버리기 `place`, 기권 넘기기 `draw`, 섞기 `draw` 한 번(내가 섞었거나 지금 뽑히는 사람이 섞었을 때만, 1초마다 섞는 소리가 방을 채우지 않게), 내 차례 시작 `myTurn`(내가 뽑는 사람이 된 새 차례), 5초 경고 `tick`, 게임 끝 `gameOverWin`/`gameOverEnd`(공통). 새 소리는 없다.

### 6.10 결과 창(`OldMaidGameOverPanel`)

- 공통 `Modal`("게임 결과"), `Confetti`(1등 본인), `HeadlineIcon`, `ReadyChips`, `FooterButton`.
- 머리말: 내가 1등이면 "내가 1등이에요!", 아니면 "{닉네임}님이 1등이에요!". 그 아래 도둑 줄: 도둑 가면 아이콘 + "도둑은 {닉네임}님이에요"(내가 도둑이면 "내가 도둑이에요"). 기권으로 끝났고 남은 승자면 "모두 나가서 게임이 끝났어요".
- 등수 표: 등수 순으로 한 줄씩("{N}등", 프로필 그림, 닉네임, 오른쪽 표시). 도둑 줄은 붉은 바탕 + 가면 아이콘 + 조커 작은 카드 + "도둑". 기권 줄은 흐리게 "기권".

### 6.11 규칙 캐러셀(`rules.ts`, 8장)

제목 "도둑잡기 규칙".

1. **목표** — "같은 숫자 카드 두 장을 짝지어 버려요.", "손패를 먼저 비울수록 높은 등수예요. 조커를 마지막까지 쥔 사람이 도둑이에요." (A 두 장, 조커)
2. **카드** — "트럼프 52장에 조커 1장을 더해 53장을 써요.", "무늬와 색은 상관없이 숫자(랭크)만 같으면 짝이에요." (하트 7, 클로버 7)
3. **준비** — "카드를 모두 한 장씩 나눠 줘요.", "받자마자 짝은 자동으로 버려요. 같은 숫자가 3장이면 2장만 버려요." (뒷면 3장)
4. **내 차례** — "왼쪽 사람(다음 차례 사람)의 뒷면 카드 중 1장을 골라 가져와요.", "카드에 마우스를 올리거나 한 번 누르면 모두에게 그 카드가 살짝 들려 보여요." (뒷면 3장)
5. **짝 버리기** — "가져온 카드가 내 카드와 짝이면 바로 버려요.", "짝이 없으면 내 손패 어딘가에 들어가요." (스페이드 Q, 다이아몬드 Q)
6. **섞기** — "내 차례가 아닐 때 '섞기'로 손패 순서를 바꿀 수 있어요.", "남은 섞는 모습만 보고, 카드는 볼 수 없어요."
7. **끝** — "손패를 다 비우면 비운 순서대로 1등, 2등…이에요.", "마지막까지 조커를 쥔 한 사람이 도둑이에요. 1등만 승리로 기록돼요." (조커)
8. **시간과 기권** — "카드를 고를 시간은 15초예요. 지나면 무작위로 1장을 뽑아요.", "게임 중에 나가면 손패가 다음 사람에게 넘어가고 맨 아래 등수가 돼요."

대기실 요약: "왼쪽 사람의 카드를 1장씩 뽑아요.", "같은 숫자 두 장은 짝지어 버려요.", "손패를 먼저 비울수록 높은 등수예요.", "조커를 마지막까지 쥐면 도둑이에요."

### 6.12 상자 그림·등록

- `OldMaidBoxArt`: 짙은 와인색 상자 위에 뒷면 두 장과 앞면(하트 A, 스페이드 A)을 부채꼴로 펴고 맨 앞에 조커, 위에 도둑 가면, 아래 "도둑잡기" 글자(흰 글자, 어두운 테두리).
- 등록: `module.tsx`(`gameType 'OLD_MAID'`, `name '도둑잡기'`, `slug 'old-maid'`, `tagline '2~6인 · 조커를 피해라!'`, `minPlayers 2`, `maxPlayers 6`, `averageScoreLabel '평균 순위'`, `roundScoreText = score => `${score}등``, `gameOverKey = `${code}:OLD_MAID:${startedAt}``). `GAME_ORDER = ['PAPER_SAFARI', 'UNO', 'OLD_MAID']`.
- 전적 페이지 게임 탭·전적 창 줄은 `GAME_ORDER`로 자동으로 생긴다.

### 6.13 접근성

- 가운데 카드 버튼 `aria-label="{상대}님의 {N}번째 카드"`(1부터). 들린 카드는 `aria-current="true"`.
- 내 손패 `role="group"` `aria-label="내 카드 {N}장"`, 카드마다 이름. 상대 자리 `aria-label="{닉네임}, 카드 {N}장{, 차례}{, N등}{, 기권}"`.
- 섞기 버튼 `aria-label="내 손패 섞기"`.

## 7. 테스트 전략

### 7.1 백엔드 엔진 단위(`oldmaid/`, 고정 섞기·고정 자리 고르기)

- 덱: 53장, id 0~52 순서, 조커 52(R1, R2). 짝(R3): 같은 랭크 다른 무늬 짝, 조커는 짝 아님, 자기 자신 아님.
- 손패: 짝 버리기 2·3·4장(R6), 받은 카드 짝·끼우기 자리(R13), 자리 꺼내기 범위 밖 오류, 14장 상한(R10, 전체 덱을 나눈 뒤 모든 손패 ≤ 14).
- 준비: 첫 사람부터 한 장씩(R5), 다시 나누기(R7), 빈 손 등수(R8), 첫 차례(R9).
- 차례: 뽑기 이벤트·짝·끼우기, 상대 건너뛰기(끝낸 사람), 함께 비면 상대 먼저(R14), 차례 넘김(R15), 끝·도둑(R16), 남의 차례 `NOT_YOUR_TURN`, 범위 밖 `OLD_MAID_INVALID_SLOT`, 끝난 뒤 `GAME_ALREADY_OVER`.
- 신호(R17~R21): 뽑는 사람만, 범위 밖·음수 무시, 같은 자리 무시, 50ms 안 무시, 차례가 바뀌면 지움, 섞기는 지우지 않음.
- 섞기(R22~R24): 내 차례 거절, 끝낸 사람 거절, 1초 쿨다운, 이벤트, 남 화면 순서 비공개.
- 기권(R25~R29): 다음 카드 가진 사람에게 넘김·짝 버림·섞음, 받은 사람이 비면 끝냄, 뽑는 사람 기권, 상대 기권(상대 바뀜·마감 새로), 다른 사람 기권(상대 그대로·마감 그대로), 끝낸 사람은 `isPlaying` false, 기권으로 끝(남은 사람 꼴찌 = 도둑), 2명에서 기권(남은 승자 1등), 여러 명 기권 순서(R30).
- 자동 뽑기(R35): `FixedRandom` 자리, `auto: true`, `autoActSeq`.
- 마감(`OldMaidSessionTimerTest`, `MutableClock`): 차례·상대가 바뀌면 15초 새로, 신호·섞기·남의 기권은 그대로, 끝나면 빈 값.
- 화면(`OldMaidViewTest`): `gameType = "OLD_MAID"`, 남의 손패 카드 id가 JSON 트리 어디에도 없음(특히 조커 52는 주인 화면에만), 관전자 `hand = null`, 끝낸 사람 `hand = []`, `canShuffle`, `peek`, 결과 `ranking`·`thiefId`.
- 결과(`OldMaidSessionTest`): `RoundCompleted` score = 등수, `GameCompleted` tokens = 등수·seat, 1등만 WIN, 딱 한 번.

### 7.2 백엔드 통합

- `OldMaidStompFlowTest`: 2명 방 만들기·시작, 상대 손패는 장수만, `DRAW` 성공 → 두 화면 갱신, 남의 차례 `NOT_YOUR_TURN`, 신호(`/app/rooms/{code}/signals`)가 상대·관전자의 `/user/queue/signal`로 감, 남의 신호는 아무에게도 안 감, `SHUFFLE` 쿨다운 오류 429.
- `OldMaidRoomTimeoutTest`: 15초 뒤 자동 뽑기·방송·다음 마감.
- `OldMaidRoomApiTest`: 로비 `/api/games` 3개, OLD_MAID 방 정원 6 허용·7 거절, 6명 시작. 나간 사람은 다시 들어와도 끝난 결과를 받지 않음(Departures).
- `OldMaidRecordApiTest`: 끝나면 `game_type = 'OLD_MAID'`, 1등만 WIN, 라운드 점수 = 등수, 평균 = 평균 등수, 기권 끝도 기록.
- `RoomServiceSignalTest`: 신호는 방송만 하고 방 정보·화면·타이머는 건드리지 않는다. 다른 게임의 신호는 `INVALID_INPUT`.

### 7.3 프론트

- 공통 이동 회귀: 우노 테스트 전부, `seats.test`(5명), `RecentMatches`(게임별 라운드 글자), `useRoomChannel`(신호 구독·보내기·조용한 오류).
- `cards`/`PlayingCardFace`: 이름 53가지, 모서리 표시, 조커·뒷면, 이모지 없음.
- `describe`: 6.7 표 전부, 중복 없음, 자동 행동 한 줄.
- `OldMaidTable`: 배치 3가지, 안내 문구(6.6), 가운데 부채·내 손패·자리 배지, 관전자, 결과 창.
- 상호작용: 마우스 올림 신호·클릭 뽑기, 터치 두 번 탭·"뽑기" 버튼, 키보드, 신호 조절(가짜 타이머), 받은 신호 들림(상대 손패·가운데·자리), 섞기 버튼 조건·1초 잠금, 보내기 잠금, 차례 소리.
- 애니메이션: 비행 계획(뽑기·짝·넘기기)과 소리, 섞기 효과, 끝 연출과 게임 끝 소리, 결과 창(도둑 강조·기권·남은 승자).
- 등록: 선반·로비·규칙 8장·상자 그림·전적 탭·전적 창 줄·"평균 순위"·"N등".
- 최종: 실제 브라우저에서 3계정(PC 1280×860, 휴대폰 세로 360, 휴대폰 가로)으로 한 판 끝까지(올림 신호, 터치 고르기, 섞기, 시간 초과, 기권 넘기기, 도둑 결과, 다음 게임), 우노·페이퍼 사파리 한 판씩 회귀.

## 8. 범위 밖

- 조커 없는 변형(같은 무늬 색 짝, 한 장 빼기 등)과 방 옵션.
- 7명 이상.
- 받은 카드를 원하는 자리에 끼우기(서버가 무작위로 끼운다).
- 컴퓨터 플레이어, 다시 보기, 관전자의 손패 보기.
- 페이퍼 사파리 타이머 부품의 공통화.

## 9. 구현 순서 제안

1. 백엔드 공통 이음매(행동 칸, 신호 경로, 공통 차례 부품 + 우노 정리, 오류 코드).
2. 엔진(카드·나눔 → 차례·끝 → 신호·섞기 → 기권·시간 초과·등수).
3. 세션·화면·`GameType` 등록, 통합 테스트.
4. 프론트 공통 이음매 → 카드·기록 → 테이블 → 상호작용 → 애니메이션·결과 → 규칙·상자·등록.
5. 실제 브라우저 확인.

## 10. 위험과 대응

- 신호가 잦아 방송이 무거워짐 → 서버는 상태 방송 없이 작은 메시지만, 50ms 미만 버림, 화면은 100ms 조절.
- 뽑기 직전 상대가 섞어 고른 카드가 바뀜 → 놀이 그대로의 긴장이다. 서버는 받은 순간의 순서로 처리한다(D12).
- 6명 자리 배치가 처음 → 상대 5명 배치를 공통 `seats.ts`에 더하고 PC·세로·가로 모두 테스트·브라우저로 확인.

## 11. 결정과 이유

| ID | 결정 | 이유 |
|---|---|---|
| D1 | 2~6명, 6명 자리를 이 게임에서 처음 연다(`seats.ts` 5명 배치, 대기실 6자리, 인원 선택 6) | 승인 설계. 서버 정원 검사는 이미 게임별이다. 공통 배치에 칸만 더해 우노·페이퍼 사파리(최대 5)는 그대로다. |
| D2 | 조커 1장 + 52장, 랭크만 같으면 짝 | 승인 설계. 한국에서 흔한 도둑잡기 방식. |
| D3 | 고르는 카드 신호는 행동이 아니라 별도 가벼운 경로(`/signals` → `/user/queue/signal`) | 행동 경로는 매번 방 정보와 사람마다 전체 화면을 방송하고 타이머를 다시 건다. 초당 10번 신호에 쓰면 6명 방에서 초당 수십 개의 큰 메시지와 전체 다시 그리기가 생긴다. 신호는 상태를 바꾸지 않으므로 작은 메시지 하나면 된다. STOMP 가드는 이미 이 경로를 허용한다. |
| D4 | 짝을 버린 뒤 카드를 가진 사람이 2명 미만이면 다시 나눈다 | 그대로 두면 시작과 동시에 끝나 방·기록 흐름(행동 없이 끝남)이 생긴다. 2명 게임에서만 아주 드물게 생기고, 다시 나누는 편이 놀이로도 자연스럽다. |
| D5 | 한 번의 뽑기로 두 사람이 함께 비면 뺏긴 상대가 먼저 등수를 받는다 | 상대의 손패가 비는 순간(카드를 가져갈 때)이 뽑은 사람이 짝을 버리는 순간보다 먼저다. |
| D6 | 짝이 없는 뽑은 카드는 뽑은 사람 손패의 무작위 자리에 끼운다 | 맨 끝에 붙이면 카드를 잃은 사람(특히 조커를 뺏긴 사람)이 그 카드 자리를 알게 된다. "조커 힌트 없음"을 서버가 지킨다. |
| D7 | 기권자 손패는 다음 카드 가진 사람에게 넘기고 짝 버린 뒤 받는 사람 손패를 섞는다 | 승인 설계(넘기고 짝 버림). 섞기는 D6과 같은 이유: 넘어간 카드(조커일 수도)의 자리가 드러나지 않게. |
| D8 | 이미 끝낸 사람은 "게임 중"이 아니다. 나가도 기권이 아니고 등수를 지닌다 | 그 사람은 더 할 행동이 없고 이미 정해진 등수를 빼앗을 이유가 없다. 끊김 자동 기권도 생기지 않는다. |
| D9 | 기권으로 끝나면 남은 사람은 기권하지 않은 사람 가운데 꼴찌. 다른 모두가 기권해 1등이면 도둑이 아니라 남은 승자 | 승인 설계(보통 규칙대로 등수). "1등이면서 도둑"은 말이 안 되므로 그 경우만 따로 이름 붙인다. |
| D10 | 1등만 WIN. 라운드 점수와 경기 `tokens`에 등수를 넣고 기권 끝도 라운드를 기록한다 | 승인 설계(1등만 승). 기록 표에 등수 칸이 없어 기존 칸을 쓰면 DB 변경 없이 기록 화면에 등수("N등")와 "평균 순위"를 보여 줄 수 있다. 등수는 기권 끝에서도 의미가 있어 늘 기록한다. |
| D11 | 마감·자동 행동 기록 부품을 `game.turn`으로 옮겨 우노와 함께 쓴다 | 같은 계약을 세 번째로 복사하지 않는다. 우노는 `UnoTimer`·`UnoViewContext`만 바뀌고 테스트로 지켜진다. 페이퍼 사파리 부품은 되돌리기 규칙과 묶여 있어 그대로 둔다. |
| D12 | 뽑는 순간의 상대 손패 순서로 처리한다(신호 자리와 달라도 그대로) | 상대가 섞는 것도 놀이의 일부다. 서버 하나의 순서만 진실로 둔다. |
| D13 | 내 손패는 정렬하지 않고 서버 순서로 보인다 | 승인 설계. 상대가 고르는 자리와 같아야 들림 신호가 내 손패에서 맞는 카드를 가리킨다. |
| D14 | 섞기 쿨다운 오류는 조용히, 화면은 1초 잠금 | 빠르게 두 번 누르는 것은 흔한 정상 조작이라 오류처럼 보이면 안 된다. |
| D15 | 신호를 받지 않는 경우는 모두 오류 없이 버린다(모르는 type만 `INVALID_INPUT`) | 신호는 마우스 움직임에 따라 쏟아지므로 경쟁·늦은 신호마다 오류 알림이 뜨면 안 된다. |
| D16 | 화면 `peek`과 받은 신호는 `startedAt`·`turnSeq`가 같은 것 가운데 `seq`가 큰 쪽을 쓴다 | 신호와 전체 화면이 다른 순서로 와도 오래된 들림이 남지 않는다. |
| D17 | 가운데 큰 부채는 모두에게 보인다(뽑는 사람만 누를 수 있다) | 고르는 순간의 긴장을 모두가 함께 본다. 상대 본인은 앞면 손패에서 들림을 본다. |
