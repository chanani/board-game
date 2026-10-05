# 테이블탑 UI 리디자인 설계

- 작성일: 2026-10-06
- 기반: `2026-10-05-board-game-platform-design.md` (Plan 1~5 완료, master)

## 1. 목표

평면적인 UI를 "실제 보드게임 테이블에서 노는 것 같은" 입체 UI로 전면 교체한다.

사용자 요구:
1. 로그인하면 게임 목록이 보이고, 게임마다 **대기 인원**과 **플레이 중 인원**이 보인다.
2. 전체 UI를 입체적으로 바꾼다.
3. 카드는 이모지+숫자가 아니라 **실제 카드 그림**으로 보인다.
4. 모든 상황에 알맞은 애니메이션이 들어간다.
5. 실제로 게임을 하는 듯한 화면을 만든다.

결정 사항(브레인스토밍):

| 항목 | 결정 |
|---|---|
| 카드 그림 | 직접 그린 SVG 일러스트 (외부 이미지·저작권 없음) |
| 테마 | **원목 + 초록 펠트** 테이블 |
| 카드 스타일 | **풀 일러스트형**: 카드 전체가 사바나 그림, 숫자는 둥근 배지 |
| 게임 화면 배치 | PC: 테이블에 둘러앉기 / 모바일·태블릿: 위쪽 상대 줄 + 큰 테이블 |
| 게임 목록 | **원목 선반 위의 입체 게임 상자** + "준비 중" 상자 |
| 화면 흐름 | 게임 선반(`/`) → 게임별 로비 → 방 |
| 효과음 | Web Audio로 합성, 🔊/🔇 토글 |
| 애니메이션 구현 | `motion` 라이브러리 + CSS 3D |

## 2. 범위

포함: 1~5번 요구, 효과음, 동작 줄이기 대응, 모든 기존 화면(로그인·회원가입·로비·대기실·게임·결과·전적)의 새 테마 적용.

제외: 게임 목록 실시간 푸시(5초 폴링을 씀), 배경음악, 다크/라이트 전환, 새 게임 추가, 게임 규칙·서버 판정 변경.

## 3. 화면 흐름과 라우팅

```
/login, /signup
   │ 로그인 성공
   ▼
/                      게임 선반 (GameShelfPage)
   │ 게임 상자 클릭 (상자가 열리는 전환)
   ▼
/games/paper-safari    게임 로비 (현재 LobbyPage 내용: 방 목록·방 만들기·코드 입장·내 전적·순위표 TOP 5)
   │ 방 입장
   ▼
/rooms/:code           대기실 → 게임 테이블
/records, /records/:memberId   전적
```

- 게임 선반과 게임 로비 모두 진입 시 `GET /api/rooms/me`를 확인한다. 이미 방에 있으면 지금처럼 그 방으로 `replace` 이동한다.
- URL 조각(`paper-safari`)과 `GameType`(`PAPER_SAFARI`)의 연결은 프론트의 게임 카탈로그(`games/catalog.ts`)에 둔다. 카탈로그는 게임별 경로 조각, 상자 그림 컴포넌트, 짧은 소개 문구를 가진다. 알 수 없는 조각이면 `/`로 보낸다.
- 상단바는 원목 띠다. 왼쪽에 로고(홈=선반)와 "내 전적", 오른쪽에 닉네임, 🔊/🔇 토글, 로그아웃을 둔다.

## 4. 백엔드: 게임 목록 API

### 4.1 API

`GET /api/games` (로그인 필요; 비로그인 시 기존 401 형식)

```json
[
  {
    "gameType": "PAPER_SAFARI",
    "name": "페이퍼 사파리",
    "minPlayers": 2,
    "maxPlayers": 5,
    "waitingPlayers": 3,
    "playingPlayers": 6
  }
]
```

- `GameType.values()` 순서대로 모든 게임을 반환한다. 방이 없는 게임도 인원 0으로 포함한다.
- `waitingPlayers`: 상태가 `WAITING`인 방들의 참가자 수 합계.
- `playingPlayers`: 상태가 `PLAYING`인 방들의 참가자 수 합계.

### 4.2 구조 (CLAUDE.md 규칙 준수)

- `room.domain.PlayerCount`: 0 이상 정수 VO. `plus(PlayerCount)`를 가진다.
- `room.domain.GameOccupancy`: 한 게임의 `GameType`, 대기 `PlayerCount`, 플레이 `PlayerCount`(필드 3개).
- `room.domain.GameOccupancies`: 일급 컬렉션. `Room` 목록을 받아 게임별로 집계한다. 집계 로직은 여기에 둔다.
- `Room`에 집계용 메시지를 추가한다(예: `occupancyOf()` 또는 `countInto(...)`). 상태를 꺼내 묻지 않고 방이 자기 인원을 대기/플레이 칸에 더하게 한다.
- `RoomService.gameOccupancies()`: 기존과 같은 전역 `synchronized` 안에서 `registry.all()`로 집계한다.
- `game.api.GameController`(또는 `room.api` 아래 `GameLobbyController`) + `GameSummaryResponse` 레코드.
- 들여쓰기 1단계, `else` 금지, 한 줄 점 하나 규칙을 지킨다.

### 4.3 백엔드 테스트

- `GameOccupanciesTest`: 빈 레지스트리, 대기 방만 있음, 플레이 방만 있음, 섞여 있음.
- `PlayerCountTest`: 음수 거부(`BusinessException`), 더하기.
- 컨트롤러 통합 테스트: 비로그인 401, 로그인 후 응답 형식과 집계 값.

그 밖의 백엔드 코드(규칙 엔진, STOMP, 전적)는 바꾸지 않는다.

## 5. 비주얼 시스템

### 5.1 테마 토큰 (`index.css`의 `@theme`)

- 원목: `wood-900`(배경 어두운 나무), `wood-700`, `wood-500`(테이블 테두리), `wood-300`(선반 판)
- 펠트: `felt-800`, `felt-600`, `felt-400`
- 종이: `cream-50`, `cream-200`(두께 그림자)
- 강조: `mustard-400`, `mustard-600`(기본 버튼과 그 두께)
- 위험: `brick-500`, 정보: 기존 `safari-*` 유지

배경은 어두운 원목 그라데이션 위에 은은한 나뭇결 무늬(CSS 반복 그라데이션)와 비네팅을 깐다. 외부 이미지는 쓰지 않는다.

### 5.2 공통 재질 컴포넌트 (`components/`)

- `Panel`: 크림색 종이 카드. 아래쪽 두께 그림자(`0 4px 0 cream-200`) + 부드러운 그림자.
- `Button`: `primary`(겨자), `secondary`(크림), `danger`(벽돌). 아래쪽 4px 두께가 있고, `:active` 상태에서 4px 내려가며 두께가 사라진다. 비활성 상태는 납작하고 흐리다.
- `TextInput`: 안쪽으로 파인 종이 입력칸(inset 그림자).
- `Felt`: 펠트 테이블 표면. 원목 테두리, 안쪽 그림자, `variant: 'oval' | 'rect'`.
- `WoodRail`: 원목 선반이나 띠(모바일 상대 줄, 게임 선반, 상단바).
- `Modal`: 화면을 어둡게 덮고 종이 카드가 튀어 오르는 모달. 포커스 가두기와 Esc 닫기(닫을 수 있는 모달만)를 지원한다. 기존 결과 모달과 게임 종료 패널이 이것을 쓴다.

기존 화면은 위 컴포넌트를 쓰므로 대부분 그대로 새 재질이 된다.

### 5.3 카드 (`games/papersafari/cards/`)

- `CardArt`: `card: CardView`를 받아 해당 일러스트 SVG를 그린다. 동물 14종은 각각 작은 컴포넌트다(`art/Lion.tsx` 등). 모두 `viewBox="0 0 100 140"`이고 하나의 팔레트와 화풍을 공유한다(둥근 형태, 두꺼운 외곽 없음, 2~3단 음영).
  - 숫자 0~9: 쥐, 토끼, 원숭이, 얼룩말, 기린, 치타, 하마, 악어, 코뿔소, 사자 (현재 이모지 순서와 같음)
  - 특수: 코끼리, 타잔, 여우(-2), 와일드
- 앞면 구성: 사바나 배경(하늘 그라데이션 55% + 풀밭), 크림색 테두리, 왼쪽 위 원형 숫자 배지(와일드는 `?`, 여우는 주황 배지 `-2`), 아래쪽 이름 리본(예: "사자"). 특수 카드는 금색 테두리.
- 뒷면: 초록 사선 줄무늬 + 크림 테두리 + 가운데 사자 문장.
- 두께: 겹친 아래 그림자 2단(`0 2px 0`, `0 4px 0`) + 떨어진 그림자.
- 크기 3단계: `lg`(내 판), `md`(더미·손), `sm`(상대 판). 모두 비율 5:7.
- `CardFace`는 지금의 props와 `aria-label`을 그대로 유지한다: `card`, `faceUp`, `known`, `size`, `highlight`, `onClick`.
  - 앞뒤 면은 `preserve-3d` 컨테이너 안에서 `rotateY(0/180deg)`로 실제 회전한다.
  - `known && !faceUp`(엿봄): 뒷면 위로 앞면이 45% 불투명도로 비치고 👁 배지가 붙는다.
  - `highlight`(0점 짝): 금빛 테두리와 은은한 빛.
  - 클릭할 수 있으면 마우스를 올렸을 때 카드가 들리고 그림자가 커진다. 키보드 포커스 링도 보인다.

### 5.4 게임 테이블 레이아웃 (`PaperSafariTable`)

`useMediaQuery('(min-width: 1024px)')`로 두 배치 중 하나를 고른다.

PC (`TableRound`):
- 화면 대부분을 차지하는 타원형 `Felt`. 나는 아래 가운데에 `lg` 크기로 앉는다.
- 상대는 인원수에 따라 정해진 자리에 `sm` 크기로 앉는다.

  | 상대 수 | 자리 |
  |---|---|
  | 1 | 위 가운데 |
  | 2 | 위 왼쪽, 위 오른쪽 |
  | 3 | 왼쪽, 위 가운데, 오른쪽 |
  | 4 | 왼쪽, 위 왼쪽, 위 오른쪽, 오른쪽 |

  자리 순서는 좌석 순서(서버의 `boards` 순서)를 나부터 시계방향으로 돈 순서다.
- 가운데: 덱(남은 장수에 따라 1~4단 두께로 쌓이고 장수 배지가 붙음), 버린 카드 더미(맨 위 카드 + 아래로 2장 정도 살짝 어긋나게).
- 손에 든 카드: 그 사람 자리 옆에 살짝 들리고 기울어진 채 떠 있다. 덱에서 뽑아 다른 사람에게 숨겨진 카드는 뒷면으로 보인다.

모바일·태블릿 (`TableRail`):
- 위쪽 `WoodRail`에 상대들이 `sm` 크기로 한 줄로 선다(넘치면 가로 스크롤).
- 아래쪽 `Felt`에 가운데 더미, 손에 든 카드, 내 판이 `md`~`lg` 크기로 놓인다.

공통 HUD:
- 위쪽: 라운드 번호, 각자의 토큰(●●○), 안내 문구(지금의 `instruction()` 재사용).
- 차례인 사람의 이름표는 겨자색으로 빛나며 맥박처럼 움직인다.
- 연결 상태 점, 연결 끊김 초, "내보내기" 버튼(지금 기능 유지).
- 내 판 옆에 예상 점수와 "버리기" 버튼, 기권 버튼(지금 기능 유지).
- 진행 기록은 접을 수 있는 쪽지 패널(기본은 접힘, 최근 1줄만 보임).

### 5.5 그 밖의 화면

- **게임 선반(`GameShelfPage`)**: 원목 벽 위의 선반 판(`WoodRail`)에 입체 게임 상자(`GameBox`)를 올린다.
  - 상자는 앞면 그림과 옆면 두께를 가진 CSS 3D 상자다. 마우스를 올리면 앞으로 기울어진다.
  - 상자 아래에 알약 2개를 둔다: `⏳ 대기 N`, `● 플레이 N`(초록 점이 깜빡임).
  - "준비 중" 상자는 회색에 자물쇠가 붙고 누를 수 없다. 1개만 둔다.
  - 인원은 5초마다 다시 불러온다. 실패하면 인원 칸에 `–`를 표시하고, 토스트는 처음 실패할 때 한 번만 띄운다(지금 로비와 같은 방식).
- **게임 로비(`GameLobbyPage`)**: 지금 `LobbyPage`의 기능을 그대로 옮긴다. 방 목록은 펠트 위에 놓인 종이 카드다(방 이름, 👑 방장, 인원 의자 아이콘 n/max, 참가 버튼). 맨 위에 게임 상자 작은 그림과 "← 게임 선반으로" 링크를 둔다.
- **대기실**: 펠트 위에 최대 인원만큼 의자(원형 자리)를 놓는다. 들어온 사람은 이니셜 원판과 이름표로, 빈자리는 점선으로 표시한다. 방장 👑, 연결 점, 방 코드 복사 버튼, 시작 버튼은 지금처럼 유지한다.
- **라운드 결과 모달**: 펠트 위에 각자의 판이 펼쳐진다. 남은 뒷면 카드가 한 장씩 뒤집힌 뒤 점수가 위로 올라가며 세어진다. 승리한 사람은 리본, 토큰은 하나 더 떨어지는 효과를 받는다. "준비" 상태 표시는 지금처럼 유지한다.
- **게임 종료**: 우승자 트로피 카드, 종이 꽃가루, 최종 토큰. 닫기와 다시 하기 흐름은 지금처럼 유지한다.
- **로그인과 회원가입**: 원목 배경 위 작은 펠트 매트에 종이 카드 폼을 놓고, 옆에 카드 두 장이 부채꼴로 놓인 장식을 둔다.
- **전적**: 종이 패널에 승·무·패 막대(입체 알약), 최근 경기는 종이 쪽지 목록, 순위표 1~3위는 메달 장식으로 보여준다.
- **토스트**: 아래에서 위로 올라오는 종이 쪽지. **연결 끊김 배너**: 상단바 아래 겨자색 띠.

## 6. 애니메이션

### 6.1 라이브러리

- `motion`(React용 `motion/react`)을 의존성에 추가한다.
- 기본 전환 시간: 이동 0.4초(spring, bounce 0.2), 뒤집기 0.35초, 페이드 0.2초.
- `MotionConfig reducedMotion="user"`로 앱 전체를 감싼다. 동작 줄이기 사용자에게는 이동과 회전이 짧은 페이드로 바뀌고, 꽃가루와 나눠 주기 연출은 생략된다.

### 6.2 상태 비교로 카드 움직임 추론 (`games/papersafari/motion/inferMoves.ts`)

순수 함수 `inferMoves(prev: PaperSafariView | null, next: PaperSafariView): Move[]`.

`Move`는 다음 중 하나다.
- `{ kind: 'travel', from: Zone, to: Zone, card: CardView | null }`
- `{ kind: 'flip', at: SlotZone }`
- `{ kind: 'peek', at: SlotZone }`
- `{ kind: 'deal', round: number }`

`Zone`은 `deck` / `discard` / `hand(playerId)` / `slot(playerId, column, row)` 중 하나다.

| 이전 → 다음 | 움직임 |
|---|---|
| 같은 라운드, `held` 없음 → `held`(source=DECK) | travel deck → hand(p), card = 다음 상태의 held.card(남에게는 null=뒷면) |
| 같은 라운드, `held` 없음 → `held`(source=DISCARD) | travel discard → hand(p), card = 이전 discardTop |
| 같은 라운드, `held` 있음 → 없음, p의 어떤 칸 내용이 바뀜 | travel hand(p) → slot(바뀐 칸), 이어서 travel slot(바뀐 칸) → discard (card = 다음 discardTop) |
| 같은 라운드, `held` 있음 → 없음, 칸 변화 없음 | travel hand(p) → discard |
| 어떤 칸의 `faceUp` false → true (위에서 설명되지 않은 것) | flip |
| 어떤 칸의 `known` false → true, `faceUp` false | peek |
| `roundNumber` 증가, 또는 이전 상태 없이 첫 라운드의 SETUP_FLIP | deal |

- "칸 내용이 바뀜"은 `faceUp`, `known`, `card`(종류와 값) 중 하나라도 달라진 것을 말한다. 상대가 뒷면 칸과 바꾼 경우처럼 내용 변화가 보이지 않을 수 있다. 이 경우를 위해 `held` 있음 → 없음이고 버린 카드 더미 맨 위가 바뀌었으면 "교체"로 보고, 칸을 특정할 수 없으면 hand → discard로 대신한다.
- 라운드가 끝나면서 생기는 대량 공개(ROUND_OVER)는 travel/flip으로 만들지 않는다. 결과 모달의 순차 뒤집기 연출이 이것을 맡는다.

### 6.3 실행 (`useCardMotion`)

- 테이블은 영역마다 위치 기준 요소를 등록한다(`ZoneAnchor` 컴포넌트가 `data-zone`과 ref를 가진다).
- `travel`은 출발 영역의 화면 좌표에서 도착 영역의 좌표까지 날아가는 **유령 카드**(겹쳐 그린 레이어 위의 `motion.div`)로 실행한다. 도착 영역의 실제 카드는 유령이 도착할 때까지 숨긴다(`visibility: hidden`). 경로는 위로 휘는 호(가운데 키프레임에서 y -40px, 회전 ±8°)다.
  - 이 방식은 `layoutId` 대신 겹쳐 그린 레이어를 쓴다. 카드에 고유 ID가 없어 서버 상태만으로는 같은 카드를 이어 붙일 수 없기 때문이다. 결과적으로 같은 "날아가는" 효과를 낸다.
- `flip`과 `peek`는 해당 `CardFace`의 회전 애니메이션으로 실행한다(peek는 살짝 들렸다가 0.8초 뒤 내려온다).
- `deal`: 덱에서 각자의 칸 6곳으로 유령 카드가 0.05초 간격으로 차례로 날아간다(최대 1.5초).
- 큐: 하나의 상태 변화에서 나온 움직임은 순서대로 실행된다. 새 상태가 도착하면 진행 중인 큐를 즉시 끝내고(유령 제거, 숨김 해제) 새 큐를 시작한다. 화면은 늘 최신 서버 상태를 보여준다.
- 행동 잠금(지금 `PENDING_MS`)은 그대로 둔다. 애니메이션이 사용자 입력을 막지는 않는다.

### 6.4 그 밖의 연출 목록

| 상황 | 연출 |
|---|---|
| 페이지 이동 | 페이드 + 8px 슬라이드 (`AnimatePresence`, 라우트 키) |
| 게임 상자 클릭 | 상자가 앞으로 커지며 뚜껑이 열리는 효과(0.4초) 후 이동 |
| 선반·로비 첫 진입 | 상자와 방 카드가 차례로 떨어지듯 등장 |
| 인원 숫자 변화 | 숫자가 굴러가듯 바뀜(`RollingNumber`) |
| 대기실 입장·퇴장 | 의자에 원판이 튀어 오르며 앉음 / 줄어들며 사라짐 |
| 내 차례 시작 | 내 이름표가 빛남 + 내 판이 살짝 떠오름 + 효과음 |
| 클릭할 수 있는 카드 | 은은하게 떠오르는 맥박(내 차례에만) |
| 0점 짝 완성 | 두 카드에 금빛 반짝임 1회 |
| 버튼 | 누르면 들어가고 놓으면 튀어나옴 |
| 모달 | 배경 페이드 + 카드가 아래에서 튀어 오름 |
| 라운드 결과 | 뒷면 카드 차례로 뒤집기 → 점수 세기 → 승자 리본 |
| 게임 승리 | 종이 꽃가루(가벼운 자체 구현, 2초, canvas 없이 DOM 30~40개) |
| 토스트 | 아래에서 올라오고 3초 뒤 내려가며 사라짐 |
| 연결 끊김 배너 | 위에서 내려오기 / 올라가기 |

## 7. 효과음 (`lib/sound.ts`)

- Web Audio API로 짧은 소리를 합성한다(파일 없음).
  - `draw`: 걸러낸 잡음 120ms(종이 스침)
  - `place`: 짧고 낮은 톡 소리
  - `flip`: 빠른 잡음 + 높은 클릭
  - `myTurn`: 두 음 딩동
  - `roundWin`: 올라가는 세 음
  - `roundLose`: 내려가는 두 음
  - `click`: 아주 짧은 틱
- `SoundProvider` / `useSound()`가 `play(name)`, `muted`, `toggleMuted()`를 제공한다.
- `AudioContext`는 사용자가 처음 화면과 상호작용할 때(pointerdown/keydown) 만든다. 그 전의 `play` 호출은 조용히 무시한다.
- 음소거 설정은 `localStorage['bg.muted']`에 저장한다. 읽기와 쓰기 모두 try/catch로 감싸고, 실패하면 기본값(소리 켬)을 쓴다.
- 테스트 환경(jsdom)에는 `AudioContext`가 없으므로 그때는 아무것도 하지 않는다.
- 움직임 큐가 효과음을 낸다(travel 시작 = draw 또는 place, flip/peek = flip, deal = 짧은 draw 반복 최대 6번).

## 8. 오류 처리

- 서버 오류(`/user/queue/errors`): 지금처럼 행동 잠금을 풀고 토스트를 띄운다. 진행 중인 움직임 큐는 즉시 끝낸다.
- 재연결 후 상태 재동기화: 이전 상태와의 차이가 크면 `inferMoves`가 많은 움직임을 만들 수 있다. 그래서 재동기화로 받은 상태는 **움직임 없이** 바로 반영한다(`useRoomChannel`이 재동기화 여부를 알려준다).
- 게임 목록 API 실패는 5.5절에 따른다.
- 그림은 모두 코드 안의 SVG이므로 "이미지 로드 실패" 경우는 없다.

## 9. 파일 구조 (프론트, 주요 변경)

```
src/
  App.tsx                         라우트 변경, MotionConfig·SoundProvider·AnimatePresence
  index.css                       테마 토큰, 나뭇결·펠트 유틸리티
  api/games.ts                    GET /api/games
  api/types.ts                    GameSummary 타입
  components/ui.tsx               Panel/Button/TextInput 새 재질
  components/Felt.tsx, WoodRail.tsx, Modal.tsx, RollingNumber.tsx, Confetti.tsx
  components/Layout.tsx           원목 상단바, 🔊 토글, 페이지 전환
  lib/sound.ts                    효과음 엔진 + Provider
  lib/useMediaQuery.ts
  games/catalog.ts                게임 카탈로그(경로 조각, 이름, 상자 그림)
  games/GameBox.tsx               입체 게임 상자
  pages/GameShelfPage.tsx         (신규) 게임 선반
  pages/GameLobbyPage.tsx         (LobbyPage 이름 변경·재구성)
  games/papersafari/
    cards/CardArt.tsx, cards/art/*.tsx(14종), cards/CardBack.tsx
    CardFace.tsx                  3D 뒤집기, 크기 3단계
    PlayerBoard.tsx               새 재질, 자리 기준 등록
    PaperSafariTable.tsx          배치 선택 + HUD
    layout/TableRound.tsx, layout/TableRail.tsx, layout/seats.ts
    motion/inferMoves.ts, motion/useCardMotion.ts, motion/ZoneAnchor.tsx, motion/GhostLayer.tsx
    RoundResultModal.tsx, GameOverPanel.tsx   새 연출
  room/WaitingRoom.tsx, room/MemberList.tsx   의자 배치
```

백엔드:
```
room/domain/PlayerCount.java, GameOccupancy.java, GameOccupancies.java
room/domain/Room.java              집계 메시지 추가
room/application/RoomService.java  gameOccupancies()
room/api/GameLobbyController.java, GameSummaryResponse.java
```

## 10. 테스트

프론트 (Vitest + Testing Library):
- `inferMoves`: 덱 뽑기(내 것/남의 것), 더미 뽑기, 교체, 버리기, 뒤집기, 엿보기, 새 라운드, 이전 상태 없음, ROUND_OVER 대량 공개 무시, 칸 특정 불가 시 대체 동작.
- `seats`: 상대 1~4명의 자리 배치, 시계방향 순서.
- `CardArt`/`CardFace`: 14종 모두 렌더링, 기존 aria-label 유지, 엿봄 배지, 클릭 가능 여부.
- `GameShelfPage`: 인원 표시, API 실패 시 `–`, 준비 중 상자 비활성, 클릭하면 `/games/paper-safari` 이동, 이미 방에 있으면 방으로 이동.
- `GameLobbyPage`: 기존 로비 기능(방 만들기, 코드 입장, 목록).
- `PaperSafariTable`: 넓은 화면은 `TableRound`, 좁은 화면은 `TableRail`(matchMedia 목).
- `sound`: 음소거 저장과 복원, `localStorage` 예외에서도 동작, `AudioContext` 없을 때 무해.
- 기존 63개 테스트는 새 구조에 맞게 고쳐 모두 유지한다. 테스트 setup에 `matchMedia` 목을 추가한다.

백엔드: 4.3절.

최종 확인:
- 백엔드 전체 테스트 통과, 프론트 전체 테스트와 `npm run build` 통과.
- `./start.sh`로 띄운 뒤 Playwright로 두 계정(localhost / 127.0.0.1)이 다음 흐름을 PC(1280px)와 모바일(390px) 크기에서 끝까지 진행하고 스크린샷을 남긴다: 선반 → 로비 → 방 → 시작 → 플레이 → 라운드 결과.
- `docker compose up -d --build --wait`로 배포 이미지도 확인한다.
